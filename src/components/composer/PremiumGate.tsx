'use client';

import { motion } from 'framer-motion';
import { Lock, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PremiumFeatureDef } from '@/lib/composer/constants';

interface PremiumGateProps {
  feature: PremiumFeatureDef;
  isPremium: boolean;
  children: React.ReactNode;
  /** If true, shows partial access (blurred) rather than fully hidden */
  showPartial?: boolean;
  className?: string;
}

/**
 * Wraps a feature with a visual premium lock overlay.
 * Premium users: see a gold border + ✦ Premium badge.
 * Free users: blurred overlay with upgrade CTA and feature description on hover.
 */
export function PremiumGate({
  feature,
  isPremium,
  children,
  showPartial = true,
  className,
}: PremiumGateProps) {
  if (isPremium) {
    return (
      <div
        className={cn(
          'relative rounded-xl premium-border overflow-hidden',
          className,
        )}
      >
        <div className='absolute top-2 right-2 z-10'>
          <span className='badge-premium flex items-center gap-1 text-[10px]'>
            <Crown className='h-2.5 w-2.5' />
            Premium
          </span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-xl overflow-hidden group', className)}>
      {/* Partially visible content (blurred) */}
      <div
        className={cn(
          'transition-all duration-300',
          showPartial ? 'blur-[2px] opacity-60 pointer-events-none select-none' : 'hidden',
        )}
      >
        {children}
      </div>

      {/* Lock Overlay */}
      <div className='absolute inset-0 flex flex-col items-center justify-center bg-pw-bg/70 backdrop-blur-sm rounded-xl border border-pw-primary/20 z-10'>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='flex flex-col items-center gap-2 text-center px-4'
        >
          <div className='h-10 w-10 rounded-full bg-pw-warning/10 border border-pw-warning/30 flex items-center justify-center'>
            <Lock className='h-4 w-4 text-pw-warning' />
          </div>
          <p className='text-sm font-bold text-pw-text'>{feature.name}</p>
          <p className='text-[11px] text-pw-muted leading-relaxed max-w-[180px]'>
            {feature.freeDescription}
          </p>
        </motion.div>
      </div>

      {/* Hover expand — shows full description */}
      <div className='absolute inset-0 flex flex-col items-center justify-center bg-pw-bg/90 backdrop-blur-md rounded-xl border border-pw-warning/40 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 p-4'>
        <Sparkles className='h-5 w-5 text-pw-warning mb-2' />
        <p className='text-sm font-bold text-pw-warning mb-1'>{feature.name}</p>
        <p className='text-xs text-pw-muted text-center leading-relaxed mb-3'>
          {feature.description}
        </p>
        <a
          href='/pricing'
          className='btn-premium flex items-center gap-1 text-xs px-3 py-1.5 rounded-full'
        >
          Upgrade to Premium
          <ArrowRight className='h-3 w-3' />
        </a>
      </div>
    </div>
  );
}

// ─── Inline usage counter badge ──────────────────────────────
interface UsageCounterProps {
  used: number;
  limit: number;
  label: string;
  isPremium: boolean;
}

export function UsageCounter({ used, limit, label, isPremium }: UsageCounterProps) {
  if (isPremium) return null;
  const isNearLimit = used >= limit - 1;
  const isAtLimit = used >= limit;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border',
        isAtLimit
          ? 'text-pw-danger border-pw-danger/30 bg-pw-danger/10'
          : isNearLimit
            ? 'text-pw-warning border-pw-warning/30 bg-pw-warning/10'
            : 'text-pw-muted border-white/10 bg-white/5',
      )}
    >
      {isAtLimit ? '🔒 ' : ''}
      {used}/{limit} {label}
    </span>
  );
}
