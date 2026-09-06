'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  Eye,
  FileText,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useComposer } from '@/lib/composer/useComposerStore';
import type { Platform } from '@/lib/composer/types';
import { getPlatform } from '@/lib/composer/constants';

const PERMISSIONS: Record<Platform, string[]> = {
  x: [
    'Read your profile information and tweets',
    'Post tweets on your behalf',
    'Access your follower/following lists',
  ],
  instagram: [
    'Read your profile and media',
    'Publish posts to your account',
    'Access Instagram Insights (analytics)',
  ],
  facebook: [
    'Access your public profile',
    'Post to Facebook Pages you manage',
    'Read Page engagement data',
  ],
  linkedin: [
    'Read your basic LinkedIn profile',
    'Share posts and articles on your behalf',
  ],
};

export function PrivacyPermissionModal() {
  const { state, dispatch } = useComposer();
  const [allChecked, setAllChecked] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  if (!state.showPrivacyModal) return null;

  const allPermissions = Object.entries(PERMISSIONS).flatMap(
    ([platform, perms]) =>
      perms.map((p) => `${platform}:${p}`),
  );
  const totalItems = allPermissions.length + 2; // + 2 for the bottom consents

  const toggle = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // jules edit: Store granular permission selections to validate actual platform posting
  const handleAccept = () => {
    try {
      localStorage.setItem(
        'pw_composer_permissions',
        JSON.stringify(Array.from(checkedItems)),
      );
    } catch {}
    dispatch({ type: 'ACCEPT_PRIVACY' });
  };

  const handleClose = () => {
    dispatch({ type: 'SET_PRIVACY_MODAL', payload: false });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='fixed inset-0 z-50 flex items-center justify-center p-4'>
        {/* Backdrop */}
        <div
          className='absolute inset-0 bg-black/40 backdrop-blur-md'
          onClick={handleClose}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className='relative w-full max-w-md bg-pw-surface/70 rounded-2xl border border-pw-primary/20 shadow-2xl overflow-hidden'>
          {/* Header */}
          <div className='p-6 border-b border-white/5'>
            <div className='flex items-start justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <div className='h-10 w-10 rounded-full bg-pw-primary/10 border border-pw-primary/20 flex items-center justify-center shrink-0'>
                  <Shield className='h-5 w-5 text-pw-primary' />
                </div>
                <div>
                  <h2 className='font-bold text-pw-text text-lg'>
                    Privacy & Permissions
                  </h2>
                  <p className='text-xs text-pw-muted mt-0.5'>
                    Review what access PingWorld Composer will have
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className='text-pw-muted hover:text-pw-text transition-colors p-1'>
                <X className='h-4 w-4' />
              </button>
            </div>
          </div>

          {/* Platform permissions list */}
          <div className='p-6 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar'>
            <div className='flex items-center gap-2 p-2 rounded-xl bg-pw-warning/10 border border-pw-warning/20'>
              <AlertTriangle className='h-4 w-4 text-pw-warning shrink-0' />
              <p className='text-xs text-pw-warning'>
                PingWorld never stores your social credentials. OAuth tokens are
                held securely and only used for publishing.
              </p>
            </div>

            <p className='text-xs text-pw-muted'>
              This is a read/write access for post creation, image/video upload,
              and analytics retrieval.
            </p>

            {(Object.entries(PERMISSIONS) as [Platform, string[]][]).map(
              ([platform, perms], idx) => {
                const meta = getPlatform(platform);
                return (
                  <div
                    key={platform + idx}
                    className='space-y-2'>
                    <p
                      className='text-xs font-bold uppercase tracking-widest'
                      style={{ color: meta.iconHex }}>
                      {meta.name}
                    </p>
                    {perms.map((perm, idx) => {
                      const key = `${platform}:${perm}`;
                      return (
                        <label
                          key={perm + idx}
                          className='flex items-start gap-2 cursor-pointer group'>
                          <input
                            type='checkbox'
                            checked={checkedItems.has(key)}
                            onChange={() => toggle(key)}
                            className='mt-0.5 accent-pw-primary'
                          />
                          <span className='text-xs text-pw-muted group-hover:text-pw-text transition-colors'>
                            {perm}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                );
              },
            )}

            <div className='divider' />

            <label className='flex items-start gap-2 cursor-pointer group'>
              <input
                type='checkbox'
                className='mt-0.5 accent-pw-primary'
                onChange={(e) => {
                  const key = 'terms';
                  e.target.checked ? toggle(key) : toggle(key);
                }}
              />
              <span className='text-xs text-pw-muted group-hover:text-pw-text transition-colors'>
                I agree to PingWorld&apos;s{' '}
                <a
                  href='/terms'
                  className='text-pw-primary hover:underline'>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href='/privacy'
                  className='text-pw-primary hover:underline'>
                  Privacy Policy
                </a>
              </span>
            </label>

            <label className='flex items-start gap-2 cursor-pointer group'>
              <input
                type='checkbox'
                className='mt-0.5 accent-pw-primary'
                onChange={(e) => {
                  const key = 'revoke';
                  e.target.checked ? toggle(key) : toggle(key);
                }}
              />
              <span className='text-xs text-pw-muted group-hover:text-pw-text transition-colors'>
                I understand I can revoke access at any time from each
                platform&apos;s connected apps settings
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className='p-4 border-t border-white/5 flex gap-3'>
            <Button
              variant='outline'
              onClick={handleClose}
              className='flex-1 h-10 border-white/10 hover:bg-white/5'>
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              className='flex-1 h-10 btn-primary gap-2'>
              <CheckCircle2 className='h-4 w-4' />
              Accept
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
