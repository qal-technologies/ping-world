'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ThemedSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** Compact, accessible animated switch for settings and form controls. */
export default function ThemedSwitch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
  id,
}: ThemedSwitchProps) {
  return (
    <button
      id={id}
      type='button'
      role='switch'
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pw-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-pw-surface disabled:cursor-not-allowed disabled:opacity-50 p-1 bkblur backdrop-blur-md',
        checked
          ? 'border-none bg-gradient-to-r from-pw-primary via-pw-primary to-white/60'
          : 'border-white/15 bg-white/10',
        className,
      )}>
      <motion.span
        aria-hidden='true'
        initial={false}
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', duration: 0.15 }}
        className='h-4 w-4 rounded-full bg-white shadow-md'
      />
    </button>
  );
}
