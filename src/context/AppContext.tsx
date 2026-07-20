'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { resolveTier, type PremiumTier } from '@/lib/config/premium';
import { HybridStorage } from '@/lib/storage-utils';
import type { User } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────
export interface AppContextValue {
  /** Current Supabase user, null if not logged in */
  user: User | null;
  /** Resolved display username */
  username: string;
  /** Whether user is authenticated */
  isLoggedIn: boolean;
  /** Current premium tier */
  premiumTier: PremiumTier;
  /** Shorthand: any paid tier */
  isPremium: boolean;
  /** Network connectivity */
  isOnline: boolean;
  /** Initial loading phase in progress */
  isLoading: boolean;
  /** Whether HybridStorage has residue data for offline use */
  hasCache: boolean;
  /** Reload user session (call after login/logout) */
  refresh: () => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────
const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [premiumTier, setPremiumTier] = useState<PremiumTier>('free');
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCache, setHasCache] = useState(false);
  const [offlineToastShown, setOfflineToastShown] = useState(false);

  // ── Online / offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online - syncing data...', { id: 'online-status' });
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (!offlineToastShown) {
        toast.warning(
          "You're offline. Some features are disabled and data is served from local cache.",
          { id: 'offline-status', duration: 8000 },
        );
        setOfflineToastShown(true);
      }
    };

    // Set initial state
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOnline(online);
    if (!online && !offlineToastShown) {
      toast.warning(
        "You're offline. Some features are disabled.",
        { id: 'offline-status', duration: 8000 },
      );
      setOfflineToastShown(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cache check
  const checkCache = useCallback(async () => {
    try {
      const cached = await HybridStorage.getAll('message');
      setHasCache(Array.isArray(cached) && cached.length > 0);
    } catch {
      setHasCache(false);
    }
  }, []);

  // ── Session loader
  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const meta = authUser.user_metadata ?? {};
        setUsername(meta.username || meta.full_name || 'user');
        setPremiumTier(resolveTier(meta.tier));
      } else {
        setUser(null);
        setUsername('');
        setPremiumTier('free');
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // jules edit: Clean up local expired quizzes and messages on load
    HybridStorage.cleanupExpiredItems();

    loadSession();
    checkCache();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadSession();
    });
    return () => subscription.unsubscribe();
  }, [loadSession, checkCache]);

  const value: AppContextValue = {
    user,
    username,
    isLoggedIn: !!user,
    premiumTier,
    isPremium: premiumTier !== 'free',
    isOnline,
    isLoading,
    hasCache,
    refresh: loadSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
}
