'use client';

// jules edit: PremiumGate component with crown/lock overlays and stopPropagation redirect
import { motion } from 'framer-motion';
import { Lock, Crown, Sparkles, ArrowRight, LockIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { PremiumFeatureDef } from '@/lib/composer/constants';

interface PremiumGateProps {
  feature: PremiumFeatureDef;
  isPremium: boolean;
  children: React.ReactNode;
  /** If true, shows partial access (blurred) rather than fully hidden */
  showPartial?: boolean;
  className?: string;
}

export function PremiumGate({
  feature,
  isPremium,
  children,
  showPartial = true,
  className,
}: PremiumGateProps) {
  const router = useRouter();

  const handleRedirect = (e: React.MouseEvent) => {
    // Prevent underlying triggers/clicks on children or parents
    e.preventDefault();
    e.stopPropagation();
    router.push('/pricing?upgrade=' + encodeURIComponent(feature.id));
  };

  if (isPremium) {
    return (
      <div
        className={cn(
          'relative h-full flex flex-col premium-border overflow-hidden',
          className,
        )}>
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
    <div
      onClick={handleRedirect}
      className={cn('relative w-full flex flex-col group cursor-pointer', className)}
      style={{
        height: 'fit-content',
        minHeight: 200,
        alignItems: 'center',
        justifyContent: 'center',
        placeSelf: 'center',
      }}>
      {/* Partially visible content (blurred) */}
      <div
        className={cn(
          'transition-all h-full duration-300',
          showPartial ?
            'blur-[3px] opacity-50 pointer-events-none select-none'
          : 'hidden',
        )}>
        {children}
      </div>

      {/* Lock Overlay with Crown and Padlock */}
      <div className='absolute inset-0 flex h-full flex-col items-center py-4 justify-center bg-pw-bg/85 backdrop-blur-md rounded-xl border border-pw-primary/25 z-10'>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='flex flex-col items-center gap-2 text-center px-4 py-5'>
          <div className='flex items-center gap-1.5'>
            <div className='h-9 w-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center'>
              <Crown className='h-4.5 w-4.5 text-amber-500' />
            </div>
            <div className='h-9 w-9 rounded-full bg-pw-warning/10 border border-pw-warning/30 flex items-center justify-center'>
              <Lock className='h-4 w-4 text-pw-warning' />
            </div>
          </div>
          <p className='text-sm font-bold text-pw-text flex items-center gap-1'>
            {feature.name}
          </p>
          <p className='text-[11px] text-pw-muted leading-relaxed max-w-[200px]'>
            {feature.freeDescription || 'Premium feature. Unlock to gain professional access.'}
          </p>
        </motion.div>
      </div>

      {/* Hover expand — shows full description */}
      <div className='absolute z-[60] left-1/2 -translate-x-1/2 w-[105%] flex flex-col items-center justify-center bg-pw-bg/95 backdrop-blur-xl rounded-xl border border-pw-warning/40 opacity-0 group-hover:opacity-100 transition-all duration-300 p-4 py-5 shadow-2xl pointer-events-none group-hover:pointer-events-auto'>
        <Sparkles className='h-5 w-5 text-pw-warning mb-2 animate-pulse' />
        <p className='text-sm font-bold text-pw-warning mb-1 flex items-center gap-1'>
          <Crown className='h-4 w-4 text-amber-500' /> {feature.name}
        </p>
        <p className='text-xs text-pw-muted text-center leading-relaxed mb-3'>
          {feature.description}
        </p>
        <button
          onClick={handleRedirect}
          className='btn-premium h-10 flex items-center gap-1 text-xs px-4 py-2 rounded-full cursor-pointer'>
          Upgrade to Premium
          <ArrowRight className='h-3 w-3' />
        </button>
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

  // jules edit: Display remaining free calls only for AI features as per requirements
  const isAi = label.toLowerCase().includes('ai') || label.toLowerCase().includes('generate') || label.toLowerCase().includes('translate') || label.toLowerCase().includes('suggest');
  if (!isAi) return null;

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
      {isAtLimit ? <LockIcon size='10px'/> : ''}
      {used}/{limit} {label}
    </span>
  );
}
