import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { readJsonWithinLimit } from '@/lib/api-auth';

const denied = () =>
  NextResponse.json(
    { error: 'Invalid username/email or password.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:login', 10, 15 * 60_000).limited) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Wait 15 minutes and try again.' },
      { status: 429, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  try {
    const body = (await readJsonWithinLimit(request, 8 * 1024)) as {
      identifier?: unknown;
      password?: unknown;
    };
    const identifier =
      typeof body.identifier === 'string' ? body.identifier.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (
      !identifier ||
      identifier.length > 254 ||
      !password ||
      password.length > 1024
    )
      return denied();
    const key = identifier.toLowerCase();
    if (isRateLimited(key, 'api:login-identifier', 8, 15 * 60_000).limited) {
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Wait 15 minutes and try again.' },
        { status: 429, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    let email = key;
    if (!key.includes('@')) {
      if (!/^[a-z0-9_]{5,20}$/.test(key)) return denied();
      const admin = getSupabaseAdmin();
      const { data: profile, error } = await admin
        .from('profiles')
        .select('id')
        .eq('username', key)
        .maybeSingle();
      if (error || !profile?.id) return denied();
      const { data: userData, error: userError } =
        await admin.auth.admin.getUserById(profile.id);
      if (userError || !userData.user?.email) return denied();
      email = userData.user.email;
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anonKey) throw new Error('Auth is not configured.');
    const authClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) return denied();
    return NextResponse.json(
      { session: data.session },
      { headers: { 'Cache-Control': 'no-store, private', Pragma: 'no-cache' } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE')
      return NextResponse.json(
        { error: 'Request is too large.' },
        { status: 413 },
      );
    console.error('[api/auth/login] Login service unavailable.');
    return NextResponse.json(
      { error: 'Sign-in service is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
