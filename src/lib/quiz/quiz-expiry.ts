import { PREMIUM_TIERS, type PremiumTier } from '@/lib/config/premium';

export interface ExpiryRateMetrics {
  totalExtensions: number;
  averageExtensionDays: number;
  extensionFrequencyPerWeek: number;
  initialExpiry: string;
  currentExpiry: string;
  cumulativeExtendedDays: number;
}

export interface ExpiryValidationResult {
  isValid: boolean;
  message: string;
  maxAllowedDays: number;
  remainingDays: number;
  remainingTimeFormatted: string;
  suggestedExpiry: string;
  isExpired: boolean;
}

/**
 * Calculates metrics and rate of expiry changes for a quiz.
 */
export function calculateExpiryRate(
  expiryHistory: string[] = [],
  currentExpiry: string,
  createdAt: number,
): ExpiryRateMetrics {
  const totalExtensions = expiryHistory.length;
  const initialExpiry = expiryHistory[0] || currentExpiry;

  const now = Date.now();
  const ageMs = Math.max(1, now - createdAt);
  const ageWeeks = ageMs / (1000 * 60 * 60 * 24 * 7);
  const extensionFrequencyPerWeek =
    ageWeeks > 0 ? Number((totalExtensions / Math.max(1, ageWeeks)).toFixed(2)) : totalExtensions;

  let cumulativeExtendedDays = 0;
  if (expiryHistory.length > 0) {
    for (let i = 0; i < expiryHistory.length; i++) {
      const prev = new Date(expiryHistory[i]).getTime();
      const next = i + 1 < expiryHistory.length ? new Date(expiryHistory[i + 1]).getTime() : new Date(currentExpiry).getTime();
      const diffDays = Math.max(0, (next - prev) / (1000 * 60 * 60 * 24));
      cumulativeExtendedDays += diffDays;
    }
  }

  const averageExtensionDays =
    totalExtensions > 0 ? Number((cumulativeExtendedDays / totalExtensions).toFixed(1)) : 0;

  return {
    totalExtensions,
    averageExtensionDays,
    extensionFrequencyPerWeek,
    initialExpiry,
    currentExpiry,
    cumulativeExtendedDays: Math.round(cumulativeExtendedDays),
  };
}

/**
 * Validates a quiz's target expiry date strictly against the user's active tier.
 * Returns validation outcome, remaining allowed duration, and save-blocking alerts.
 */
export function validateQuizExpiry(
  requestedExpiry: string | undefined | null,
  userTier: PremiumTier = 'free',
  _createdAt: number = Date.now(),
): ExpiryValidationResult {
  const tierConfig = PREMIUM_TIERS[userTier] || PREMIUM_TIERS.free;
  const maxAllowedDays = tierConfig.maxExpiryDays;

  const now = Date.now();
  const maxAllowedTime = now + maxAllowedDays * 24 * 60 * 60 * 1000;
  const suggestedExpiry = new Date(maxAllowedTime).toISOString();

  // If no expiry provided, suggest the default plan max
  if (!requestedExpiry) {
    return {
      isValid: true,
      message: 'Default expiry aligned with active plan.',
      maxAllowedDays,
      remainingDays: maxAllowedDays,
      remainingTimeFormatted: `${maxAllowedDays} days`,
      suggestedExpiry,
      isExpired: false,
    };
  }

  const expiryTime = new Date(requestedExpiry).getTime();

  // Check if already expired
  if (expiryTime <= now) {
    return {
      isValid: false,
      message: 'The selected expiry date has already passed or is invalid.',
      maxAllowedDays,
      remainingDays: 0,
      remainingTimeFormatted: 'Expired',
      suggestedExpiry,
      isExpired: true,
    };
  }

  const diffMs = expiryTime - now;
  const requestedDays = diffMs / (1000 * 60 * 60 * 24);

  // Check if exceeds plan limit
  if (expiryTime > maxAllowedTime) {
    const remainingAllowedMs = Math.max(0, maxAllowedTime - now);
    const remainingHours = Math.floor(remainingAllowedMs / (1000 * 60 * 60));
    const remainingDays = Math.floor(remainingHours / 24);
    const remHours = remainingHours % 24;

    const formattedRemaining =
      remainingDays > 0 ? `${remainingDays}d ${remHours}h` : `${remainingHours}h`;

    return {
      isValid: false,
      message: `Selected expiry duration (${requestedDays.toFixed(1)} days) exceeds your ${tierConfig.label} plan limit of ${maxAllowedDays} days. Your maximum allowed remaining time is ${formattedRemaining}.`,
      maxAllowedDays,
      remainingDays,
      remainingTimeFormatted: formattedRemaining,
      suggestedExpiry,
      isExpired: false,
    };
  }

  const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
  const remainingDays = Math.floor(remainingHours / 24);
  const remHours = remainingHours % 24;
  const formattedRemaining =
    remainingDays > 0 ? `${remainingDays}d ${remHours}h` : `${remainingHours}h`;

  return {
    isValid: true,
    message: 'Expiry date is valid and strictly aligned with your plan.',
    maxAllowedDays,
    remainingDays,
    remainingTimeFormatted: formattedRemaining,
    suggestedExpiry: new Date(expiryTime).toISOString(),
    isExpired: false,
  };
}
