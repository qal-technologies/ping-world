import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendThemedEmail } from '@/lib/email/resend';
import { isRateLimited } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || !user.email || !user.email_confirmed_at) return NextResponse.json({ ok: false }, { status: 401 });
  if (isRateLimited(user.id, 'api:welcome-email', 2, 24 * 60 * 60_000).limited) return NextResponse.json({ ok: true });
  const admin = getSupabaseAdmin();
  const key = `welcome:${user.id}`;
  const { error: claimError } = await admin.from('transactional_email_events').insert({ owner_id: user.id, event_key: key, email_type: 'welcome', status: 'pending' });
  if (claimError?.code === '23505') return NextResponse.json({ ok: true });
  if (claimError) return NextResponse.json({ error: 'Email could not be queued.' }, { status: 503 });
  try {
    await sendThemedEmail(user.email, 'Welcome to Ping World', 'Welcome to Ping World', 'Your account is ready. Explore your workspace, create an assessment, or open one of the creative tools whenever you are ready.', key);
    await admin.from('transactional_email_events').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('event_key', key);
    return NextResponse.json({ ok: true });
  } catch {
    await admin.from('transactional_email_events').delete().eq('event_key', key).eq('status', 'pending');
    return NextResponse.json({ error: 'Welcome email delivery is unavailable.' }, { status: 503 });
  }
}
