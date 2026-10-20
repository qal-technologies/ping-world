import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function readQuizTierEntitlements(admin: SupabaseClient, userId: string | null) {
  if (!userId) return { quiz: false, pro: false };
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw new Error('Could not verify assessment owner tier.');
  const metadata = data.user?.app_metadata || {};
  const expiry = typeof metadata.tier_expires_at === 'string' ? Date.parse(metadata.tier_expires_at) : Number.NaN;
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return { quiz: false, pro: false };
  if (metadata.tier === 'pro') return { quiz: true, pro: true };
  if (metadata.tier === 'standard') return { quiz: true, pro: false };
  if (metadata.tier !== 'flexible' || !Array.isArray(metadata.purchased_tools)) return { quiz: false, pro: false };
  // Flexible subscriptions must name the assessment tool explicitly. Never
  // accept a broad `all` entitlement from a flexible-plan metadata value.
  return { quiz: metadata.purchased_tools.some((tool: unknown) => ['quizzable', 'quiz', 'quiz-builder'].includes(String(tool).toLowerCase())), pro: false };
}

/** Read the authoritative quiz entitlement from server-managed metadata. */
export async function hasActiveQuizEntitlement(admin: SupabaseClient, userId: string | null): Promise<boolean> {
  return (await readQuizTierEntitlements(admin, userId)).quiz;
}

/** Remove expired branding immediately at read time; the daily cron removes
 * its stored media. Other assessment settings stay intact. */
export async function resolveQuizPrivacySettings(
  admin: SupabaseClient,
  quiz: { id: string; user_id: string | null },
  source: unknown,
  entitlementOverride?: { quiz: boolean; pro: boolean },
): Promise<Record<string, unknown>> {
  const settings = source && typeof source === 'object' && !Array.isArray(source)
    ? { ...(source as Record<string, unknown>) }
    : {};
  const entitlements = entitlementOverride ?? await readQuizTierEntitlements(admin, quiz.user_id);
  const activeQuiz = entitlements.quiz;
  if (!activeQuiz) {
    delete settings.branding;
    delete settings.allowPass;
    settings.fromPremium = false;
  } else {
    settings.fromPremium = true;
  }
  if (!entitlements.pro) {
    for (const key of ['customUrl', 'isCustom', 'customDisclaimer', 'hidePingWorldDisclaimer', 'privateKey', 'privateKeyHash', 'allowedParticipantUsernames']) delete settings[key];
    settings.isPrivate = false;
  }
  if (settings.isPrivate !== true) {
    delete settings.privateKey;
    delete settings.privateKeyHash;
    delete settings.allowedParticipantUsernames;
  }
  return settings;
}
