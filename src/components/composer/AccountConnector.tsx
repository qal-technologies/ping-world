'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Instagram,
  Facebook,
  Linkedin,
  Plus,
  Check,
  Wifi,
  WifiOff,
  ChevronRight,
  UserCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComposer } from '@/lib/composer/useComposerStore';
import { PLATFORMS, OAUTH_CONFIG } from '@/lib/composer/constants';
import type { Platform, ConnectedAccount } from '@/lib/composer/types';
import { XIcon } from '@/components/ui/XIcon';

const PLATFORM_ICONS: Record<Platform, React.ElementType> = {
  x: XIcon,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
};

const DEMO_ACCOUNTS: Record<Platform, ConnectedAccount> = {
  x: {
    platform: 'x',
    username: '@demo_user',
    displayName: 'Demo User',
    avatarUrl: null,
    isDemo: true,
    isConnected: true,
  },
  instagram: {
    platform: 'instagram',
    username: '@demo_user',
    displayName: 'Demo User',
    avatarUrl: null,
    isDemo: true,
    isConnected: true,
  },
  facebook: {
    platform: 'facebook',
    username: 'Demo User',
    displayName: 'Demo User',
    avatarUrl: null,
    isDemo: true,
    isConnected: true,
  },
  linkedin: {
    platform: 'linkedin',
    username: 'Demo User',
    displayName: 'Demo User',
    avatarUrl: null,
    isDemo: true,
    isConnected: true,
  },
};

export function AccountConnector() {
  const { state, dispatch } = useComposer();
  const [hovered, setHovered] = useState<Platform | null>(null);

  const getAccount = (platform: Platform) =>
    state.connectedAccounts.find((a) => a.platform === platform);

  const handleConnect = (platform: Platform) => {
    if (!state.isOnline) return;

    // Show privacy modal if not yet accepted
    if (!state.privacyAccepted) {
      dispatch({ type: 'SET_PRIVACY_MODAL', payload: true });
      return;
    }

    const config = OAUTH_CONFIG[platform];
    const hasRealKey = !config.clientId.startsWith('PLACEHOLDER');

    if (hasRealKey) {
      // Real OAuth redirect — assign inside a regular function to satisfy linter
      const redirect = () => {
        window.location.href = config.redirectUri;
      };
      redirect();
    } else {
      // Demo mode — connect with demo account
      dispatch({
        type: 'SET_CONNECTED_ACCOUNT',
        payload: DEMO_ACCOUNTS[platform],
      });
    }
  };

  const handleDisconnect = (platform: Platform) => {
    dispatch({ type: 'DISCONNECT_ACCOUNT', payload: platform });
  };

  return (
    <div className='flex items-center gap-2 flex-wrap'>

      <p className='text-[10px] font-bold uppercase tracking-widest text-pw-muted'>
        Accounts
      </p>

      <div className='h-4 w-px bg-white/10' />

      {/* Platform Pills */}
      {PLATFORMS.map((platform) => {
        const account = getAccount(platform.id);
        const Icon = PLATFORM_ICONS[platform.id];
        const isConnected = !!account;

        return (
          <div
            key={platform.id}
            className='relative'
            onMouseEnter={() => setHovered(platform.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              onClick={() =>
                isConnected
                  ? handleDisconnect(platform.id)
                  : handleConnect(platform.id)
              }
              disabled={!state.isOnline && !isConnected}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                isConnected
                  ? 'border-transparent text-white'
                  : !state.isOnline
                    ? 'border-white/5 text-pw-muted/40 cursor-not-allowed bg-white/[0.02]'
                    : 'border-white/10 text-pw-muted hover:border-white/20 hover:text-pw-text bg-white/[0.03] hover:bg-white/[0.06]',
              )}
              style={
                isConnected
                  ? {
                      backgroundColor: `${platform.iconHex}20`,
                      borderColor: `${platform.iconHex}40`,
                    }
                  : {}
              }
            >
              <Icon
                className='h-3 w-3'
                style={{ color: isConnected ? platform.iconHex : 'currentColor' }}
              />
              <span className='hidden sm:inline'>
                {platform.name.split(' ')[0]}
              </span>
              {isConnected ? (
                account?.isDemo ? (
                  <span className='text-[9px] font-mono text-pw-warning px-1 py-0.5 rounded bg-pw-warning/10'>
                    DEMO
                  </span>
                ) : (
                  <Check className='h-2.5 w-2.5 text-pw-success' />
                )
              ) : (
                <Plus className='h-2.5 w-2.5' />
              )}
            </button>

            {/* Hover tooltip */}
            <AnimatePresence>
              {hovered === platform.id && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className='absolute top-full left-0 mt-2 z-50 min-w-[160px] p-3 rounded-xl bg-pw-surface border border-white/10 shadow-xl text-xs'
                >
                  {isConnected ? (
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <UserCircle2 className='h-4 w-4 text-pw-muted shrink-0' />
                        <div>
                          <p className='font-semibold text-pw-text'>
                            {account?.displayName}
                          </p>
                          <p className='text-pw-muted'>{account?.username}</p>
                        </div>
                      </div>
                      {account?.isDemo && (
                        <div className='flex items-center gap-1 text-pw-warning mt-1'>
                          <AlertTriangle className='h-3 w-3' />
                          <span className='text-[10px]'>
                            Demo mode — add OAuth key to connect real account
                          </span>
                        </div>
                      )}
                      <p className='text-pw-danger/80 text-[10px] mt-1 cursor-pointer hover:text-pw-danger'>
                        Click to disconnect
                      </p>
                    </div>
                  ) : !state.isOnline ? (
                    <p className='text-pw-muted'>
                      Connect requires internet connection
                    </p>
                  ) : (
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-pw-muted'>
                        Connect {platform.name}
                      </span>
                      <ChevronRight className='h-3 w-3 text-pw-muted shrink-0' />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
