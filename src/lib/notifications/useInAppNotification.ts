'use client';

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type AppNotification = {
  resourceId?: string;
  type: string;
  title: string;
  body?: string;
  action?: { label: string; href: string };
  icon?: string;
};

/** Call from any client feature to create a durable, batched notification for
 * the signed-in user. The matching API resolves the recipient from the token. */
export function useInAppNotification() {
  return useCallback(async (notification: AppNotification) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in to create a notification.');
    const response = await fetch('/api/notifications/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      body: JSON.stringify({ ...notification, accessToken: session.access_token }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof result.error === 'string' ? result.error : 'Could not create notification.');
    }
    if (result.disabled === true) return null;
    if (typeof result.id !== 'string') throw new Error('Notification endpoint returned no ID.');
    window.dispatchEvent(new CustomEvent('pw_in_app_notification', {
      detail: { id: result.id, ...notification, totalCount: result.totalCount, unreadCount: result.unreadCount },
    }));
    return result.id as string;
  }, []);
}
