'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
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
  /**Avatar url for display profile */
  dp: string;
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
  const [dp, setDp] = useState('');
  const hasLoadedSession = useRef(false);

  // ── Online / offline detection
  //Suppress initial visit online toast and check for prior visits
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasVisited = localStorage.getItem('pw_has_visited');
      if (!hasVisited) {
        localStorage.setItem('pw_has_visited', 'true');
      }
    }

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Set initial state
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    // Initial browser connectivity is an intentional state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(online);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Cache check
  const checkCache = useCallback(async () => {
    try {
      const cached = await HybridStorage.getCacheCounts();
      setHasCache(Object.values(cached).some((count) => count > 0));
    } catch {
      setHasCache(false);
    }
  }, []);

  // ── Session loader
  const loadSession = useCallback(async () => {
    if (!hasLoadedSession.current) setIsLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      let authUser = authSession?.user || null;
      // Auth JWT claims can lag behind a completed Stripe webhook. Refresh the
      // account record online so app_metadata reflects the server's latest tier.
      if (authSession && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (!error && data.user) authUser = data.user;
        } catch { /* retain the locally cached session while offline */ }
      }
      if (authUser) {
        if (!authUser.email_confirmed_at) {
          await supabase.auth.signOut({ scope: 'local' });
          await HybridStorage.setUserId('guest');
          setUser(null);
          setUsername('');
          setDp('');
          setPremiumTier('free');
          setPurchasedTools([]);
          return;
        }
        await HybridStorage.setUserId(authUser.id);
        setUser(authUser);
        const meta = authUser.user_metadata ?? {};
        setUsername(meta.username || 'user');
        setDp(meta.avatar_url || '');
        // Billing tier is server-managed app metadata. User metadata is editable
        // by the account holder and must not grant paid-only controls.
        const accessMeta = authUser.app_metadata ?? {};
        const resolved = resolveTier(accessMeta.tier);
        const expiry = typeof accessMeta.tier_expires_at === 'string'
          ? Date.parse(accessMeta.tier_expires_at)
          : Number.NaN;
        const tierIsActive = Number.isFinite(expiry) && expiry > Date.now();
        setPremiumTier(tierIsActive ? resolved : 'free');
        const tools = tierIsActive ? accessMeta.purchased_tools || [] : [];
        setPurchasedTools(Array.isArray(tools) ? tools : [tools]);

        try {
          if (!authSession?.access_token) throw new Error('No Supabase access token is available.');
          const res = await fetch('/api/auth/firebase-token', {
            method: 'POST',
            headers: { Authorization: `Bearer ${authSession.access_token}` },
            credentials: 'omit',
          });
          if (!res.ok) throw new Error(`Firebase bridge returned ${res.status}.`);
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
        await HybridStorage.setUserId('guest');
        setUser(null);
        setUsername('');
        setDp('');
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
      await HybridStorage.setUserId('guest');
      setUser(null);
    } finally {
      hasLoadedSession.current = true;
      setIsLoading(false);
      void HybridStorage.flushPendingResponses();
    }
  }, []);

  const isFeatureUnlocked = useCallback((featureId: string): boolean => {
    if (premiumTier === 'pro' || premiumTier === 'standard') return true;
    if (premiumTier === 'flexible') {

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
    // Session bootstrap must begin when the provider mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession().then(() => {
      void HybridStorage.cleanupExpiredItems();
      void checkCache();
    });

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
    dp,
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
