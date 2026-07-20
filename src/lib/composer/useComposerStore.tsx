'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { ComposerState, ComposerAction, Platform } from './types';
import { PINGWORLD_HASHTAG, PINGWORLD_ACCOUNTS } from './constants';

// ─── Initial State ───────────────────────────────────────────
const initialState: ComposerState = {
  baseContent: '',
  postTitle: '',
  platformVariants: [],
  selectedPlatforms: ['x'],
  activeEditorPlatform: 'x',

  tags: [{ tag: PINGWORLD_HASHTAG, isPingWorld: true, source: 'manual' }],

  mediaAssets: [],
  canvasBackground: 'linear-gradient(135deg, #12152e 0%, #1a1f40 100%)',
  canvasTextOverlays: [],

  aiContext: {
    preset: 'brand_voice',
    customPrompt: '',
    alwaysIncludePingWorld: true,
    pingWorldPlatformHandle: PINGWORLD_ACCOUNTS as Partial<
      Record<Platform, string>
    >,
  },
  aiSuggestions: [],
  isAiProcessing: false,

  connectedAccounts: [],

  activeToolTab: 'tags',
  showReactions: true,
  showPrivacyModal: false,
  privacyAccepted: false,

  isPremium: false,
  usageCounters: {
    aiSuggestionsToday: 0,
    aiRephrasesToday: 0,
    translationsToday: 0,
    tagsGenerated: 0,
  },

  translationResult: null,
  isOnline: true,

  // jules edit: Initialize default Instagram Canvas values for live preview
  instaCanvasThemeIdx: 0,
  instaCanvasFont: 'Syne',
};

// ─── Reducer ─────────────────────────────────────────────────
function composerReducer(
  state: ComposerState,
  action: ComposerAction,
): ComposerState {
  switch (action.type) {
    case 'SET_BASE_CONTENT':
      return { ...state, baseContent: action.payload };

    case 'SET_POST_TITLE':
      return { ...state, postTitle: action.payload };

    case 'TOGGLE_PLATFORM': {
      const platform = action.payload;
      const isSelected = state.selectedPlatforms.includes(platform);
      const selectedPlatforms =
        isSelected ?
          state.selectedPlatforms.filter((p) => p !== platform)
        : [...state.selectedPlatforms, platform];

      const newActive =
        selectedPlatforms.includes(state.activeEditorPlatform) ?
          state.activeEditorPlatform
        : (selectedPlatforms[0] ?? 'x');

      return { ...state, selectedPlatforms, activeEditorPlatform: newActive };
    }

    case 'SET_ACTIVE_EDITOR_PLATFORM':
      return { ...state, activeEditorPlatform: action.payload };

    case 'SET_PLATFORM_VARIANT': {
      const existing = state.platformVariants.find(
        (v) => v.platform === action.payload.platform,
      );
      const platformVariants =
        existing ?
          state.platformVariants.map((v) =>
            v.platform === action.payload.platform ?
              { ...v, content: action.payload.content }
            : v,
          )
        : [
            ...state.platformVariants,
            {
              platform: action.payload.platform,
              content: action.payload.content,
              isOverridden: true,
            },
          ];
      return { ...state, platformVariants };
    }

    case 'TOGGLE_PLATFORM_OVERRIDE': {
      const existing = state.platformVariants.find(
        (v) => v.platform === action.payload,
      );
      if (!existing) {
        return {
          ...state,
          platformVariants: [
            ...state.platformVariants,
            {
              platform: action.payload,
              content: state.baseContent,
              isOverridden: true,
            },
          ],
        };
      }
      return {
        ...state,
        platformVariants: state.platformVariants.map((v) =>
          v.platform === action.payload ?
            { ...v, isOverridden: !v.isOverridden }
          : v,
        ),
      };
    }

    case 'ADD_TAG': {
      const exists = state.tags.find((t) => t.tag === action.payload.tag);
      if (exists) return state;
      return { ...state, tags: [...state.tags, action.payload] };
    }

    case 'REMOVE_TAG':
      return {
        ...state,
        tags: state.tags.filter(
          (t) => t.isPingWorld || t.tag !== action.payload,
        ),
      };

    case 'SET_TAGS':
      return { ...state, tags: action.payload };

    case 'ADD_MEDIA':
      return {
        ...state,
        mediaAssets: [...state.mediaAssets, action.payload],
      };

    case 'REMOVE_MEDIA':
      return {
        ...state,
        mediaAssets: state.mediaAssets.filter((m) => m.id !== action.payload),
      };

    case 'UPDATE_MEDIA_FILTER':
      return {
        ...state,
        mediaAssets: state.mediaAssets.map((m) =>
          m.id === action.payload.id ?
            { ...m, filterStyle: action.payload.filterStyle }
          : m,
        ),
      };

    case 'UPDATE_MEDIA_ROTATION':
      return {
        ...state,
        mediaAssets: state.mediaAssets.map((m) =>
          m.id === action.payload.id ?
            { ...m, rotation: action.payload.rotation }
          : m,
        ),
      };

    case 'SET_CANVAS_BG':
      return { ...state, canvasBackground: action.payload };

    case 'ADD_CANVAS_TEXT':
      return {
        ...state,
        canvasTextOverlays: [...state.canvasTextOverlays, action.payload],
      };

    case 'UPDATE_CANVAS_TEXT':
      return {
        ...state,
        canvasTextOverlays: state.canvasTextOverlays.map((o, i) =>
          i === action.payload.index ? action.payload.overlay : o,
        ),
      };

    case 'REMOVE_CANVAS_TEXT':
      return {
        ...state,
        canvasTextOverlays: state.canvasTextOverlays.filter(
          (_, i) => i !== action.payload,
        ),
      };

    case 'SET_AI_CONTEXT':
      return {
        ...state,
        aiContext: { ...state.aiContext, ...action.payload },
      };

    case 'SET_AI_SUGGESTIONS':
      return { ...state, aiSuggestions: action.payload };

    case 'SET_AI_PROCESSING':
      return { ...state, isAiProcessing: action.payload };

    case 'SET_CONNECTED_ACCOUNT': {
      const others = state.connectedAccounts.filter(
        (a) => a.platform !== action.payload.platform,
      );
      return {
        ...state,
        connectedAccounts: [...others, action.payload],
      };
    }

    case 'DISCONNECT_ACCOUNT':
      return {
        ...state,
        connectedAccounts: state.connectedAccounts.filter(
          (a) => a.platform !== action.payload,
        ),
      };

    case 'SET_ACTIVE_TAB':
      return { ...state, activeToolTab: action.payload };

    case 'TOGGLE_REACTIONS':
      return { ...state, showReactions: !state.showReactions };

    case 'SET_PRIVACY_MODAL':
      return { ...state, showPrivacyModal: action.payload };

    case 'ACCEPT_PRIVACY':
      return {
        ...state,
        privacyAccepted: true,
        showPrivacyModal: false,
      };

    case 'SET_PREMIUM':
      return { ...state, isPremium: action.payload };

    case 'INCREMENT_USAGE':
      return {
        ...state,
        usageCounters: {
          ...state.usageCounters,
          [action.payload]: state.usageCounters[action.payload] + 1,
        },
      };

    case 'SET_TRANSLATION':
      return { ...state, translationResult: action.payload };

    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };

    // jules edit: Reducer action to set Instagram auto text-to-canvas rendering style variables
    case 'SET_INSTA_CANVAS_SETTINGS':
      return {
        ...state,
        instaCanvasThemeIdx: action.payload.themeIdx !== undefined ? action.payload.themeIdx : state.instaCanvasThemeIdx,
        instaCanvasFont: action.payload.font !== undefined ? action.payload.font : state.instaCanvasFont,
      };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────
interface ComposerContextValue {
  state: ComposerState;
  dispatch: React.Dispatch<ComposerAction>;
  /** Effective content for a platform (variant if overridden, else base) */
  getContentForPlatform: (platform: Platform) => string;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────
export function ComposerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(composerReducer, initialState);

  // Online/offline detection
  useEffect(() => {
    const setOnline = () => dispatch({ type: 'SET_ONLINE', payload: true });
    const setOffline = () => dispatch({ type: 'SET_ONLINE', payload: false });
    dispatch({ type: 'SET_ONLINE', payload: navigator.onLine });
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  // Restore privacy acceptance from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('composer_privacy_accepted');
      if (accepted === 'true') {
        dispatch({ type: 'ACCEPT_PRIVACY' });
      }
    }
  }, []);

  // Persist privacy acceptance
  useEffect(() => {
    if (state.privacyAccepted && typeof window !== 'undefined') {
      localStorage.setItem('composer_privacy_accepted', 'true');
    }
  }, [state.privacyAccepted]);

  const getContentForPlatform = useCallback(
    (platform: Platform) => {
      const variant = state.platformVariants.find(
        (v) => v.platform === platform && v.isOverridden,
      );
      return variant ? variant.content : state.baseContent;
    },
    [state.platformVariants, state.baseContent],
  );

  return (
    <ComposerContext.Provider value={{ state, dispatch, getContentForPlatform }}>
      {children}
    </ComposerContext.Provider>
  );
}

// jules edit: Sync with useAppContext to make it the single source of truth for online & premium states
import { useAppContext } from '@/context/AppContext';
import { HybridStorage } from '@/lib/storage-utils';

// ─── Hook ──────────────────────────────────────────────────
export function useComposer() {
  const ctx = useContext(ComposerContext);
  if (!ctx) throw new Error('useComposer must be used inside ComposerProvider');

  const appCtx = useAppContext();

  // Override composer state properties to strictly delegate to the global single source of truth
  const stateWithGlobal = {
    ...ctx.state,
    isOnline: appCtx.isOnline,
    isPremium: appCtx.isPremium,
  };

  return {
    ...ctx,
    state: stateWithGlobal,
    user: appCtx.user,
    isLoggedIn: appCtx.isLoggedIn,
    username: appCtx.username,
    premiumTier: appCtx.premiumTier,
    /**
     * Page load offline cache checking utility.
     * Returns true if online, otherwise checks if any cached data of `type` exists.
     */
    checkOfflineCache: async (type: 'quiz' | 'message'): Promise<boolean> => {
      if (typeof window === 'undefined') return false;
      if (appCtx.isOnline) return true;

      const cache = await HybridStorage.getAll(type);
      return Array.isArray(cache) && cache.length > 0;
    },
  };
}
