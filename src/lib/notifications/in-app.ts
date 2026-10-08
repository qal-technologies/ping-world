import type { SupabaseClient } from '@supabase/supabase-js';

export type InAppNotificationInput = {
  recipientId: string;
  resourceId: string;
  type: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
  icon?: string;
};

/** Queue/coalesce an app-wide notification. This function is server-only by
 * convention: pass the service-role Supabase client, never a browser client. */
export async function queueInAppNotification(admin: SupabaseClient, input: InAppNotificationInput) {
  if (!/^[0-9a-f-]{36}$/i.test(input.recipientId) || !/^[0-9a-f-]{36}$/i.test(input.resourceId)) {
    throw new Error('Notification recipient and resource must be UUIDs.');
  }
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(input.type) || input.title.length > 160 || input.body.length > 1000) {
    throw new Error('Invalid notification content.');
  }
  const action = input.action;
  if (action && (!action.href.startsWith('/') || action.href.startsWith('//') || action.href.length > 512 || action.label.length > 40)) {
    throw new Error('Notification action must be a same-app path.');
  }
  return admin.rpc('queue_in_app_notification', {
    recipient_uuid: input.recipientId,
    resource_uuid: input.resourceId,
    type_text: input.type,
    title_text: input.title,
    body_text: input.body,
    action_href: action?.href ?? null,
    action_label: action?.label ?? null,
    icon_text: input.icon?.slice(0, 40) ?? 'bell',
  });
}
