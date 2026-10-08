import 'server-only';

import {
  createCipheriv,
  createECDH,
  createPrivateKey,
  hkdfSync,
  randomBytes,
  sign,
} from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const b64url = (value: Buffer | string) => Buffer.from(value).toString('base64url');
const fromB64url = (value: string) => Buffer.from(value, 'base64url');

function encryptPushPayload(subscription: { p256dh: string; auth: string }, payload: string) {
  const uaPublic = fromB64url(subscription.p256dh);
  const authSecret = fromB64url(subscription.auth);
  if (uaPublic.length !== 65 || uaPublic[0] !== 4 || authSecret.length < 16 || authSecret.length > 64) {
    throw new Error('Invalid push encryption keys.');
  }

  const ecdh = createECDH('prime256v1');
  const serverPublic = ecdh.generateKeys();
  const sharedSecret = ecdh.computeSecret(uaPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, serverPublic]);
  const inputKey = Buffer.from(hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32));
  const salt = randomBytes(16);
  const cek = Buffer.from(hkdfSync('sha256', inputKey, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', inputKey, salt, Buffer.from('Content-Encoding: nonce\0'), 12));

  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const encrypted = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096);
  return Buffer.concat([salt, recordSize, Buffer.from([serverPublic.length]), serverPublic, encrypted]);
}

function createVapidToken(audience: string) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKeyBase64 = process.env.VAPID_PRIVATE_KEY_BASE64;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKeyBase64 || !subject || !/^(mailto:|https:\/\/)/i.test(subject)) {
    throw new Error('VAPID delivery details are not configured.');
  }

  const encodedHeader = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const encodedPayload = b64url(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  }));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = sign('sha256', Buffer.from(unsigned), {
    key: createPrivateKey({ key: Buffer.from(privateKeyBase64, 'base64'), format: 'der', type: 'pkcs8' }),
    dsaEncoding: 'ieee-p1363',
  });
  return { token: `${unsigned}.${b64url(signature)}`, publicKey };
}

function validateEndpoint(value: string) {
  const endpoint = new URL(value);
  const host = endpoint.hostname.toLowerCase();
  const allowed = host === 'fcm.googleapis.com' || host === 'push.services.mozilla.com' ||
    host.endsWith('.push.services.mozilla.com') || host === 'notify.windows.com' ||
    host.endsWith('.notify.windows.com') || host === 'push.apple.com' ||
    host.endsWith('.push.apple.com');
  if (endpoint.protocol !== 'https:' || endpoint.port || !allowed) throw new Error('Unsupported push service endpoint.');
  return endpoint;
}

export async function sendPushToUser(
  admin: SupabaseClient,
  userId: string,
  payload: { title: string; body: string; url: string; tag: string },
) : Promise<{ attempted: number; delivered: number }> {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY_BASE64 || !process.env.VAPID_SUBJECT) return { attempted: 0, delivered: 0 };
  const { data: subscriptions, error } = await admin.from('push_subscriptions')
    .select('endpoint,p256dh,auth').eq('owner_id', userId).limit(5);
  if (error) {
    console.warn('[push] Subscription lookup failed:', error.code || 'unknown');
    return { attempted: 0, delivered: 0 };
  }

  const results = await Promise.all((subscriptions || []).map(async (subscription: { endpoint: string; p256dh: string; auth: string }) => {
    try {
      const endpoint = validateEndpoint(subscription.endpoint);
      const vapid = createVapidToken(endpoint.origin);
      const encrypted = encryptPushPayload(subscription, JSON.stringify(payload));
      const body = new ArrayBuffer(encrypted.byteLength);
      new Uint8Array(body).set(encrypted);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `vapid t=${vapid.token}, k=${vapid.publicKey}`,
          TTL: '60',
          Urgency: 'normal',
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
        },
        body,
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status === 404 || response.status === 410) {
        await admin.from('push_subscriptions').delete().eq('owner_id', userId).eq('endpoint', subscription.endpoint);
      } else if (!response.ok) {
        console.warn('[push] Delivery was rejected:', response.status);
      } else {
        return true;
      }
    } catch (pushError) {
      console.warn('[push] Delivery failed for one device:', pushError instanceof Error ? pushError.message : 'unknown');
    }
    return false;
  }));
  return { attempted: results.length, delivered: results.filter(Boolean).length };
}

export async function isNotificationRecipientActive(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin.from('notification_presence').select('active_until')
    .eq('recipient_id', userId).gt('active_until', new Date().toISOString()).maybeSingle();
  if (error) {
    // A missing optional presence table must never block durable notification delivery.
    console.warn('[push] Presence lookup failed; falling back to push delivery:', error.code || 'unknown');
    return false;
  }
  return Boolean(data);
}
