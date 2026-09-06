'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ActivityIndicatorProps {
  loading: boolean;
  message?: string;
  blurBack?: boolean;
  transparentBack?: boolean;
  fullScreen?: boolean;
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
  fullScreen = false,
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

  if (fullScreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 p-6 transition-all duration-300 pointer-events-auto select-none',
          blurBack && 'backdrop-blur-md',
          transparentBack ? 'bg-black/40' : 'bg-[#030612]/90',
          className,
        )}
        onClick={(e) => e.stopPropagation()}>
        <div className='relative flex items-center justify-center'>
          <div className='w-12 h-12 rounded-full border-2 border-pw-primary/20 border-t-pw-primary animate-spin' />
          <div className='absolute w-7 h-7 rounded-full border-2 border-pw-cyan/30 border-b-pw-cyan animate-spin [animation-direction:reverse]' />
        </div>
        {message && (
          <p className='text-sm font-bold text-pw-text tracking-wide text-center animate-pulse max-w-sm'>
            {timedOut ? 'Operation taking longer than expected...' : message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className='relative w-full h-full min-h-[60px]'>
      {children && (
        <div className='pointer-events-none select-none opacity-30 transition-opacity'>
          {children}
        </div>
      )}
      <div
        className={cn(
          'absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 p-4 transition-all duration-300 pointer-events-auto select-none rounded-xl',
          blurBack && 'backdrop-blur-md',
          transparentBack ? 'bg-black/20' : 'bg-[#030612]/80',
          className,
        )}
        onClick={(e) => e.stopPropagation()}>
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
