/**
 * Premium tier definitions for PingWorld.
 * All tier checks, limits, and feature gates should reference this file.
 */

export interface FlexibleIds {
  id: 'composer' | 'quiz' | 'pdf' | 'anonlink' | 'text-editor' | 'images';
}
// Define flexible plan features & pricing configuration
export interface FlexibleFeature {
  id: FlexibleIds['id'];
  label: string;
  monthly: number;
  yearly: number;
}

export interface FlexibleToolEntitlement {
  toolId: string;
  subscriptionId: string | null;
  startsAt: string;
  expiresAt: string;
  billingCycle: 'monthly' | 'yearly';
  autoRenew: boolean;
}


// Modular and easily tweakable individual pricing rules for the flexible plan
export const FLEXIBLE_FEATURES: FlexibleFeature[] = [
  { id: 'composer', label: 'Creator Hub', monthly: 2.99, yearly: 29.99 },
  { id: 'quiz', label: 'Quizzable Pro', monthly: 2.49, yearly: 24.99 },
  { id: 'pdf', label: 'PDF Studio Pro', monthly: 1.49, yearly: 14.99 },
  { id: 'anonlink', label: 'AnonLink Pro', monthly: 0.99, yearly: 9.99 },
  {
    id: 'text-editor',
    label: 'Rich Notes & Editor Pro',
    monthly: 0.99,
    yearly: 9.99,
  },
  {
    id: 'images',
    label: 'Media Editor & Bizzcard Pro',
    monthly: 1.99,
    yearly: 19.99,
  },
];

/** Read only explicitly purchased flexible tools from trusted account metadata. */
export function readFlexibleTools(metadata: Record<string, any> | null | undefined): string[] {
  if (!metadata) return [];
  const raw: unknown = metadata.flexibleTools ?? metadata.purchased_tools;
  let values: unknown[];
  if (Array.isArray(raw)) {
    values = raw;
  } else if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      values = Array.isArray(parsed) ? parsed : [];
    } catch {
      values = raw.split(',').map((value) => value.trim()).filter(Boolean);
    }
  } else {
    values = metadata.selectedFlexibleToolId ? [metadata.selectedFlexibleToolId] : [];
  }
  return Array.from(new Set(values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => FLEXIBLE_FEATURES.some((feature) => feature.id === value))));
}

/** Per-tool paid periods. Legacy flexible accounts are mapped to their existing
 * shared period until each tool is next renewed or separately purchased. */
export function readFlexibleEntitlements(
  metadata: Record<string, any> | null | undefined,
): FlexibleToolEntitlement[] {
  if (!metadata) return [];
  let raw: unknown = metadata.flexible_entitlements;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = []; }
  }
  if (Array.isArray(raw)) {
    const seen = new Set<string>();
    return raw.flatMap((entry): FlexibleToolEntitlement[] => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as Record<string, unknown>;
      const toolId = typeof item.toolId === 'string' ? item.toolId : '';
      const startsAt = typeof item.startsAt === 'string' ? item.startsAt : '';
      const expiresAt = typeof item.expiresAt === 'string' ? item.expiresAt : '';
      const billingCycle = item.billingCycle === 'yearly' ? 'yearly' : 'monthly';
      if (!FLEXIBLE_FEATURES.some((feature) => feature.id === toolId) ||
        !Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(expiresAt)) || seen.has(toolId)) return [];
      seen.add(toolId);
      return [{
        toolId,
        subscriptionId: typeof item.subscriptionId === 'string' ? item.subscriptionId : null,
        startsAt,
        expiresAt,
        billingCycle,
        autoRenew: item.autoRenew === true,
      }];
    });
  }
  const expiresAt = typeof metadata.tier_expires_at === 'string' ? metadata.tier_expires_at : '';
  if (!Number.isFinite(Date.parse(expiresAt))) return [];
  const startsAt = typeof metadata.tier_started_at === 'string' && Number.isFinite(Date.parse(metadata.tier_started_at))
    ? metadata.tier_started_at
    : new Date(0).toISOString();
  const billingCycle = metadata.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
  return readFlexibleTools(metadata).map((toolId) => ({
    toolId,
    subscriptionId: typeof metadata.stripe_subscription_id === 'string' ? metadata.stripe_subscription_id : null,
    startsAt,
    expiresAt,
    billingCycle,
    autoRenew: metadata.auto_renew === true,
  }));
}

export function activeFlexibleEntitlements(
  metadata: Record<string, any> | null | undefined,
  now = Date.now(),
): FlexibleToolEntitlement[] {
  return readFlexibleEntitlements(metadata).filter((entry) => Date.parse(entry.expiresAt) > now);
}

export function flexibleEntitlementSummary(entries: FlexibleToolEntitlement[], now = Date.now()) {
  const active = entries.filter((entry) => Date.parse(entry.expiresAt) > now);
  return {
    active,
    tools: Array.from(new Set(active.map((entry) => entry.toolId))),
    expiresAt: active.reduce<string | null>((latest, entry) =>
      !latest || Date.parse(entry.expiresAt) > Date.parse(latest) ? entry.expiresAt : latest, null),
    autoRenew: active.some((entry) => entry.autoRenew),
    subscriptionId: active.find((entry) => entry.subscriptionId)?.subscriptionId || null,
  };
}

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
export function computeExpiry (tier: PremiumTier, requestedDays: number, isTemplate?: boolean): Date {
  if(isTemplate) return new Date();
  const config = PREMIUM_TIERS[tier];
  // A tier's minimum is the shortest *extended* lifespan it unlocks, not a
  // lower bound for the free choices (1–2 days). Preserve every valid user
  // selection and only cap it at the active tier's maximum.
  const clamped = Math.max(1, Math.min(requestedDays, config.maxExpiryDays));
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
 * Whether the given tier can access a feature gated to target Tier or above.
 */
const TIER_ORDER: PremiumTier[] = ['free', 'flexible', 'standard', 'pro'];
export function tierAtLeast(userTier: PremiumTier, required: PremiumTier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(required);
}
