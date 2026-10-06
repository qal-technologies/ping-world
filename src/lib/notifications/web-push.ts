import { supabase } from '@/lib/supabase';

/** Shared browser notification helpers. Push delivery requires a registered subscription and VAPID sender on the server. */
export async function requestWebNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export async function registerNotificationWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js');
}

function decodeBase64Url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)).buffer as ArrayBuffer;
}

export async function subscribeToWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error('Push notifications are not configured by the site yet.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in to enable notifications.');
  const registration = await registerNotificationWorker();
  if (!registration?.pushManager) throw new Error('This browser does not support push subscriptions.');
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(publicKey),
  });
  const response = await fetch('/api/notifications/subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Could not save this device subscription.');
  }
  return subscription;
}

export async function unsubscribeFromWebPush() {
  const registration = await registerNotificationWorker();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    const response = await fetch('/api/notifications/subscription', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    if (!response.ok) throw new Error('Could not remove this device subscription from your account.');
  }
  await subscription.unsubscribe();
}

export async function showWebNotification(title: string, body: string, url = '/') {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return false;
  const safeUrl = url.startsWith('/') && !url.startsWith('//') ? url : '/';
  const registration = await registerNotificationWorker();
  if (registration) {
    await registration.showNotification(title.slice(0, 120), {
      body: body.slice(0, 500),
      icon: '/images/logo.png',
      badge: '/images/logo.png',
      data: { url: safeUrl },
    });
  } else {
    new Notification(title.slice(0, 120), { body: body.slice(0, 500) });
  }
  return true;
}
