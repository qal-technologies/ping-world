// jules edit: Server-side secure Firebase Custom Token generation from Supabase Auth session
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { readJsonWithinLimit } from '@/lib/api-auth';

function getFirebaseAdminAuth() {
  if (!getApps().length) {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!rawServiceAccount) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
    const serviceAccount = JSON.parse(rawServiceAccount);
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  }
  return getAuth();
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip, 'api:firebase-token', 10, 60_000).limited) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }
    const body = await readJsonWithinLimit(request, 16 * 1024) as { token?: unknown };
    const token = typeof body?.token === 'string' ? body.token : '';
    if (!token || token.length > 8192) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    // Validate the Supabase JWT token and retrieve the user object
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid Supabase session' }, { status: 401 });
    }
    if (isRateLimited(user.id, 'api:firebase-token-account', 10, 60_000).limited) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Sign Firebase Custom Token with the exact same Supabase UID
    const firebaseToken = await getFirebaseAdminAuth().createCustomToken(user.id);

    return NextResponse.json({ firebaseToken });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    }
    console.error('[firebase-token] Bridge authentication failed.');
    return NextResponse.json({ error: 'Authentication bridge unavailable.' }, { status: 503 });
  }
}
