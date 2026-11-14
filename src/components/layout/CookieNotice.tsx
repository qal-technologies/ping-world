'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const NOTICE_COOKIE = 'pw_cookie_notice_v1';

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const acknowledged = document.cookie
      .split('; ')
      .some((cookie) => cookie.startsWith(`${NOTICE_COOKIE}=1`));
    const frame = window.requestAnimationFrame(() => {
      if (!acknowledged) setVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const acknowledge = () => {
    document.cookie = `${NOTICE_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <aside
      aria-label='Cookie notice'
      className='fixed bottom-3 left-3 z-[110] w-[min(26rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-slate-950/60 p-3 pt-3.5 text-white shadow-2xl backdrop-blur-xl'>
      <p className='text-sm font-semibold text-pw-primary'>Essential cookies</p>
      <button
        onClick={() => {
          setVisible(false);
        }}
        className='absolute top-2 right-2 bg-pw-primary/10 hover:bg-pw-primary/30 bkblur rounded-full p-1 grid place-items-center items-center'>
        <X className='w-3.5 h-3.5' />
      </button>

      <p className='mt-1 text-xs text-white/70'>
        PingWorld uses a first-party device key to help track tools, protect
        assessment attempts and preserve integrity. No advertising cookies are
        used.{' '}
      </p>

      <p className='flex gap-1 items-center text-xs leading-relaxed text-white/90 mt-3'>
        <Link
          href='/privacy'
          className='underline underline-offset-2 mr-1'>
          Privacy
        </Link>{' '}
        <Link
          href='/terms'
          className='underline underline-offset-2'>
          Terms
        </Link>
      </p>
      <Button
        onClick={acknowledge}
        size='sm'
        className='mt-1 w-[100%] max-w-[26rem] h-8 rounded-lg px-4 text-xs place-self-center'>
        Accept
      </Button>
    </aside>
  );
}
