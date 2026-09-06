/**
 * Premium tier definitions for PingWorld.
 * All tier checks, limits, and feature gates should reference this file.
 */

// jules edit: Define flexible plan features & pricing configuration
export interface FlexibleFeature {
  id: string;
  label: string;
  monthly: number;
  yearly: number;
}

// jules edit: Modular and easily tweakable individual pricing rules for the flexible plan
export const FLEXIBLE_FEATURES: FlexibleFeature[] = [
  { id: 'composer', label: 'Creator Hub', monthly: 2.99, yearly: 29.99 },
  { id: 'quizzable', label: 'Quizzable Pro', monthly: 2.49, yearly: 24.99 },
  {id: 'pdf-studio', label: 'PDF Studio Pro', monthly: 1.49, yearly: 14.99},
  {id: 'anonlink', label: 'AnonLink Pro', monthly: 0.99, yearly: 9.99},
  { id: 'editor', label: 'Rich Notes & Editor Pro', monthly: 0.99, yearly: 9.99 },
];

export type PremiumTier = 'free' | 'flexible' | 'standard' | 'pro';

export interface TierConfig {
  label: string;
  badge: string;
  color: string;
  maxExpiryDays: number;
  minExpiryDays: number;
  aiRequestsPerMinute: number;
  maxQuizzes: number;
  maxMessages: number;
  publicInbox: boolean;
  proTools: boolean;
  description: string;
  price: {
    monthly: number | null;
    yearly: number | null;
  };
}

export const PREMIUM_TIERS: Record<PremiumTier, TierConfig> = {
  free: {
    label: 'Free',
    badge: 'FREE',
    color: '#6b7280',
    maxExpiryDays: 2,
    minExpiryDays: 1,
    aiRequestsPerMinute: 2,
    maxQuizzes: 5,
    maxMessages: 5,
    publicInbox: false,
    proTools: false,
    description:'Everything is free, be able to access basic and functional tools with top notch and professional features. ',
    price: { monthly: null, yearly: null },
  },
  flexible: {
    label: 'Flexible',
    badge: 'FLEX',
    color: '#3bf654',
    maxExpiryDays: 7,
    minExpiryDays: 3,
    aiRequestsPerMinute: 5,
    maxQuizzes: 10,
    maxMessages: 10,
    publicInbox: true,
    proTools: false,
    description:'Choose the tool you want, subscribe for it and use the best of the tool. Just a little above free plan with more quota and usage time.',
    price: { monthly: 2.99, yearly: 29.99 },
  },
  standard: {
    label: 'Standard',
    badge: 'STD',
    color: '#8c5bff',
    maxExpiryDays: 14,
    minExpiryDays: 7,
    aiRequestsPerMinute: 10,
    maxQuizzes: 20,
    maxMessages: 20,
    publicInbox: true,
    proTools: false,
    description:'Subscribe for all the tools to use more quota, reads, usage time and many more freedom and access.',
    price: { monthly: 9.99, yearly: 99.99 },
  },
  pro: {
    label: 'Pro',
    badge: 'PRO',
    color: '#f59e0b',
    maxExpiryDays: 30,
    minExpiryDays: 14,
    aiRequestsPerMinute: 15,
    maxQuizzes: Infinity,
    maxMessages: Infinity,
    publicInbox: true,
    proTools: true,
    description:'At this level you just want more! You can use any tool, any time, any where, with highly powered and optimized pro tools just for you',
    price: { monthly: 19.99, yearly: 199.99 },
  },
};

/**
 * Compute expiry date based on user tier and requested days.
 * Enforces tier caps silently - clamps to min/max.
 */
export function computeExpiry(tier: PremiumTier, requestedDays: number): Date {
  const config = PREMIUM_TIERS[tier];
  const clamped = Math.max(
    config.minExpiryDays,
    Math.min(requestedDays, config.maxExpiryDays),
  );
  const date = new Date();
  date.setDate(date.getDate() + clamped);
  return date;
}

/**
 * Returns the tier from user metadata string, defaults to 'free'.
 */
export function resolveTier(raw: unknown): PremiumTier {
  if (raw === 'flexible' || raw === 'standard' || raw === 'pro') return raw;
  return 'free';
}

/**
 * Whether the given tier can access a feature gated to targetTier or above.
 */
const TIER_ORDER: PremiumTier[] = ['free', 'flexible', 'standard', 'pro'];
export function tierAtLeast(userTier: PremiumTier, required: PremiumTier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(required);
}
