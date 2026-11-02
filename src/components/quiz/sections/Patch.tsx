'use client';

import { Button } from '@/components/ui/button';
import {motion} from 'framer-motion';
import { AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export function UnderReview() {
  return (
    <div className='flex min-h-[90dvh] flex-col items-center justify-center gap-3 p-6 text-center'>
      <AlertTriangle className='h-12 w-12 text-pw-warning' />
      <h2 className='text-2xl font-bold'>Assessment paused for review</h2>
      <p className='max-w-md text-sm text-pw-muted'>
        This assessment is temporarily unavailable while reports are reviewed.
      </p>
      <Link href='/tools'>
        <Button className='btn-primary'>Go to tools</Button>
      </Link>
    </div>
  );
}

export function NoRetry() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0A0C1B] p-6 text-center text-white'>
      <ShieldCheck className='h-12 w-12 text-pw-primary' />
      <h1 className='text-2xl font-bold'>
        This assessment was already completed on this device.
      </h1>
      <p className='max-w-md text-sm text-white/75 quiz-taker-font'>
        This assessment allows one submission per device. Contact its owner if
        you need access.
      </p>
      <Link href='/tools'>
        <Button className='btn-primary'>Close assessment</Button>
      </Link>
    </div>
  );
}

export function NotFound() {
  return (
    <div className='flex min-h-[90dvh] flex-col items-center justify-center gap-3 p-6 text-center'>
      <AlertTriangle className='h-12 w-12 text-pw-warning' />
      <h2 className='text-2xl font-bold'>Assessment unavailable</h2>
      <p className='max-w-md text-sm text-pw-muted'>
        This assessment may have expired, or the secure quiz service is not
        configured. Please check the link or try again later.
      </p>
      <Link href='/tools'>
        <Button className='btn-primary'>Go to tools</Button>
      </Link>
    </div>
  );
}

export function Offline(){
       return (
          <motion.div
            initial={{ opacity: 0.1, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.1, scale: 0.9 }}
            key='inner-not-cached-view'
            className='flex flex-col items-center justify-center min-h-[90dvh] text-center p-4 py-6 self-center'>
            <AlertTriangle className='h-12 w-12 text-pw-warning mb-4 animate-pulse' />
            <h2 className='text-2xl font-bold mb-1'>
              Offline: Quiz Not Cached Yet
            </h2>
            <p className='text-sm text-pw-muted max-w-sm'>
              Please connect to the internet to load this assessment.
            </p>
          </motion.div>
        );
}


export function ExpiredSection() {
  return (
    <motion.div
      initial={{ opacity: 0.1, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      key='inner-expired-quiz-view'
      className='flex flex-col items-center justify-center min-h-[90dvh] text-center p-6 self-center'>
      <div className='w-16 h-16 bg-pw-warning/10 rounded-full flex items-center justify-center border border-pw-warning/20 mb-4'>
        <Clock className='h-8 w-8 text-pw-warning' />
      </div>
      <h2 className='text-2xl font-bold mb-2'>Assessment Expired</h2>
      <p className='text-xs text-pw-muted max-w-sm mb-6'>
        This assessment has passed its active lifespan and is no longer
        accepting new submissions.
      </p>
      <Link href='/tools'>
        <Button className='btn-primary h-10 px-6 rounded-xl font-bold text-xs'>
          Explore PingWorld Tools
        </Button>
      </Link>
    </motion.div>
  );
}
