import { cn } from '@/lib/utils';
import {Crown} from 'lucide-react';
import React from 'react';

interface QuizSettingItemProps {
  label: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  premium?:boolean;
}

export default function QuizSettingItem({
  label,
  description,
  children,
  premium,
  className,
}: QuizSettingItemProps) {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 rounded-xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05]',
        className, premium && 'cursor-not-allowed'
      )}
      aria-disabled={premium}
      title={premium ? 'Premium Feature' : (label ?? '')}>
      <div className='flex-1'>
        <p className='text-sm font-bold text-pw-text flex gap-1 items-center'>
          {label} {premium && <Crown className='text-pw-warning h-4 w-4' />}
        </p>
        <p
          className='text-[10px] text-pw-muted leading-relaxed max-w-md mt-[2px]'
          style={{ lineHeight: '14px' }}>
          {description}
        </p>
      </div>
      <div
        className={cn(
          'flex items-center shrink-0',
          premium && 'pointer-events-none opacity-50',
        )}>
        {children}
      </div>
    </div>
  );
}
