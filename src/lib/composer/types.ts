// ─── Composer Types ───────────────────────────────────────────

export type Platform = 'x' | 'instagram' | 'facebook' | 'linkedin';

export type PostVariant = {
  platform: Platform;
  content: string;
  isOverridden: boolean;
};

export interface MediaAsset {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  altText: string;
  /** Client-side CSS filter string, e.g. "brightness(1.1) contrast(1.05)" */
  filterStyle: string;
  rotation: number; // degrees
}

export interface HashTag {
  tag: string;
  isPingWorld: boolean; // locked, always included
  source: 'ai' | 'manual' | 'trending';
}

export interface ConnectedAccount {
  platform: Platform;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isDemo: boolean; // true until real OAuth
  isConnected: boolean;
}

export interface AiSuggestion {
  id: string;
  text: string;
  style: AiStyle;
}

export type AiStyle = 'professional' | 'casual' | 'viral' | 'educational';

export interface TextAnalysis {
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  readTimeSeconds: number;
  fleschScore: number;       // 0-100
  sentiment: 'positive' | 'neutral' | 'negative';
  flaggedWords: string[];
  readabilityLabel: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  targetLanguageCode: string;
}

export interface PremiumUsageCounters {
  aiSuggestionsToday: number;
  aiRephrasesToday: number;
  translationsToday: number;
  tagsGenerated: number;
}

export type GenerationContextPreset =
  | 'brand_voice'
  | 'minimalist'
  | 'storyteller'
  | 'educator'
  | 'custom';

export interface AiContext {
  preset: GenerationContextPreset;
  customPrompt: string;
  alwaysIncludePingWorld: boolean;
  pingWorldPlatformHandle: Partial<Record<Platform, string>>;
}

export interface CanvasTextOverlay {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  x: number;
  y: number;
}

export interface ComposerState {
  // Content
  baseContent: string;
  postTitle: string;
  platformVariants: PostVariant[];
  selectedPlatforms: Platform[];

  // Tags
  tags: HashTag[];

  // Media
  mediaAssets: MediaAsset[];
  canvasBackground: string; // CSS gradient or hex color
  canvasTextOverlays: CanvasTextOverlay[];

  // AI
  aiContext: AiContext;
  aiSuggestions: AiSuggestion[];
  isAiProcessing: boolean;

  // Accounts
  connectedAccounts: ConnectedAccount[];

  // UI state
  activeToolTab: ToolTab;
  showReactions: boolean;
  showPrivacyModal: boolean;
  privacyAccepted: boolean;

  // User tier
  isPremium: boolean;
  usageCounters: PremiumUsageCounters;

  // Translation
  translationResult: TranslationResult | null;

  // Online
  isOnline: boolean;
}

export type ToolTab =
  | 'tags'
  | 'analysis'
  | 'ai'
  | 'translate'
  | 'ai_context'
  | 'emoji'
  | 'media'
  | 'canvas'
  | 'save';

export type ComposerAction =
  | { type: 'SET_BASE_CONTENT'; payload: string }
  | { type: 'SET_POST_TITLE'; payload: string }
  | { type: 'TOGGLE_PLATFORM'; payload: Platform }
  | { type: 'SET_PLATFORM_VARIANT'; payload: { platform: Platform; content: string } }
  | { type: 'TOGGLE_PLATFORM_OVERRIDE'; payload: Platform }
  | { type: 'ADD_TAG'; payload: HashTag }
  | { type: 'REMOVE_TAG'; payload: string }
  | { type: 'SET_TAGS'; payload: HashTag[] }
  | { type: 'ADD_MEDIA'; payload: MediaAsset }
  | { type: 'REMOVE_MEDIA'; payload: string }
  | { type: 'UPDATE_MEDIA_FILTER'; payload: { id: string; filterStyle: string } }
  | { type: 'UPDATE_MEDIA_ROTATION'; payload: { id: string; rotation: number } }
  | { type: 'SET_CANVAS_BG'; payload: string }
  | { type: 'ADD_CANVAS_TEXT'; payload: CanvasTextOverlay }
  | { type: 'UPDATE_CANVAS_TEXT'; payload: { index: number; overlay: CanvasTextOverlay } }
  | { type: 'REMOVE_CANVAS_TEXT'; payload: number }
  | { type: 'SET_AI_CONTEXT'; payload: Partial<AiContext> }
  | { type: 'SET_AI_SUGGESTIONS'; payload: AiSuggestion[] }
  | { type: 'SET_AI_PROCESSING'; payload: boolean }
  | { type: 'SET_CONNECTED_ACCOUNT'; payload: ConnectedAccount }
  | { type: 'DISCONNECT_ACCOUNT'; payload: Platform }
  | { type: 'SET_ACTIVE_TAB'; payload: ToolTab }
  | { type: 'TOGGLE_REACTIONS' }
  | { type: 'SET_PRIVACY_MODAL'; payload: boolean }
  | { type: 'ACCEPT_PRIVACY' }
  | { type: 'SET_PREMIUM'; payload: boolean }
  | { type: 'INCREMENT_USAGE'; payload: keyof PremiumUsageCounters }
  | { type: 'SET_TRANSLATION'; payload: TranslationResult | null }
  | { type: 'SET_ONLINE'; payload: boolean };
