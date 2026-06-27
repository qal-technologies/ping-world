import type { Platform, GenerationContextPreset } from './types';

// ─── Platform Metadata ───────────────────────────────────────
export interface PlatformMeta {
  id: Platform;
  name: string;
  charLimit: number;
  /** Tailwind/hex brand color */
  brandColor: string;
  /** Light mode bg for preview */
  previewBg: string;
  previewText: string;
  previewAccent: string;
  /** Brand hex for icons */
  iconHex: string;
  maxImages: number;
  supportsVideo: boolean;
  supportsHashtags: boolean;
}

export const PLATFORMS: PlatformMeta[] = [
  {
    id: 'x',
    name: 'X / Twitter',
    charLimit: 280,
    brandColor: '#000000',
    previewBg: '#000000',
    previewText: '#e7e9ea',
    previewAccent: '#1d9bf0',
    iconHex: '#1d9bf0',
    maxImages: 4,
    supportsVideo: true,
    supportsHashtags: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    charLimit: 2200,
    brandColor: '#E4405F',
    previewBg: '#ffffff',
    previewText: '#1c1c1e',
    previewAccent: '#E4405F',
    iconHex: '#E4405F',
    maxImages: 10,
    supportsVideo: true,
    supportsHashtags: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    charLimit: 63206,
    brandColor: '#1877F2',
    previewBg: '#ffffff',
    previewText: '#1c1e21',
    previewAccent: '#1877F2',
    iconHex: '#1877F2',
    maxImages: 10,
    supportsVideo: true,
    supportsHashtags: false,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    charLimit: 3000,
    brandColor: '#0A66C2',
    previewBg: '#ffffff',
    previewText: '#000000',
    previewAccent: '#0A66C2',
    iconHex: '#0A66C2',
    maxImages: 9,
    supportsVideo: true,
    supportsHashtags: true,
  },
];

export const getPlatform = (id: Platform): PlatformMeta =>
  PLATFORMS.find((p) => p.id === id)!;

// ─── PingWorld Platform Accounts ───────────────────────────
// Replace these with real account handles once registered
export const PINGWORLD_ACCOUNTS: Record<Platform, string> = {
  x: '@pingwrld',
  instagram: '@pingwrld',
  facebook: 'PingWorld',
  linkedin: 'PingWorld',
};

export const PINGWORLD_HASHTAG = '#PingWorld';

// ─── OAuth Config (Placeholder) ─────────────────────────────
// Replace CLIENT_ID values once API apps are registered
export const OAUTH_CONFIG: Record<
  Platform,
  { clientId: string; redirectUri: string; scope: string[] }
> = {
  x: {
    clientId: process.env.NEXT_PUBLIC_X_CLIENT_ID ?? 'PLACEHOLDER_X_CLIENT_ID',
    redirectUri: '/api/auth/social/callback?platform=x',
    scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  },
  instagram: {
    clientId:
      process.env.NEXT_PUBLIC_META_APP_ID ?? 'PLACEHOLDER_META_APP_ID',
    redirectUri: '/api/auth/social/callback?platform=instagram',
    scope: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
  },
  facebook: {
    clientId:
      process.env.NEXT_PUBLIC_META_APP_ID ?? 'PLACEHOLDER_META_APP_ID',
    redirectUri: '/api/auth/social/callback?platform=facebook',
    scope: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
  },
  linkedin: {
    clientId:
      process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID ??
      'PLACEHOLDER_LINKEDIN_CLIENT_ID',
    redirectUri: '/api/auth/social/callback?platform=linkedin',
    scope: ['r_liteprofile', 'w_member_social'],
  },
};

// ─── AI Config (Placeholder) ────────────────────────────────
// Set GEMINI_API_KEY in .env.local to enable real AI
export const AI_CONFIG = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? null,
  openAiApiKey: process.env.OPENAI_API_KEY ?? null,
  useRealAi: !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
};

// ─── Free Tier Limits ───────────────────────────────────────
export const FREE_LIMITS = {
  aiSuggestionsPerDay: 3,
  aiRephrasesPerDay: 3,
  translationsPerDay: 1,
  maxTags: 5,
  maxImages: 1,
  maxPlatforms: 2, // can select up to 2 platforms for free
};

// ─── Premium Feature Definitions ────────────────────────────
export interface PremiumFeatureDef {
  id: string;
  name: string;
  description: string;
  freeDescription: string; // what free users get
}

export const PREMIUM_FEATURES: PremiumFeatureDef[] = [
  {
    id: 'grammar_check',
    name: 'Grammar Check',
    description:
      'Real-time grammar and spelling correction powered by AI, with contextual suggestions and tone analysis across all your posts.',
    freeDescription: 'Basic spell check via local dictionary only.',
  },
  {
    id: 'unlimited_ai',
    name: 'Unlimited AI Suggestions',
    description:
      'Generate unlimited post suggestions, rephrasings, and content ideas with no daily cap. Includes advanced style options.',
    freeDescription: 'Up to 3 AI suggestions per day.',
  },
  {
    id: 'unlimited_translation',
    name: 'Unlimited Translation',
    description:
      'Translate your posts to any language unlimited times, with per-platform language variants and selection translation.',
    freeDescription: '1 translation per day.',
  },
  {
    id: 'trending_tags',
    name: 'Trending Tags',
    description:
      'Access real-time trending hashtags tailored to your niche and platform. Maximize your post discoverability.',
    freeDescription: 'AI-generated tags from post content only.',
  },
  {
    id: 'multi_platform',
    name: 'All Platform Publishing',
    description:
      'Post to all 4 platforms simultaneously with individual customization for each. Free users can select up to 2.',
    freeDescription: 'Select up to 2 platforms per post.',
  },
  {
    id: 'multi_image',
    name: 'Multi-Image & Video Upload',
    description:
      'Upload up to 10 images or video content per post, with full platform-specific media management.',
    freeDescription: '1 image per post.',
  },
  {
    id: 'custom_ai_context',
    name: 'Custom AI Context',
    description:
      'Set a custom system prompt and generation context that persists across all AI calls — train the AI to write in your brand voice.',
    freeDescription: 'Preset generation contexts only.',
  },
  {
    id: 'clean_preview',
    name: 'Clean Preview Export',
    description:
      'Export your post preview as a high-quality PNG without watermarks. Includes custom PingWorld branding options.',
    freeDescription: 'Preview saved with PingWorld watermark.',
  },
  {
    id: 'analytics',
    name: 'Post Analytics',
    description:
      'Track views, likes, comments, and engagement trends for all your posts across platforms over time.',
    freeDescription: 'Basic 7-day like/comment counts.',
  },
  {
    id: 'canvas_templates',
    name: 'Canvas Templates',
    description:
      'Access premium canvas templates for text-on-image posts — professionally designed layouts for Instagram, Stories, and more.',
    freeDescription: 'Basic canvas with custom background color.',
  },
];

// ─── AI Generation Context Presets ──────────────────────────
export const AI_CONTEXT_PRESETS: Record<
  GenerationContextPreset,
  { label: string; prompt: string }
> = {
  brand_voice: {
    label: 'My Brand Voice',
    prompt:
      'Write in a confident, modern brand tone. Be concise, impactful, and professional. Focus on value proposition.',
  },
  minimalist: {
    label: 'Minimalist',
    prompt:
      'Use minimal words for maximum impact. Short sentences. Strong verbs. Elegant simplicity.',
  },
  storyteller: {
    label: 'Storyteller',
    prompt:
      'Engage through narrative. Open with a hook, build a brief story arc, and end with a clear takeaway or call to action.',
  },
  educator: {
    label: 'Educator',
    prompt:
      'Break down complex ideas into easy-to-understand points. Use numbered lists, examples, and approachable language.',
  },
  custom: {
    label: 'Custom',
    prompt: '',
  },
};

// ─── Supported Translation Languages ────────────────────────
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'ig', name: 'Igbo' },
  { code: 'ha', name: 'Hausa' },
  { code: 'sw', name: 'Swahili' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

// ─── Emoji Categories ────────────────────────────────────────
export const EMOJI_CATEGORIES = [
  { id: 'smileys', label: 'Smileys', icon: '😊' },
  { id: 'people', label: 'People', icon: '🧑' },
  { id: 'nature', label: 'Nature', icon: '🌿' },
  { id: 'food', label: 'Food', icon: '🍕' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'objects', label: 'Objects', icon: '💡' },
  { id: 'symbols', label: 'Symbols', icon: '❤️' },
  { id: 'flags', label: 'Flags', icon: '🏳️' },
] as const;

// ─── Canvas Font Options ─────────────────────────────────────
export const CANVAS_FONTS = [
  'Syne',
  'Space Grotesk',
  'JetBrains Mono',
  'Georgia',
  'Impact',
  'Arial',
  'Verdana',
];

// ─── Spam/Flagged Word List (Local Dictionary) ───────────────
export const FLAGGED_WORDS: string[] = [
  'buy now',
  'click here',
  'free money',
  'guaranteed',
  'limited time offer',
  'act now',
  'risk-free',
  'earn money',
  'make money fast',
  'winner',
  'you have been selected',
  'congratulations',
  'no cost',
  'this is not spam',
  'unsubscribe',
];
