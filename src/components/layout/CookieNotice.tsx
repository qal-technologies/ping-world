'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
      className='fixed bottom-3 left-3 z-[110] w-[min(26rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-slate-950/60 p-4 pt-5 text-white shadow-2xl backdrop-blur-xl'>
      <p className='text-sm font-semibold'>Essential cookies</p>
      <p className='mt-1 text-xs leading-relaxed text-white/70'>
        PingWorld uses a first-party device key to help track tools, protect assessment attempts and preserve integrity. No advertising cookies are used.
        {' '}<Link href='/privacy' className='underline underline-offset-2'>Our Privacy</Link>
      </p>
      <Button onClick={acknowledge} size='sm' className='mt-3 w-[70%] h-8 rounded-lg px-4 text-xs'>
        Accept
      </Button>
    </aside>
  );
}
