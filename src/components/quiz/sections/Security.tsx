'use client';

import type {Quiz} from "@/app/(main)/quiz";
import {Button} from "@/components/ui/button";
import {EyeOff, Lock, ShieldCheck} from "lucide-react";

export default function Security({
  quiz,
    setShowSecurityProtocol,
    setShowDetails,
  startAssessment,
}: {
  quiz: Quiz | null;
  setShowSecurityProtocol: (v: boolean) => void;
  setShowDetails: (v: boolean) => void;
        startAssessment: () => void;
}) {
  return (
    <div
      key='inner-security-view'
      className='container relative z-10 mx-auto px-5 py-5 max-w-xl text-center flex-1 flex flex-col justify-center'>
      <div className='sm:bg-pw-primary/5 sm:p-6 sm:rounded-[2.5rem] sm:border sm:border-pw-primary/20 space-y-6 sm:glass sm:bkblur'>
        <div className='flex flex-col items-center gap-4 mt-2'>
          <ShieldCheck className='h-16 w-16 text-pw-primary animate-pulse' />
          <div className='text-center'>
            <h3 className='text-xl sm:text-2xl font-bold'>Security Protocol</h3>
            <p className='text-xs text-pw-muted uppercase font-bold tracking-[0.2em] mt-1'>
              Active Monitoring Enabled
            </p>
          </div>
        </div>

        <div className='divider' />

        <div className='space-y-4 sm:space-y-6 text-left text-xs sm:text-sm leading-relaxed'>
          <div className='flex gap-4 p-2 px-4 lg:p-4 bg-white/5 rounded-2xl border border-white/5 items-center bkblur'>
            <EyeOff className='h-6 w-6 text-pw-primary shrink-0' />
            <p>
              <span className='font-bold text-pw-text'>Tab-Lock System:</span>{' '}
              Leaving this window or switching tabs will trigger a violation. 2
              violations result in immediate submission.
            </p>
          </div>
          <div className='flex gap-4 p-2 px-4 lg:p-4 bg-white/5 rounded-2xl border border-white/5 items-center bkblur'>
            <Lock className='h-6 w-6 text-pw-primary shrink-0' />
            <p>
              <span className='font-bold text-pw-text'>Privacy Lockdown:</span>{' '}
              Context menus, text selection, and clipboard actions are
              restricted for integrity.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setShowSecurityProtocol(false);

            if (quiz?.askDetails && quiz?.askDetails.length > 0) {
              setShowDetails(true);
            } else startAssessment();
          }}
          className='w-full btn-primary h-10 sm:h-12 text-lg font-bold shadow-2xl relative overflow-hidden group'>
          I UNDERSTAND & AGREE
        </Button>
      </div>
    </div>
  );
}