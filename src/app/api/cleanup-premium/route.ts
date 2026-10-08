import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { clearExpiredPremiumQuizData } from '@/lib/quiz/clear-expired-premium-data';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Runs twice daily. Auth app_metadata is authoritative; expired accounts are
 * downgraded first, then their Pro-only quiz settings and branding objects are
 * removed. Quiz/response content is preserved. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const now = Date.now();
  let page = 1;
  let scanned = 0;
  let downgraded = 0;
  let cleaned = 0;
  const failures: string[] = [];

  try {
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
      if (error) throw error;
      const users = data.users || [];
      scanned += users.length;
      const expired = users.filter((user) => {
        const metadata = user.app_metadata || {};
        const tier = String(metadata.tier || 'free');
        const expiry = typeof metadata.tier_expires_at === 'string' ? Date.parse(metadata.tier_expires_at) : Number.NaN;
        const legacyExpiredAt = typeof metadata.tier_expired_at === 'string' ? Date.parse(metadata.tier_expired_at) : Number.NaN;
        const effectiveExpiry = Number.isFinite(expiry) ? expiry : legacyExpiredAt;
        const cleanup = typeof metadata.premium_quiz_cleanup_at === 'string' ? Date.parse(metadata.premium_quiz_cleanup_at) : 0;
        return Number.isFinite(effectiveExpiry) && effectiveExpiry <= now && cleanup < effectiveExpiry && (tier !== 'free' || Number.isFinite(legacyExpiredAt));
      });

      for (let offset = 0; offset < expired.length; offset += 8) {
        const batch = expired.slice(offset, offset + 8);
        const results = await Promise.allSettled(batch.map(async (user) => {
          const metadata = user.app_metadata || {};
          const expiry = typeof metadata.tier_expires_at === 'string' ? metadata.tier_expires_at : String(metadata.tier_expired_at);
          if (String(metadata.tier || 'free') !== 'free') {
            const nextAppMetadata = { ...metadata, tier: 'free', purchased_tools: [], tier_expired_at: expiry };
            const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
              app_metadata: nextAppMetadata,
              user_metadata: { ...(user.user_metadata || {}), tier: 'free', purchased_tools: [], tier_expires_at: expiry },
            });
            if (updateError) throw updateError;
            const { error: profileError } = await admin.from('profiles').upsert({ id: user.id, tier: 'free', updated_at: new Date().toISOString() });
            if (profileError) throw profileError;
          }
          await clearExpiredPremiumQuizData(admin, user.id);
          return user.id;
        }));
        for (let index = 0; index < results.length; index++) {
          const result = results[index];
          if (result.status === 'fulfilled') {
            cleaned++;
            if (String(batch[index].app_metadata?.tier || 'free') !== 'free') downgraded++;
          } else {
            failures.push(`${batch[index].id}: ${result.reason instanceof Error ? result.reason.message : 'cleanup failed'}`);
          }
        }
      }
      if (users.length < 500) break;
      page++;
    }
    if (failures.length) {
      console.error('[cleanup-premium] Some expired accounts need retry:', failures.slice(0, 10));
      return NextResponse.json({ success: false, scanned, downgraded, cleaned, failed: failures.length }, { status: 503 });
    }
    return NextResponse.json({ success: true, scanned, downgraded, cleaned, checkedAt: new Date(now).toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[cleanup-premium] Sweep failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Premium account cleanup failed.', scanned, downgraded, cleaned }, { status: 503 });
  }
}
