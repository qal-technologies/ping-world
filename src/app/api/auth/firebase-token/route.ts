// jules edit: Server-side secure Firebase Custom Token generation from Supabase Auth session
import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { getRequestUser } from '@/lib/api-auth';

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
    const user = await getRequestUser(request);
    if (!user || !user.email_confirmed_at) {
      return NextResponse.json({ error: 'Invalid Supabase session' }, { status: 401 });
    }
    if (isRateLimited(user.id, 'api:firebase-token-account', 10, 60_000).limited) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    // Sign Firebase Custom Token with the exact same Supabase UID
    const firebaseToken = await getFirebaseAdminAuth().createCustomToken(user.id);

    return NextResponse.json({ firebaseToken });
  } catch (err: unknown) {
    console.error('[firebase-token] Bridge authentication failed.');
    return NextResponse.json({ error: 'Authentication bridge unavailable.' }, { status: 503 });
  }
}
