import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { readJsonWithinLimit } from '@/lib/api-auth';

const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return response({ error: 'Sign in to check username change eligibility.' }, 401);
  try {
    const { data, error } = await getSupabaseAdmin().from('profiles').select('username_updated_at,updated_at').eq('id', user.id).maybeSingle();
    if (error) throw error;
    const lastChangedAt = data?.username_updated_at || data?.updated_at || null;
    const eligibleAt = lastChangedAt ? new Date(new Date(lastChangedAt).getTime() + COOLDOWN_MS).toISOString() : new Date(Date.now() + COOLDOWN_MS).toISOString();
    return response({ eligibleAt, allowed: Date.now() >= Date.parse(eligibleAt) });
  } catch {
    return response({ error: 'Username change eligibility is temporarily unavailable.' }, 503);
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:username-change', 5, 60 * 60_000).limited) return response({ error: 'Too many username change attempts.' }, 429);
  const user = await getRequestUser(request);
  if (!user) return response({ error: 'Sign in to change your username.' }, 401);
  if (isRateLimited(user.id, 'api:username-change-account', 2, 60 * 24 * 60 * 60_000).limited) return response({ error: 'Username changes are limited to once every 60 days.' }, 429);
  try {
    const body = await readJsonWithinLimit(request, 4 * 1024) as { username?: unknown };
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    if (!/^[a-z0-9_]{5,20}$/.test(username)) return response({ error: 'Use 5–20 letters, numbers, or underscores.' }, 400);
    const admin = getSupabaseAdmin();
    const { data: existing, error: checkError } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (checkError) throw checkError;
    if (existing && existing.id !== user.id) return response({ error: 'Username is already taken.' }, 409);
    const { data: changed, error: changeError } = await admin.rpc('change_profile_username', { user_uuid: user.id, username_text: username });
    if (changeError) {
      if (changeError.message?.includes('COOLDOWN')) return response({ error: 'Username changes are limited to once every 60 days.' }, 429);
      if (changeError.code === '23505') return response({ error: 'Username is already taken.' }, 409);
      throw changeError;
    }
    const { data: account, error: readUserError } = await admin.auth.admin.getUserById(user.id);
    if (readUserError || !account.user) throw readUserError || new Error('Account unavailable.');
    const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, { user_metadata: { ...account.user.user_metadata, username } });
    if (metadataError) throw metadataError;
    return response({ success: true, username, eligibleAt: changed });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return response({ error: 'Request is too large.' }, 413);
    console.error('[api/auth/change-username] Update failed:', error instanceof Error ? error.message : 'unknown');
    return response({ error: 'Could not update username. Ensure the username cooldown SQL has been applied.' }, 503);
  }
}
