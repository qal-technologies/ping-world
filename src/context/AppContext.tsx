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
  /** Specific tools unlocked under flexible plan */
  purchasedTools: string[];
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
  /** Check if a specific paid tool/feature is unlocked */
  isFeatureUnlocked: (featureId: string) => boolean;
}

// ─── Context ────────────────────────────────────────────────────
const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [premiumTier, setPremiumTier] = useState<PremiumTier>('free');
  const [purchasedTools, setPurchasedTools] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCache, setHasCache] = useState(false);
  const [offlineToastShown, setOfflineToastShown] = useState(false);

  // ── Online / offline detection
  // jules edit: Suppress initial visit online toast and check for prior visits
  useEffect(() => {
    let initialVisit = false;
    if (typeof window !== 'undefined') {
      const hasVisited = localStorage.getItem('pw_has_visited');
      if (!hasVisited) {
        initialVisit = true;
        localStorage.setItem('pw_has_visited', 'true');
      }
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Only show sync toast if not initial visit on fresh tab open
      if (!initialVisit) {
        toast.success('Back online - syncing data...', { id: 'online-status' });
      }
      initialVisit = false;
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
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.user) {
        const authUser = authSession.user;
        setUser(authUser);
        const meta = authUser.user_metadata ?? {};
        setUsername(meta.username || meta.full_name || 'user');
        const resolved = resolveTier(meta.tier);
        setPremiumTier(resolved);

        const tools = meta.purchased_tools || [];
        setPurchasedTools(Array.isArray(tools) ? tools : [tools]);

        try {
          const res = await fetch('/api/auth/firebase-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: authSession.access_token }),
          });
          const data = await res.json();
          if (data.firebaseToken) {
            const { signInWithCustomToken } = await import('firebase/auth');
            const { auth: firebaseAuth } = await import('@/lib/firebase');
            await signInWithCustomToken(firebaseAuth, data.firebaseToken);
            console.log('[Firebase Auth Bridge] Signed into Firebase with Supabase UID successfully!');
          }
        } catch (firebaseErr) {
          console.warn('[Firebase Auth Bridge] Session bridging was bypassed or failed:', firebaseErr);
        }
      } else {
        setUser(null);
        setUsername('');
        setPremiumTier('free');
        setPurchasedTools([]);

     
        try {
          const { signInAnonymously } = await import('firebase/auth');
          const { auth: firebaseAuth } = await import('@/lib/firebase');
          await signInAnonymously(firebaseAuth);
        } catch (firebaseErr) {
          console.warn('[Firebase Auth Bridge] Anonymous authentication fallback was bypassed or failed:', firebaseErr);
        }
      }
    } catch (err) {
      console.error('[loadSession] Error occurred during auth initialization:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isFeatureUnlocked = useCallback((featureId: string): boolean => {
    if (premiumTier === 'pro' || premiumTier === 'standard') return true;
    if (premiumTier === 'flexible') {
      if (purchasedTools.includes('all')) return true;

      // Normalize feature aliases
      const normalizedMap: Record<string, string[]> = {
        'quizzable': ['quizzable', 'quiz', 'quiz-builder'],
        'quiz': ['quizzable', 'quiz', 'quiz-builder'],
        'composer': ['composer', 'creator-hub', 'social-composer'],
        'creator-hub': ['composer', 'creator-hub'],
        'anonlink': ['anonlink', 'message', 'anonymous-messages'],
        'message': ['anonlink', 'message'],
        'pdf-tools': ['pdf-tools', 'pdf', 'book-creator'],
        'pdf': ['pdf-tools', 'pdf'],
      };

      const validAliases = normalizedMap[featureId] || [featureId];
      return purchasedTools.some((p) => validAliases.includes(p));
    }
    return false;
  }, [premiumTier, purchasedTools]);

  useEffect(() => {
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
    purchasedTools,
    isPremium: premiumTier !== 'free',
    isOnline,
    isLoading,
    hasCache,
    refresh: loadSession,
    isFeatureUnlocked,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
}
