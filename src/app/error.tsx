'use client';

import {useEffect} from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error Boundary]:', error);
  }, [error]);

  return (
    <div className='min-h-screen bg-[#0A0C1B] text-pw-text flex items-center justify-center p-4 font-body relative overflow-hidden'>
      {/* Background glow */}

      <div className='absolute -top-30 -left-35 w-100 h-100 bg-pw-primary/5 rounded-full blur-[45px]' />
      <div className='absolute -bottom-45 -right-40 w-100 h-100 bg-pw-cyan/10 rounded-full blur-[50px]' />

      <Card className='max-w-md w-full bg-white/[0.02] border border-white/10 rounded-[32px] p-5 sm:p-10 text-center backdrop-blur-xl shadow-2xl relative z-10'>
        <div className='w-20 h-20 rounded-3xl bg-pw-danger/10 border border-pw-danger/25 flex items-center justify-center mx-auto mb-6 shadow-lg'>
          <AlertCircle className='h-10 w-10 text-pw-danger' />
        </div>

        <h1 className='text-4xl font-extrabold font-display mb-3 tracking-tight'>
          System <span className='text-pw-danger'>Error.</span>
        </h1>
        <p className='text-pw-muted text-sm leading-relaxed mb-8 max-w-xs mx-auto'>
          An unexpected error occurred in this section or server connection.
          Please try recovering or navigating away.
        </p>

        <div className='flex flex-col gap-3'>
          <Button
            onClick={() => reset()}
            className='btn-primary w-full h-12 gap-2 text-sm font-bold rounded-xl'>
            <RotateCcw className='h-4 w-4' />
            Try Again
          </Button>
          <Link
            href='/'
            className='w-full'>
            <Button
              variant='outline'
              className='w-full h-12 gap-2 text-sm border-white/10 hover:bg-white/5 font-bold rounded-xl'>
              <Home className='h-4 w-4' />
              Return Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
