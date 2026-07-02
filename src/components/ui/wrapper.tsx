import { capFirst, cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';
import { Card } from './card';
import { motion, AnimatePresence } from 'framer-motion';

interface WrapperT {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  capTitle?: boolean;
  children: React.ReactNode;
  color?: 'primary' | 'cyan' | 'success' | 'danger' | 'warning';
  defaultOpen?: boolean;
}

export default function Wrapper({
  title,
  description,
  icon,
  capTitle,
  children,
  color = 'primary',
  defaultOpen = false,
}: WrapperT) {
  const headerText = capTitle ? title.toUpperCase() : capFirst(title);
  const [open, setOpen] = useState(defaultOpen);

  const colorMap = {
    primary: 'pw-primary',
    cyan: 'pw-cyan',
    success: 'pw-success',
    danger: 'pw-danger',
    warning: 'pw-warning',
  };

  const activeColor = colorMap[color];

  return (
    <Card
      className='w-full flex flex-col gap-0 overflow-hidden border-white/5 bg-white/[0.02] mb-3 p-0'
      key={title + '-wrapper'}>
      <div
        onClick={() => setOpen(!open)}
        className='w-full cursor-pointer flex items-center justify-between p-4 hover:bg-white/5 transition-colors group'>
        <div className='flex items-center gap-3'>
          {icon && (
            <div
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center transition-all',
                `bg-${activeColor}/10 text-${activeColor} group-hover:scale-110`,
              )}>
              {icon}
            </div>
          )}
          <div>
            <p className='text-sm font-bold tracking-tight'>{headerText}</p>
            {description && (
              <p className='text-[10px] text-pw-muted leading-tight mt-0.5'>
                {description}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-pw-muted transition-transform duration-300',
            open && 'rotate-180 text-pw-text',
          )}
        />
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <div className='p-2 pt-0 border-t border-white/5'>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
