'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ExternalLink, CheckCircle2, AlertTriangle, Info, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { triggerHaptic } from '@/lib/general/haptics';

export interface SnapchatNotification {
  id: string;
  title?: string;
  message: string | string[] | Record<string, any>;
  mediaUrl?: string;
  linkUrl?: string;
  actionLabel?: string;
  type?: 'info' | 'success' | 'warning' | 'alert' | 'custom';
  timestamp?: number;
  read?: boolean;
}

export function SnapchatNotificationBanner() {
  const [notification, setNotification] = useState<SnapchatNotification | null>(null);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const pos = (localStorage.getItem('pw_notification_position') || 'top') as 'top' | 'bottom';
      setPosition(pos);
    } catch {}

    const handleCustomNotify = (e: Event) => {
      const customEvent = e as CustomEvent<SnapchatNotification>;
      if (customEvent.detail) {
        const payload = {
          ...customEvent.detail,
          id: customEvent.detail.id || `notif_${Date.now()}`,
          timestamp: Date.now(),
          read: false,
        };
        setNotification(payload);
        triggerHaptic('section');

        // Persist into local notification history
        try {
          const existing: SnapchatNotification[] = JSON.parse(
            localStorage.getItem('pw_app_notifications') || '[]'
          );
          const updated = [payload, ...existing.slice(0, 49)];
          localStorage.setItem('pw_app_notifications', JSON.stringify(updated));
        } catch {}
      }
    };

    window.addEventListener('pw_snapchat_notify', handleCustomNotify);
    return () => window.removeEventListener('pw_snapchat_notify', handleCustomNotify);
  }, []);

  const dismiss = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      dismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification, dismiss]);

  if (!notification) return null;

  const renderContent = () => {
    const msg = notification.message;
    if (typeof msg === 'string') {
      return <p className='text-xs leading-snug text-white/90 font-medium'>{msg}</p>;
    }
    if (Array.isArray(msg)) {
      return (
        <ul className='text-xs space-y-1 text-white/90 list-disc pl-4'>
          {msg.slice(0, 3).map((item, i) => (
            <li key={i}>{String(item)}</li>
          ))}
        </ul>
      );
    }
    if (typeof msg === 'object' && msg !== null) {
      return (
        <div className='text-xs space-y-1 text-white/90'>
          {Object.entries(msg).slice(0, 3).map(([k, v]) => (
            <div key={k} className='flex gap-1.5'>
              <span className='font-bold uppercase text-[10px] text-pw-cyan'>{k}:</span>
              <span>{String(v)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const isTop = position === 'top';

  return (
    <div className={`fixed inset-x-0 z-[100] flex justify-center pointer-events-none px-4 ${isTop ? 'top-4' : 'bottom-4'}`}>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: isTop ? -50 : 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isTop ? -30 : 30, scale: 0.9 }}
          className='pointer-events-auto max-w-md w-full bg-black/85 backdrop-blur-xl border border-white/20 rounded-3xl p-3.5 shadow-2xl shadow-black/80 flex items-center gap-3 relative overflow-hidden'>
          {/* Snapchat Accent Glow */}
          <div className='absolute -left-4 -top-4 w-16 h-16 bg-pw-primary/30 rounded-full blur-xl pointer-events-none' />

          {/* Media / Icon Avatar */}
          {notification.mediaUrl ? (
            <img
              src={notification.mediaUrl}
              alt='Notification thumbnail'
              className='w-10 h-10 rounded-2xl object-cover border border-white/20 shrink-0'
            />
          ) : (
            <div className='w-10 h-10 rounded-2xl bg-pw-primary/20 border border-pw-primary/30 flex items-center justify-center shrink-0 text-pw-primary'>
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : notification.type === 'warning' ? <AlertTriangle size={20} /> : <Sparkles size={20} />}
            </div>
          )}

          {/* Content Body */}
          <div className='flex-1 min-w-0 pr-2'>
            {notification.title && (
              <h4 className='text-xs font-bold text-pw-cyan truncate uppercase tracking-wider mb-0.5'>
                {notification.title}
              </h4>
            )}
            {renderContent()}
          </div>

          {/* Action Link Button */}
          {notification.linkUrl && (
            <Link
              href={notification.linkUrl}
              onClick={dismiss}
              className='bg-pw-primary text-white text-[11px] font-bold px-3 py-1.5 rounded-xl hover:scale-105 transition-all flex items-center gap-1 shrink-0'>
              {notification.actionLabel || 'View'}
              <ExternalLink size={12} />
            </Link>
          )}

          {/* Close Button */}
          <button
            onClick={dismiss}
            className='text-white/50 hover:text-white p-1 rounded-full shrink-0 transition-colors'>
            <X size={16} />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
