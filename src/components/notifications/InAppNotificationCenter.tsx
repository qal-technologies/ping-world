'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  CircleCheck,
  ClipboardList,
  FileText,
  LoaderCircle,
  MessageSquare,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { AnimatePresence, motion } from 'framer-motion';

type NotificationAction = { label: string; href: string } | null;
type InAppNotification = {
  id: string;
  resourceId: string;
  type: string;
  title: string;
  body: string;
  action: NotificationAction;
  icon: string;
  totalCount: number;
  unreadCount: number;
  updatedAt: string;
  done: boolean;
};

export default function InAppNotificationCenter() {
  const { isLoggedIn, user } = useAppContext();
  const userId = user?.id;
  const router = useRouter();
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [preferencesVersion, setPreferencesVersion] = useState(0);
  const loadedUserId = useRef<string | null>(null);
  void preferencesVersion;
  const position: 'top' | 'bottom' = (() => {
    const cloudPosition =
      user?.user_metadata?.notification_preferences?.inAppPosition;
    if (typeof window === 'undefined' || !userId)
      return cloudPosition === 'bottom' ? 'bottom' : 'top';
    try {
      const localPosition = JSON.parse(
        localStorage.getItem(`pw_settings_${userId}`) || '{}',
      ).inAppPosition;
      return (cloudPosition ?? localPosition) === 'bottom' ? 'bottom' : 'top';
    } catch {
      return cloudPosition === 'bottom' ? 'bottom' : 'top';
    }
  })();
  const unreadCount = useMemo(
    () => items.reduce((sum, item) => sum + item.unreadCount, 0),
    [items],
  );

  const refresh = useCallback(
    async (quiet = false) => {
      if (!isLoggedIn || !userId) {
        loadedUserId.current = null;
        setItems([]);
        return;
      }
      if (loadedUserId.current !== userId) {
        loadedUserId.current = userId;
        setItems([]);
      }
      if (!quiet) setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch('/api/notifications/in-app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: session.access_token }),
          cache: 'no-store',
          credentials: 'omit',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(payload.error || 'Could not load notifications.');
        setItems(
          Array.isArray(payload.notifications) ? payload.notifications : [],
        );
      } catch (error) {
        if (!quiet)
          toast.error(
            error instanceof Error ?
              error.message
            : 'Could not load notifications.',
          );
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [isLoggedIn, userId],
  );

  useEffect(() => {
    const refreshPreferences = () =>
      setPreferencesVersion((current) => current + 1);
    window.addEventListener('pw_notification_preferences', refreshPreferences);
    return () =>
      window.removeEventListener(
        'pw_notification_preferences',
        refreshPreferences,
      );
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void refresh(true);
    }, 0);
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') void refresh(true);
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh(true);
    }, 30_000);
    window.addEventListener('pw_assessment_notification', refreshOnFocus);
    window.addEventListener('pw_notification', refreshOnFocus);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener('pw_assessment_notification', refreshOnFocus);
      window.removeEventListener('pw_notification', refreshOnFocus);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [refresh]);

  const update = async (item: InAppNotification, action: 'read' | 'done') => {
    if (markingId) return;
    setMarkingId(item.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token)
        throw new Error('Sign in to update notifications.');
      const response = await fetch('/api/notifications/in-app', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          id: item.id,
          action,
          accessToken: session.access_token,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || 'Could not update notification.');
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ?
            { ...entry, unreadCount: 0, done: action === 'done' || entry.done }
          : entry,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ?
          error.message
        : 'Could not update notification.',
      );
    } finally {
      setMarkingId(null);
    }
  };

  const openAction = (item: InAppNotification) => {
    if (item.unreadCount > 0) void update(item, 'read');
    setOpen(false);
    if (item.action?.href) router.push(item.action.href);
  };

  const NotificationIcon = ({ name }: { name: string }) => {
    const Icon =
      name === 'assessment' ? ClipboardList
      : name === 'message' ? MessageSquare
      : name === 'file' ? FileText
      : Bell;
    return <Icon className='h-4 w-4' />;
  };

  if (!isLoggedIn) return null;
  return (
    <AnimatePresence>
      <div className='relative w-full'>
        <button
          type='button'
          onClick={() => {
            setOpen((value) => !value);
            if (!open) void refresh();
          }}
          aria-label={
            unreadCount ?
              `${unreadCount} unread notifications`
            : 'Notifications'
          }
          aria-expanded={open}
          className='relative flex h-9 w-9 items-center justify-center rounded-xl text-pw-muted transition hover:bg-white/10 hover:text-pw-text'>
          <Bell className='h-5 w-5' />
          {unreadCount > 0 && (
            <span className='absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-pw-danger px-1 text-[9px] font-bold text-white'>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        {open && (
          <>
            <button
              aria-label='Close notifications'
              className='fixed inset-0 z-[70] cursor-default'
              onClick={() => setOpen(false)}
            />
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'z-[71] w-[min(92vw,400px)] fixed top-20 right-4 h-fit max-h-[80vh] overflow-hidden rounded-2xl border border-white/10 bg-pw-surface/70 shadow-2xl shadow-pw-primary/10 bkblur backdrop-blur-2xl p-0',
              )}>
              <header className='flex items-center justify-between border-b bg-pw-primary/5 border-white/10 p-2 px-3'>
                <div>
                  <h2 className='font-bold mt-2'>Notifications</h2>
                  <p className='text-[10px] text-pw-muted'>
                    Updates from across Pingwrld
                  </p>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 rounded-full'
                  onClick={() => setOpen(false)}
                  aria-label='Close'>
                  <X className='h-4 w-4' />
                </Button>
              </header>
              <div className='max-h-[min(65vh,520px)] overflow-y-auto p-2 gap-1'>
                {loading ?
                  <div className='flex items-center justify-center gap-4 p-8 text-sm text-pw-muted'>
                    <LoaderCircle className='h-4 w-4 animate-spin' />
                    Loading
                  </div>
                : items.length ?
                  items.map((item) => (
                    <article
                      key={item.id}
                      className={cn(
                        'flex gap-2 rounded-xl p-2 transition hover:bg-white/5',
                        item.unreadCount > 0 && 'bg-pw-primary/[0.08]',
                      )}>
                      <div className='mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pw-primary/10 text-pw-primary'>
                        <NotificationIcon name={item.icon} />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-start justify-between gap-2 flex-wrap'>
                          <p className='text-sm font-semibold truncate max-w-[80%] flex gap-1 items-center'>
                            {item.title}

                            {item.totalCount > 1 && (
                              <span className='mt-1 text-[10px] text-pw-muted flex gap-1'>
                                <span className='mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pw-danger' />
                                {item.totalCount}
                              </span>
                            )}
                          </p>
                          {item.updatedAt && (
                            <span className='text-[10px] text-pw-muted/70 uppercase'>
                              {new Date(item.updatedAt).toLocaleTimeString(
                                'en-NG',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                },
                              )}
                            </span>
                          )}
                        </div>
                        {item.body && (
                          <p className='whitespace-pre-wrap break-words text-xs text-pw-muted'>
                            {item.body}
                          </p>
                        )}

                        {item.updatedAt && (
                          <p className='mt-2 text-[10px] text-pw-muted/70'>
                            {new Date(item.updatedAt).toDateString()}
                          </p>
                        )}

                        <div className='flex flex-wrap gap-x-2 gap-y-1'>
                          {item.action && (
                            <button
                              className='text-[10px] font-bold text-pw-primary hover:underline hover:text-pw-cyan'
                              onClick={() => openAction(item)}>
                              {item.action.label}
                            </button>
                          )}
                          {item.unreadCount > 0 && !item.done && (
                            <button
                              disabled={markingId === item.id}
                              className='inline-flex items-center gap-1 text-[10px] text-pw-muted hover:text-pw-text disabled:opacity-50'
                              onClick={() => void update(item, 'read')}>
                              {markingId === item.id ?
                                <LoaderCircle className='h-3 w-3 animate-spin' />
                              : <CheckCheck className='h-3 w-3' />}
                              Mark read
                            </button>
                          )}
                          {!item.done && (
                            <button
                              disabled={markingId === item.id}
                              className='inline-flex items-center gap-1 text-[10px] text-pw-muted hover:text-pw-text disabled:opacity-50'
                              onClick={() => void update(item, 'done')}>
                              {markingId === item.id ?
                                <LoaderCircle className='h-3 w-3 animate-spin' />
                              : <CircleCheck className='h-3 w-3' />}
                              Done
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))
                : <div className='p-8 text-center text-sm text-pw-muted'>
                    You’re all caught up.
                  </div>
                }
              </div>
            </motion.section>
          </>
        )}
      </div>
    </AnimatePresence>
  );
}
