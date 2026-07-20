/**
 * Premium tier definitions for PingWorld.
 * All tier checks, limits, and feature gates should reference this file.
 */

export type PremiumTier = 'free' | 'flexible' | 'standard' | 'pro';

export interface TierConfig {
  label: string;
  badge: string;
  color: string;
  /** Max expiry days for quizzes and messages */
  maxExpiryDays: number;
  /** Min expiry days selectable */
  minExpiryDays: number;
  aiRequestsPerMinute: number;
  maxQuizzes: number;
  maxMessages: number;
  publicInbox: boolean;
  proTools: boolean;
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
    aiRequestsPerMinute: 5,
    maxQuizzes: 5,
    maxMessages: 20,
    publicInbox: false,
    proTools: false,
    price: { monthly: null, yearly: null },
  },
  flexible: {
    label: 'Flexible',
    badge: 'FLEX',
    color: '#3b82f6',
    maxExpiryDays: 7,
    minExpiryDays: 3,
    aiRequestsPerMinute: 15,
    maxQuizzes: 20,
    maxMessages: 100,
    publicInbox: true,
    proTools: false,
    price: { monthly: 4.99, yearly: 49.99 },
  },
  standard: {
    label: 'Standard',
    badge: 'STD',
    color: '#8b5cf6',
    maxExpiryDays: 14,
    minExpiryDays: 7,
    aiRequestsPerMinute: 30,
    maxQuizzes: 100,
    maxMessages: 500,
    publicInbox: true,
    proTools: false,
    price: { monthly: 9.99, yearly: 99.99 },
  },
  pro: {
    label: 'Pro',
    badge: 'PRO',
    color: '#f59e0b',
    maxExpiryDays: 30,
    minExpiryDays: 14,
    aiRequestsPerMinute: 60,
    maxQuizzes: Infinity,
    maxMessages: Infinity,
    publicInbox: true,
    proTools: true,
    price: { monthly: 19.99, yearly: 199.99 },
  },
};

/**
 * Compute expiry date based on user tier and requested days.
 * Enforces tier caps silently — clamps to min/max.
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
