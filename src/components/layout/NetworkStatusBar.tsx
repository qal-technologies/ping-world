'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, X } from 'lucide-react';
import {cn} from '@/lib/utils'

export function NetworkStatusBar() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showBar, setShowBar] = useState<boolean>(false);
  const [justCameOnline, setJustCameOnline] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialStatus = navigator.onLine;
    setIsOnline(initialStatus);
    if (!initialStatus) {
      setShowBar(true);
    }

    let hideTimer: NodeJS.Timeout | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      setJustCameOnline(true);
      setShowBar(true);

      if (hideTimer) clearTimeout(hideTimer);
      // Auto-hide after 3.5 seconds when back online
      hideTimer = setTimeout(() => {
        setShowBar(false);
        setJustCameOnline(false);
      }, 3500);
    };

    const handleOffline = () => {
      if (hideTimer) clearTimeout(hideTimer);
      setIsOnline(false);
      setJustCameOnline(false);
      setShowBar(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showBar && (
        <motion.div
          initial={{ y: -40, width: '10%', opacity: 0 }}
          animate={{ y: 0, width: '100%', opacity: 1 }}
          exit={{ y: -40, width: '10%', opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className='fixed top-0 left-0 right-0 z-[100000] select-none flex justify-center items-center overflow-hidden transition-all'
          style={{ placeSelf: 'center', alignSelf: 'center' }}>
          <div
            className={cn(
              'px-4 pr-2 py-1 mt-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-xl bkblur truncate border transition-all',
              isOnline ?
                'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 shadow-emerald-900/20'
              : 'bg-amber-950/50 border-amber-500/40 text-amber-300 shadow-amber-900/30',
            )}>
            {isOnline ?
              <>
                <Wifi className='h-3.5 w-3.5 text-emerald-400 shrink-0' />
                <span>Back online · Data synchronizing...</span>
              </>
            : <>
                <WifiOff className='h-3.5 w-3.5 text-amber-400 shrink-0 animate-pulse' />
                <span>Working offline · Using local cache</span>
              </>
            }

            <button
              className='p-1 cursor-pointer bg-none border-none ring-0'
              onClick={() => setShowBar(false)}>
              <X className='h-3.5 w-3.5' />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NetworkStatusBar;
