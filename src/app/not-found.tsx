'use client';


import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className='min-h-screen bg-[#0A0C1B] text-pw-text flex items-center justify-center p-6 font-body relative overflow-hidden'>
      {/* Background gradients */}
      <div className='absolute -top-40 -left-40 w-120 h-120 bg-pw-primary/10 rounded-full blur-[50px]' />
      <div className='absolute -bottom-40 -right-40 w-120 h-120 bg-pw-cyan/10 rounded-full blur-[45px]' />

      <Card className='max-w-md w-full bg-white/[0.02] border border-white/10 rounded-[32px] p-8 sm:p-10 text-center backdrop-blur-xl shadow-2xl relative z-10 nav-glass bkblur'>
        <div className='w-20 h-20 rounded-3xl bg-pw-primary/10 border border-pw-primary/25 flex items-center justify-center mx-auto mb-6 shadow-lg'>
          <FileQuestion className='h-10 w-10 text-pw-primary' />
        </div>

        <h1 className='text-4xl font-extrabold font-display mb-3 tracking-tight'>
          Page <span className='gradient-text'>Not Found.</span>
        </h1>
        <p className='text-pw-muted text-sm leading-relaxed mb-8 max-w-xs mx-auto'>
          The page you are looking for does not exist, has been archived, or moved to another destination.
        </p>

        <div className='flex flex-col gap-3'>
          <Link href='/'>
            <Button className='btn-primary w-full h-12 gap-2 text-sm font-bold rounded-xl'>
              <Home className='h-4 w-4' />
              Return Home
            </Button>
          </Link>
          <Button
            onClick={() => window.history.back()}
            variant='outline'
            className='w-full h-12 gap-2 text-sm border-white/10 hover:bg-white/5 font-bold rounded-xl'>
            <ArrowLeft className='h-4 w-4' />
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  );
}
