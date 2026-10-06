import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:username-availability', 20, 60_000).limited) {
    return NextResponse.json({ error: 'Too many checks. Try again shortly.' }, { status: 429 });
  }
  const username = (request.nextUrl.searchParams.get('username') || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{5,20}$/.test(username)) {
    return NextResponse.json({ available: false, error: 'Use 5–20 letters, numbers, or underscores.' }, { status: 400 });
  }
  try {
    const { data, error } = await getSupabaseAdmin().from('profiles').select('id').eq('username', username).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ available: !data?.id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Username availability could not be checked.' }, { status: 503 });
  }
}
