'use client';

export type PermissionType =
  | 'notifications'
  | 'geolocation'
  | 'clipboard'
  | 'camera'
  | 'microphone';

export interface PermissionResult {
  granted: boolean;
  status: 'granted' | 'denied' | 'prompt' | 'unsupported';
  error?: string;
}

/**
 * Robust cross-browser Permission Handler API.
 * Safely checks and actively requests permissions with proper error boundaries.
 */
export const PermissionManager = {
  /**
   * Check current permission state without prompting the user.
   */
  async check(type: PermissionType): Promise<PermissionResult> {
    if (typeof window === 'undefined') {
      return { granted: false, status: 'unsupported' };
    }

    try {
      if (type === 'notifications') {
        if (!('Notification' in window)) {
          return { granted: false, status: 'unsupported' };
        }
        const perm = Notification.permission;
        return {
          granted: perm === 'granted',
          status: perm as 'granted' | 'denied' | 'prompt',
        };
      }

      if ('permissions' in navigator && navigator.permissions?.query) {
        const queryName =
          type === 'geolocation'
            ? ('geolocation' as PermissionName)
            : type === 'clipboard'
              ? ('clipboard-read' as unknown as PermissionName)
              : type === 'camera'
                ? ('camera' as unknown as PermissionName)
                : ('microphone' as unknown as PermissionName);

        try {
          const status = await navigator.permissions.query({ name: queryName });
          return {
            granted: status.state === 'granted',
            status: status.state as 'granted' | 'denied' | 'prompt',
          };
        } catch {
          // Fallback if queryName is not supported by the browser
        }
      }

      return { granted: false, status: 'prompt' };
    } catch (err: any) {
      return {
        granted: false,
        status: 'unsupported',
        error: err?.message || 'Permission check failed',
      };
    }
  },

  /**
   * Actively request permission from the user via native browser dialog.
   */
  async request(type: PermissionType): Promise<PermissionResult> {
    if (typeof window === 'undefined') {
      return { granted: false, status: 'unsupported' };
    }

    try {
      if (type === 'notifications') {
        if (!('Notification' in window)) {
          return {
            granted: false,
            status: 'unsupported',
            error: 'Notifications are not supported in this browser.',
          };
        }
        const permission = await Notification.requestPermission();
        return {
          granted: permission === 'granted',
          status: permission as 'granted' | 'denied' | 'prompt',
        };
      }

      if (type === 'geolocation') {
        if (!('geolocation' in navigator)) {
          return {
            granted: false,
            status: 'unsupported',
            error: 'Geolocation is not supported in this browser.',
          };
        }

        return new Promise<PermissionResult>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve({ granted: true, status: 'granted' }),
            (err) =>
              resolve({
                granted: false,
                status: err.code === 1 ? 'denied' : 'prompt',
                error: err.message,
              }),
            { timeout: 8000 },
          );
        });
      }

      if (type === 'clipboard') {
        if (!navigator.clipboard) {
          return {
            granted: false,
            status: 'unsupported',
            error: 'Clipboard API is not supported.',
          };
        }
        try {
          await navigator.clipboard.readText();
          return { granted: true, status: 'granted' };
        } catch (err: any) {
          return {
            granted: false,
            status: 'denied',
            error: err?.message || 'Clipboard access denied',
          };
        }
      }

      if (type === 'camera' || type === 'microphone') {
        if (!navigator.mediaDevices?.getUserMedia) {
          return {
            granted: false,
            status: 'unsupported',
            error: 'Media devices are not supported.',
          };
        }
        try {
          const constraints =
            type === 'camera' ? { video: true } : { audio: true };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          // Stop streams immediately after permission is granted
          stream.getTracks().forEach((track) => track.stop());
          return { granted: true, status: 'granted' };
        } catch (err: any) {
          return {
            granted: false,
            status: 'denied',
            error: err?.message || `${type} access denied`,
          };
        }
      }

      return { granted: false, status: 'unsupported' };
    } catch (err: any) {
      return {
        granted: false,
        status: 'denied',
        error: err?.message || 'Permission request failed',
      };
    }
  },
};
