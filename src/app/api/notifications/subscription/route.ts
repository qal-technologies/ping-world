import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

function validPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const endpoint = new URL(value);
    const host = endpoint.hostname.toLowerCase();
    const allowed = host === 'fcm.googleapis.com' || host === 'push.services.mozilla.com' ||
      host.endsWith('.push.services.mozilla.com') || host === 'notify.windows.com' ||
      host.endsWith('.notify.windows.com') || host === 'push.apple.com' ||
      host.endsWith('.push.apple.com');
    return endpoint.protocol === 'https:' && endpoint.port === '' && allowed;
  } catch {
    return false;
  }
}

function validKey(value: unknown, minimum: number, maximum: number) {
  return typeof value === 'string' && value.length >= minimum && value.length <= maximum && /^[A-Za-z0-9_-]+$/.test(value);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:push-subscribe', 20, 60_000).limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in to register this device.' }, { status: 401 });
  if (isRateLimited(user.id, 'api:push-subscribe-account', 10, 60_000).limited) {
    return NextResponse.json({ error: 'Subscription request limit reached.' }, { status: 429 });
  }

  try {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY_BASE64 || !process.env.VAPID_SUBJECT) {
      return NextResponse.json({ error: 'Push delivery has not been configured by the site yet.' }, { status: 503 });
    }
    const body = await readJsonWithinLimit(request, 8 * 1024) as Record<string, any>;
    const endpoint = body.endpoint;
    const keys = body.keys;
    if (!validPushEndpoint(endpoint) || !keys || !validKey(keys.p256dh, 80, 100) || !validKey(keys.auth, 16, 64)) {
      return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 });
    }
    const admin = getSupabaseAdmin();
    const { data: existing, error: existingError } = await admin.from('push_subscriptions')
      .select('owner_id').eq('endpoint', endpoint).maybeSingle();
    if (existingError) throw existingError;
    if (existing && existing.owner_id !== user.id) {
      return NextResponse.json({ error: 'This device subscription is already registered to another account. Remove it from that account first.' }, { status: 409 });
    }
    const { count, error: countError } = await admin.from('push_subscriptions')
      .select('id', { count: 'exact', head: true }).eq('owner_id', user.id);
    if (countError) throw countError;
    if (!existing && (count || 0) >= 10) {
      return NextResponse.json({ error: 'You can register up to ten devices.' }, { status: 429 });
    }
    const { error } = await admin.from('push_subscriptions').upsert({
      owner_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });
    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Subscription is too large.' }, { status: 413 });
    }
    console.error('[api/notifications/subscription] Save failed.');
    return NextResponse.json({ error: 'Could not register this device.' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:push-unsubscribe', 20, 60_000).limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Sign in to remove this device.' }, { status: 401 });
  try {
    const body = await readJsonWithinLimit(request, 4 * 1024) as Record<string, unknown>;
    const endpoint = body.endpoint;
    if (!validPushEndpoint(endpoint)) return NextResponse.json({ error: 'Invalid push endpoint.' }, { status: 400 });
    const { error } = await getSupabaseAdmin().from('push_subscriptions').delete()
      .eq('owner_id', user.id).eq('endpoint', endpoint);
    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    }
    console.error('[api/notifications/subscription] Delete failed.');
    return NextResponse.json({ error: 'Could not remove this device.' }, { status: 503 });
  }
}
