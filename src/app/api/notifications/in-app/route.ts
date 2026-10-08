import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, getRequestUserFromToken, readJsonWithinLimit } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';
async function listNotifications(request: NextRequest, accessToken?: string) {
  if (isRateLimited(getClientIp(request), 'api:in-app-notifications', 120, 60_000).limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const user = accessToken ? await getRequestUserFromToken(accessToken) : await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (isRateLimited(user.id, 'api:in-app-notifications:user', 120, 60_000).limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  try {
    const admin = getSupabaseAdmin();
    const { data: rows, error } = await admin.from('notification_batches')
      .select('id,resource_id,notification_type,total_count,read_count,last_event_at,payload,done_at')
      .eq('recipient_id', user.id).order('last_event_at', { ascending: false }).limit(50);
    if (error) throw error;
    return NextResponse.json({ notifications: (rows || []).map((row) => ({
      id: row.id,
      resourceId: row.resource_id,
      type: row.notification_type,
      totalCount: row.total_count,
      unreadCount: Math.max(0, Number(row.total_count) - Number(row.read_count || 0)),
      updatedAt: row.last_event_at,
      title: typeof row.payload?.title === 'string' ? row.payload.title : 'Pingwrld update',
      body: typeof row.payload?.body === 'string' ? row.payload.body : '',
      action: sanitizeAction(row.payload?.action),
      icon: typeof row.payload?.icon === 'string' ? row.payload.icon : 'bell',
      done: Boolean(row.done_at),
    })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[api/notifications/in-app] Load failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Could not load notifications.' }, { status: 503 });
  }
}

// The access token is sent in a bounded JSON body instead of an HTTP header.
// Some local reverse proxies reject large Supabase JWT headers with 431.
export async function POST(request: NextRequest) {
  try {
    const body = await readJsonWithinLimit(request, 8 * 1024) as { accessToken?: unknown };
    const token = typeof body.accessToken === 'string' ? body.accessToken : '';
    if (!token || token.length > 16 * 1024) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    return listNotifications(request, token);
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  return listNotifications(request);
}

export async function PATCH(request: NextRequest) {
  let body: { id?: unknown; action?: unknown; accessToken?: unknown };
  try { body = await readJsonWithinLimit(request, 12 * 1024) as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const token = typeof body.accessToken === 'string' ? body.accessToken : '';
  const user = token ? await getRequestUserFromToken(token) : await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const id = typeof body.id === 'string' ? body.id : '';
    const action = body.action === 'done' ? 'done' : 'read';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });
    const admin = getSupabaseAdmin();
    const { data: row, error: readError } = await admin.from('notification_batches')
      .select('id,total_count,read_count,done_at').eq('id', id).eq('recipient_id', user.id).maybeSingle();
    if (readError || !row) return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    const update = action === 'done'
      ? { done_at: new Date().toISOString(), read_count: row.total_count }
      : { read_count: row.total_count };
    const { error } = await admin.from('notification_batches').update(update).eq('id', id).eq('recipient_id', user.id);
    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[api/notifications/in-app] Mark read failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Could not update notification.' }, { status: 503 });
  }
}

function sanitizeAction(value: unknown): { label: string; href: string } | null {
  if (!value || typeof value !== 'object') return null;
  const action = value as { label?: unknown; href?: unknown };
  if (typeof action.href !== 'string' || !action.href.startsWith('/') || action.href.startsWith('//')) return null;
  try {
    const parsed = new URL(action.href, 'https://pingwrld.invalid');
    if (parsed.origin !== 'https://pingwrld.invalid') return null;
    return {
      label: typeof action.label === 'string' ? action.label.slice(0, 40) : 'Open',
      href: `${parsed.pathname}${parsed.search}${parsed.hash}`,
    };
  } catch { return null; }
}
