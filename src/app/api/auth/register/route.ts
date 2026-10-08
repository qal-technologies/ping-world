import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { readJsonWithinLimit } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ipLimit = isRateLimited(ip, 'api:register', 5, 60 * 60_000);
  if (ipLimit.limited) return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((ipLimit.reset - Date.now()) / 1000))), 'Cache-Control': 'no-store' } });
  try {
    const body = await readJsonWithinLimit(request, 12 * 1024) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 80) : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !/^[a-z0-9_]{5,20}$/.test(username) ||
      password.length < 10 || password.length > 1024 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password) || !displayName) {
      return NextResponse.json({ error: 'Check the email, username, display name, and password requirements.' }, { status: 400 });
    }
    const emailLimit = isRateLimited(email, 'api:register-email', 3, 24 * 60 * 60_000);
    if (emailLimit.limited) return NextResponse.json({ error: 'Too many registration attempts for this email. Try again later.' }, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((emailLimit.reset - Date.now()) / 1000))), 'Cache-Control': 'no-store' } });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anonKey) throw new Error('Auth is not configured.');
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { username, display_name: displayName } } });
    if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ user: data.user, session: data.session }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    console.error('[api/auth/register] Registration failed.');
    return NextResponse.json({ error: 'Registration service is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
