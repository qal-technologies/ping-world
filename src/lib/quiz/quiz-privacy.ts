import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Resolve privacy against server-managed billing metadata. Expired/non-Pro
 * private assessments are atomically made public and stripped of access data. */
export async function resolveQuizPrivacySettings(
  admin: SupabaseClient,
  quiz: { id: string; user_id: string | null },
  source: unknown,
): Promise<Record<string, unknown>> {
  const settings = source && typeof source === 'object' && !Array.isArray(source)
    ? { ...(source as Record<string, unknown>) }
    : {};
  if (settings.isPrivate !== true) return settings;

  let activePro = false;
  if (quiz.user_id) {
    const { data, error } = await admin.auth.admin.getUserById(quiz.user_id);
    if (error) throw new Error('Could not verify assessment owner tier.');
    const metadata = data.user?.app_metadata || {};
    const expiry = typeof metadata.tier_expires_at === 'string' ? Date.parse(metadata.tier_expires_at) : Number.NaN;
    activePro = metadata.tier === 'pro' && Number.isFinite(expiry) && expiry > Date.now();
  }
  if (activePro) return settings;

  delete settings.privateKey;
  delete settings.privateKeyHash;
  delete settings.allowedParticipantUsernames;
  settings.isPrivate = false;
  let update = admin.from('quizzes').update({ settings }).eq('id', quiz.id);
  if (quiz.user_id) update = update.eq('user_id', quiz.user_id);
  const { error } = await update;
  if (error) throw new Error('Could not safely update the expired private assessment.');
  return settings;
}
