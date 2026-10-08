'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, BellRing, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { playInAppNotificationTone } from '@/lib/quiz/quiz-audio';

type Item = { id: string; title: string; body: string; totalCount: number; unreadCount: number; action: { label: string; href: string } | null };

export default function InAppNotificationToast() {
  const { isLoggedIn, user } = useAppContext();
  const userId = user?.id;
  const notificationPrefs = user?.user_metadata?.notification_preferences;
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const seen = useRef<Map<string, number> | null>(null);
  const position = useRef<'top-center' | 'bottom-center'>('top-center');
  const effects = useRef({ sound: true, haptics: true });

  useEffect(() => {
    if (!userId) return;
    const loadPosition = () => {
      const cloud = notificationPrefs || {};
      try {
        const prefs = JSON.parse(localStorage.getItem(`pw_settings_${userId}`) || '{}');
        position.current = (prefs.inAppPosition ?? cloud.inAppPosition) === 'bottom' ? 'bottom-center' : 'top-center';
        effects.current = {
          sound: (prefs.inAppSound ?? cloud.inAppSound) !== false,
          haptics: (prefs.inAppHaptics ?? cloud.inAppHaptics) !== false,
        };
      } catch {
        position.current = cloud.inAppPosition === 'bottom' ? 'bottom-center' : 'top-center';
        effects.current = { sound: cloud.inAppSound !== false, haptics: cloud.inAppHaptics !== false };
      }
    };
    loadPosition();
    window.addEventListener('pw_notification_preferences', loadPosition);
    return () => window.removeEventListener('pw_notification_preferences', loadPosition);
  }, [notificationPrefs, userId]);

  useEffect(() => {
    seen.current = null;
    if (!isLoggedIn) return;
    let stopped = false;
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || stopped) return;
      const response = await fetch('/api/notifications/in-app', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', credentials: 'omit' }).catch(() => null);
      if (!response?.ok || stopped) return;
      const data = await response.json().catch(() => ({}));
      const items = Array.isArray(data.notifications) ? data.notifications as Item[] : [];
      if (!seen.current) { seen.current = new Map(items.map((item) => [item.id, item.totalCount])); return; }
      const newItems = items.filter((item) => item.totalCount > (seen.current?.get(item.id) || 0) && item.unreadCount > 0);
      if (newItems.length) {
        if (effects.current.haptics && 'vibrate' in navigator) {
          try { navigator.vibrate([18, 32, 18]); } catch { /* vibration is optional */ }
        }
        if (effects.current.sound) playInAppNotificationTone();
      }
      for (const item of newItems.slice(0, 3)) {
        const previous = seen.current.get(item.id) || 0;
        seen.current.set(item.id, item.totalCount);
        if (item.totalCount <= previous || item.unreadCount <= 0) continue;
        const open = () => { if (item.action?.href) router.push(item.action.href); };
        const markRead = async () => {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession?.access_token) return;
          await fetch('/api/notifications/in-app', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentSession.access_token}` }, credentials: 'omit', body: JSON.stringify({ id: item.id, action: 'read' }) });
        };
        toast.custom((id) => (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: position.current === 'top-center' ? -20 : 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className='group relative w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-pw-primary/25 bg-pw-surface/75 p-4 text-pw-text shadow-[0_20px_70px_rgba(0,0,0,.48),0_0_28px_rgba(152,92,255,.13)] backdrop-blur-2xl'>
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(152,92,255,.16),transparent_55%),linear-gradient(130deg,rgba(255,255,255,.05),transparent_50%)]' />
            <div className='relative flex items-start gap-3'>
              <div className='grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-pw-primary/25 bg-pw-primary/15 text-pw-primary shadow-[0_0_22px_rgba(152,92,255,.2)]'><BellRing className='h-5 w-5' /></div>
              <div className='min-w-0 flex-1'>
                <div className='mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.2em] text-pw-primary'><span className='inline-block h-1 w-1 animate-pulse rounded-full bg-pw-cyan' />Pingwrld · Update</div>
                <p className='font-semibold leading-snug'>{item.title}</p>
                {item.body && <p className='mt-1 text-sm leading-relaxed text-pw-muted'>{item.body}</p>}
                <div className='mt-3 flex flex-wrap gap-2'>
                  {item.action && <button onClick={() => { toast.dismiss(id); open(); }} className='inline-flex items-center gap-1.5 rounded-xl bg-pw-primary px-3 py-2 text-xs font-bold text-white shadow-lg shadow-pw-primary/20 transition hover:brightness-110'>{item.action.label}<ArrowUpRight className='h-3.5 w-3.5' /></button>}
                  <button onClick={() => { void markRead(); toast.dismiss(id); }} className='inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-pw-text transition hover:bg-white/10'><Check className='h-3.5 w-3.5' />Read</button>
                  <button aria-label='Dismiss notification' onClick={() => toast.dismiss(id)} className='ml-auto grid h-8 w-8 place-items-center rounded-lg text-pw-muted transition hover:bg-white/10 hover:text-pw-text'><X className='h-4 w-4' /></button>
                </div>
              </div>
            </div>
          </motion.div>
        ), { id: `pw-notification-${item.id}-${item.totalCount}`, duration: 9000, position: position.current });
      }
      for (const item of items) seen.current.set(item.id, item.totalCount);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    const wake = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', wake);
    document.addEventListener('visibilitychange', wake);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener('focus', wake); document.removeEventListener('visibilitychange', wake); };
  }, [isLoggedIn, notificationPrefs, reduceMotion, router, userId]);
  return null;
}
