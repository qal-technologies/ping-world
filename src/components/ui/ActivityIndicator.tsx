'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ActivityIndicatorProps {
  loading: boolean;
  message?: string;
  blurBack?: boolean;
  transparentBack?: boolean;
  timeoutMs?: number;
  onTimeout?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function ActivityIndicator({
  loading,
  message = 'Loading...',
  blurBack = true,
  transparentBack = false,
  timeoutMs,
  onTimeout,
  className,
  children,
}: ActivityIndicatorProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading || !timeoutMs) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
      if (onTimeout) onTimeout();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [loading, timeoutMs, onTimeout]);

  if (!loading) return <>{children}</>;

  return (
    <div className='relative w-full h-full min-h-[60px]'>
      {children}
      <div
        className={cn(
          'absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 p-4 transition-all duration-300 pointer-events-auto',
          blurBack && 'backdrop-blur-md',
          transparentBack ? 'bg-black/20' : 'bg-[#030612]/80',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='relative flex items-center justify-center'>
          <div className='w-10 h-10 rounded-full border-2 border-pw-primary/20 border-t-pw-primary animate-spin' />
          <div className='absolute w-6 h-6 rounded-full border-2 border-pw-cyan/30 border-b-pw-cyan animate-spin [animation-direction:reverse]' />
        </div>
        {message && (
          <p className='text-xs font-bold text-pw-text tracking-wide text-center animate-pulse'>
            {timedOut ? 'Operation taking longer than expected...' : message}
          </p>
        )}
      </div>
    </div>
  );
}

export default ActivityIndicator;
