import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Read the authoritative Pro tier from server-managed auth metadata. */
export async function hasActiveQuizProTier(admin: SupabaseClient, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw new Error('Could not verify assessment owner tier.');
  const metadata = data.user?.app_metadata || {};
  const expiry = typeof metadata.tier_expires_at === 'string' ? Date.parse(metadata.tier_expires_at) : Number.NaN;
  return metadata.tier === 'pro' && Number.isFinite(expiry) && expiry > Date.now();
}

/** Sanitize expired Pro settings at read time. The twice-daily cron removes
 * persisted data and media; public quiz requests never wait for that sweep. */
export async function resolveQuizPrivacySettings(
  admin: SupabaseClient,
  quiz: { id: string; user_id: string | null },
  source: unknown,
  activeProOverride?: boolean,
): Promise<Record<string, unknown>> {
  const settings = source && typeof source === 'object' && !Array.isArray(source)
    ? { ...(source as Record<string, unknown>) }
    : {};
  const activePro = activeProOverride ?? await hasActiveQuizProTier(admin, quiz.user_id);
  if (!activePro) {
    delete settings.branding;
    delete settings.customUrl;
    delete settings.custom_id;
    delete settings.fromPremium;
    delete settings.privateKey;
    delete settings.privateKeyHash;
    delete settings.allowedParticipantUsernames;
    settings.isPrivate = false;
  } else if (settings.isPrivate !== true) {
    delete settings.privateKey;
    delete settings.privateKeyHash;
    delete settings.allowedParticipantUsernames;
  }
  return settings;
}
