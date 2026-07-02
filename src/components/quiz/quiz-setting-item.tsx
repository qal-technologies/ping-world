import { cn } from '@/lib/utils';
import React from 'react';

interface QuizSettingItemProps {
  label: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export default function QuizSettingItem({
  label,
  description,
  children,
  className,
}: QuizSettingItemProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 px-2.5 rounded-xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05]', className)}>
      <div className='flex-1'>
        <p className='text-sm font-bold text-pw-text'>{label}</p>
        <p className='text-[10px] text-pw-muted leading-relaxed max-w-md'>
          {description}
        </p>
      </div>
      <div className='flex items-center shrink-0'>
        {children}
      </div>
    </div>
  );
}
