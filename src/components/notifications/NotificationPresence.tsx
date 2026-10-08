'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

/** Keeps one short-lived server-side presence lease so focused users receive
 * actionable in-app alerts instead of a duplicate browser push. */
export default function NotificationPresence() {
  const { isLoggedIn, user } = useAppContext();
  useEffect(() => {
    if (!isLoggedIn) return;
    let stopped = false;
    const report = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      const { data: { session } } = await supabase.auth.getSession();
      if (stopped || !session?.access_token) return;
      await fetch('/api/notifications/presence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
        body: JSON.stringify({ active: true, accessToken: session.access_token }), keepalive: true,
      }).catch(() => undefined);
    };
    void report();
    const timer = window.setInterval(() => void report(), 30_000);
    const wake = () => { if (document.visibilityState === 'visible') void report(); };
    window.addEventListener('focus', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      stopped = true; window.clearInterval(timer);
      window.removeEventListener('focus', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [isLoggedIn, user?.id]);
  return null;
}
