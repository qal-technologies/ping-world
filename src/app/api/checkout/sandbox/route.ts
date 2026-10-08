import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { FLEXIBLE_FEATURES } from '@/lib/config/premium';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development' || process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Sandbox tier changes are available only in local development without live billing.' }, { status: 404 });
  }
  const limited = isRateLimited(getClientIp(request), 'api:sandbox-tier', 5, 60_000);
  if (limited.limited) return NextResponse.json({ error: 'Too many sandbox tier changes.' }, { status: 429 });
  const user = await getRequestUser(request);
  if (!user?.email_confirmed_at) return NextResponse.json({ error: 'A verified account is required.' }, { status: 401 });
  try {
    const body = await request.json() as { tier?: unknown; selectedFlexibleToolId?: unknown };
    const tier = body.tier === 'free' ? 'free' : String(body.tier || '');
    if (!['free', 'flexible', 'standard', 'pro'].includes(tier)) return NextResponse.json({ error: 'Invalid sandbox tier.' }, { status: 400 });
    const selectedTool = typeof body.selectedFlexibleToolId === 'string' ? body.selectedFlexibleToolId : 'all';
    if (tier === 'flexible' && selectedTool !== 'all' && !FLEXIBLE_FEATURES.some((tool) => tool.id === selectedTool)) {
      return NextResponse.json({ error: 'Choose a valid tool plan.' }, { status: 400 });
    }
    const expiry = tier === 'free' ? new Date().toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
    const purchasedTools = tier === 'free' ? [] : tier === 'flexible' ? (selectedTool === 'all' ? ['all'] : [selectedTool]) : ['all'];
    const admin = getSupabaseAdmin();
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(user.id);
    if (accountError || !account.user) throw accountError || new Error('Account not found.');
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...account.user.app_metadata, tier, tier_expires_at: expiry, purchased_tools: purchasedTools },
    });
    if (error) throw error;
    await admin.from('profiles').upsert({ id: user.id, tier, updated_at: new Date().toISOString() });
    return NextResponse.json({ success: true, tier, tierExpiresAt: expiry, purchasedTools }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.error('[api/checkout/sandbox] Tier update failed.');
    return NextResponse.json({ error: 'Could not update the sandbox plan.' }, { status: 503 });
  }
}
