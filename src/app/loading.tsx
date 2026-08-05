'use client';

import Image from 'next/image';

export default function Loading() {
  return (
    <div className='min-h-screen bg-[#0A0C1B] flex flex-col items-center justify-center p-6 font-body relative overflow-hidden'>
      {/* Background gradients */}

      <div className='absolute -top-35 -left-40 w-100 h-100 bg-pw-primary/10 rounded-full blur-[50px]' />
      <div className='absolute -bottom-40 -right-40 w-100 h-100 bg-pw-cyan/8 rounded-full blur-[45px]' />

      <div className='flex flex-col items-center space-y-6 relative z-10'>
        {/* Static branding logo with high fidelity, not spinning */}
        <div className='w-16 h-16 rounded-3xl bg-white/5 border border-white/10 p-2.5 flex items-center justify-center shadow-2xl backdrop-blur-xl relative'>
          <Image
            width={44}
            height={44}
            src='/images/logo.png'
            alt='Ping World Logo'
            className='object-contain h-11 w-11'
          />
          <span className='absolute inset-0 rounded-3xl border-2 border-pw-primary/40 animate-ping opacity-25' />
        </div>

        {/* Pulsing loading state & custom progress dot sequence */}
        <div className='text-center space-y-2'>
          <h2 className='text-md font-bold font-display tracking-widest text-white uppercase'>
            Loading <span className='gradient-text'>Ping World...</span>
          </h2>
          <div className='flex items-center justify-center gap-1.5 pt-1'>
            <span className='w-2 h-2 rounded-full bg-pw-primary animate-bounce [animation-delay:-0.3s]' />
            <span className='w-2 h-2 rounded-full bg-pw-secondary animate-bounce [animation-delay:-0.15s]' />
            <span className='w-2 h-2 rounded-full bg-pw-primary animate-bounce' />
          </div>
        </div>
      </div>
    </div>
  );
}
