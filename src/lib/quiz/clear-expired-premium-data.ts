import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { PREMIUM_TIERS, resolveTier, type PremiumTier } from '@/lib/config/premium';

const QUIZ_TOOL_IDS = new Set(['quizzable', 'quiz', 'quiz-builder']);

function hasQuizEntitlement(tier: PremiumTier, purchasedTools: unknown): boolean {
  if (tier === 'pro' || tier === 'standard') return true;
  return tier === 'flexible' && Array.isArray(purchasedTools) && purchasedTools.some((tool) => QUIZ_TOOL_IDS.has(String(tool).toLowerCase()));
}

function expiryCap(createdAt: unknown, maxDays: number): string | null {
  const created = typeof createdAt === 'string' ? Date.parse(createdAt) : Number(createdAt);
  if (!Number.isFinite(created) || created <= 0) return null;
  const cap = new Date(created);
  cap.setDate(cap.getDate() + maxDays);
  return cap.toISOString();
}

/** Apply the saved assessment restrictions for the owner's confirmed tier.
 * Questions and submitted responses remain intact; tier-gated access controls,
 * visual assets, upload limits, and excessive assessment lifetimes are cleaned. */
export async function clearExpiredPremiumQuizData(
  admin: SupabaseClient,
  userId: string,
  targetTierInput: unknown = 'free',
  purchasedTools: unknown = [],
) {
  const targetTier = resolveTier(targetTierInput);
  const canUseQuizFeatures = hasQuizEntitlement(targetTier, purchasedTools);
  const canUseProFeatures = targetTier === 'pro';
  const maxFileSizeMb = targetTier === 'pro' ? 50 : canUseQuizFeatures ? 15 : 5;
  const maxExpiryDays = PREMIUM_TIERS[canUseQuizFeatures ? targetTier : 'free'].maxExpiryDays;
  let cleanedCount = 0;
  for (let offset = 0; ; offset += 500) {
    const { data: quizzes, error } = await admin.from('quizzes')
      .select('id,settings,questions,created_at,expires_at,custom_id')
      .eq('user_id', userId).order('created_at', { ascending: true }).range(offset, offset + 499);
    if (error) throw error;

    for (const quiz of quizzes || []) {
      cleanedCount += 1;
    const settings = quiz.settings && typeof quiz.settings === 'object' && !Array.isArray(quiz.settings) ? { ...quiz.settings } : {};
    let changed = false;
    const removeSetting = (key: string) => {
      if (key in settings) { delete settings[key]; changed = true; }
    };
    if (!canUseQuizFeatures) {
      removeSetting('branding');
      removeSetting('allowPass');
      settings.fromPremium = false;
      changed = true;
    } else {
      if (settings.fromPremium !== true) { settings.fromPremium = true; changed = true; }
    }
    if (!canUseProFeatures) {
      for (const key of ['customUrl', 'isCustom', 'isPrivate', 'privateKey', 'privateKeyHash', 'allowedParticipants', 'allowedParticipantUsernames', 'customDisclaimer', 'hidePingWorldDisclaimer']) removeSetting(key);
      if (settings.isPrivate !== false) { settings.isPrivate = false; changed = true; }
    }

    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    let questionsChanged = false;
    const normalizedQuestions = questions.map((source: unknown) => {
      if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
      const question = { ...(source as Record<string, unknown>) };
      if (Number(question.maxFileSize) > maxFileSizeMb || !Number.isFinite(Number(question.maxFileSize))) {
        question.maxFileSize = maxFileSizeMb;
        questionsChanged = true;
      }
      if (!canUseQuizFeatures && question.allowPass) {
        delete question.allowPass;
        questionsChanged = true;
      }
      if (!canUseQuizFeatures && typeof question.allowedTypes === 'string') {
        const allowed = question.allowedTypes.split(',').map((type) => type.trim()).filter((type) => type && type !== '.' && !type.toLowerCase().endsWith('.zip') && !type.toLowerCase().startsWith('video/') && !type.toLowerCase().startsWith('audio/'));
        const safeTypes = allowed.length ? allowed.join(',') : 'image/*,.pdf,.doc,.docx,.txt,.json,application/json';
        if (safeTypes !== question.allowedTypes) { question.allowedTypes = safeTypes; questionsChanged = true; }
      }
      return question;
    });

    const expiresAt = expiryCap(quiz.created_at, maxExpiryDays);
    const savedExpiry = typeof quiz.expires_at === 'string' ? Date.parse(quiz.expires_at) : Number.NaN;
    const cappedExpiry = expiresAt && (!Number.isFinite(savedExpiry) || savedExpiry > Date.parse(expiresAt)) ? expiresAt : quiz.expires_at;
    const updates: Record<string, unknown> = {};
    if (changed) updates.settings = settings;
    if (questionsChanged) updates.questions = normalizedQuestions;
    if (cappedExpiry !== quiz.expires_at) updates.expires_at = cappedExpiry;
    if (!canUseProFeatures && quiz.custom_id) updates.custom_id = null;
    if (Object.keys(updates).length) {
      updates.updated_at = new Date().toISOString();
      const { error: updateError } = await admin.from('quizzes').update(updates).eq('id', quiz.id).eq('user_id', userId);
      if (updateError) throw updateError;
    }

      if (!canUseQuizFeatures) {
        const base = `${userId}/${String(quiz.id).replace(/[^a-zA-Z0-9_-]/g, '')}/branding`;
        const { data: files, error: listError } = await admin.storage.from('quiz-media').list(base, { limit: 1000 });
        if (listError) throw listError;
        const paths = (files || []).filter((file) => file.name && file.id).map((file) => `${base}/${file.name}`);
        if (paths.length) {
          const { error: removeError } = await admin.storage.from('quiz-media').remove(paths);
          if (removeError) throw removeError;
        }
      }
    }
    if ((quizzes || []).length < 500) break;
  }

  const { data: account, error: accountError } = await admin.auth.admin.getUserById(userId);
  if (accountError) throw accountError;
  if (account.user) {
    const { error: metadataError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...account.user.app_metadata, premium_quiz_cleanup_at: new Date().toISOString() },
    });
    if (metadataError) throw metadataError;
  }
  return { quizzes: cleanedCount, tier: targetTier };
}
