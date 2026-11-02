'use client';

import type { Quiz } from '@/app/(main)/quiz';
import { Button } from '@/components/ui/button';
import { unpackPingWorldMediaUrl } from '@/lib/quiz/quiz-piping';
import { Brain, Info, Lock, MessageCircle, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function IntroSection({
  quiz,
  formatDetailVarsAction,
  authRequired,
  setDetailsCollected,
  setShowSecurityProtocol,
  setShowDetails,
  setShowIntro,
  setShowReportModal,
  dismissedQuizInfo,
  setDismissedQuizInfo,
  startAssessment,
}: {
  quiz: Quiz | null;
  formatDetailVarsAction: (
    rawText: string,
    contextOverride?: Record<string, any>,
  ) => string;
  authRequired: boolean;
  setShowSecurityProtocol: (v: boolean) => void;
  setDetailsCollected: (v: boolean) => void;
  setShowDetails: (v: boolean) => void;
  setShowIntro: (v: boolean) => void;
  setShowReportModal: (v: boolean) => void;
  dismissedQuizInfo: boolean;
  setDismissedQuizInfo: (v: boolean) => void;
  startAssessment: () => void;
}) {
  return (
    <div
      key='inner-intro-view'
      className='container mx-auto px-6 py-20 max-w-2xl text-center flex-1 flex flex-col justify-center relative z-10'>
      <div className='relative z-10'>
        {(quiz?.fromPremium && quiz?.info && !dismissedQuizInfo) && (
          <div className='flex items-start justify-between gap-2.5 p-3 rounded-2xl bg-pw-primary/10 border border-pw-primary/20 text-xs text-pw-text/90 mb-6 text-left w-full max-w-sm mx-auto'>
            <Info className='w-4 h-4 text-pw-primary shrink-0 mt-0.5' />
            <span
              className='flex-1 whitespace-pre-wrap'
              dangerouslySetInnerHTML={{
                __html: formatDetailVarsAction(quiz.info || ''),
              }}
            />
            <button type='button' aria-label='Dismiss information' onClick={() => setDismissedQuizInfo(true)} className='p-1 text-pw-muted hover:text-white' title='Dismiss information'>
              <X className='w-4 h-4' />
            </button>
          </div>
        )}
        {/* Show clear foreground image/logo if configured */}
        {quiz?.fromPremium && quiz?.branding?.icon ?
          <Image
            src={
              unpackPingWorldMediaUrl(quiz.branding.icon).url ||
              quiz.branding.icon
            }
            width={240}
            height={240}
            unoptimized
            alt='Intro Logo'
            className='h-20 w-20 object-contain rounded-2xl mb-4 mx-auto border-1 border-white/10 shadow-2xl bg-black/40 bkblur'
          />
        : <div className='flex justify-center mb-6 text-pw-primary'>
            {quiz?.type === 'quiz' ?
              <Brain size={60} />
            : <MessageCircle size={60} />}
          </div>
        }
        <h1 className='text-2xl sm:text-4xl font-extrabold font-display mb-4 tracking-tight whitespace-pre-wrap'>
          <span
            dangerouslySetInnerHTML={{
              __html: formatDetailVarsAction(quiz?.title?.toUpperCase() || ''),
            }}
          />
        </h1>
        <p
          className='text-pw-muted leading-relaxed mb-10 max-h-[300px] text-xs overflow-auto px-2 whitespace-pre-wrap'
          dangerouslySetInnerHTML={{
            __html: formatDetailVarsAction(quiz?.description || ''),
          }}
        />

      </div>

      <div className='max-w-sm mx-auto w-full relative z-10'>
        {authRequired ?
          <div
            key='inner-auth-view'
            className='bg-pw-danger/5 p-2 py-3 rounded-2xl border border-pw-danger/20 space-y-6'>
            <Lock className='h-12 w-12 text-pw-danger mx-auto mt-10' />
            <h3 className='text-xl font-bold'>Authentication Required</h3>
            <p className='text-sm text-white/70 '>
              You'll have to login or sign up for us to be able to track the
              information and answers from the {quiz?.type}.
            </p>
            <Link
              href='/login'
              className='btn-primary h-10 flex items-center justify-center font-bold mt-2'>
              Sign In
            </Link>
          </div>
        : <Button
            className='w-full btn-primary h-10 text-lg font-bold shadow-xl shadow-pw-primary/20 transition-all hover:scale-105 active:scale-95'
            onClick={() => {
              if (quiz?.enforceSecurity!) {
                setShowSecurityProtocol(true);
              } else if (quiz?.askDetails && quiz?.askDetails.length > 0) {
                setDetailsCollected(false);
                setShowDetails(true);
                setShowSecurityProtocol(false);
              } else startAssessment();
              setShowIntro(false);
            }}>
            CONTINUE
          </Button>
        }
      </div>

      {/* Terms disclaimer & Reporting Flow */}
      <div className='text-pw-muted leading-relaxed z-10 pb-4 fixed bottom-0 sm:bottom-1 w-[95%] self-center max-w-2xl'>
        <div className='divider mb-4 mt-10' />
        <p className='mb-1 text-[10px] flex flex-col text-pw-muted/80'>
          PingWorld is only a service provider hosting this{' '}
          {quiz?.type ?? 'assessment'}.
          <span>
            We are not responsible for any questions, responses, or
            outcomes generated in this {quiz?.type ?? 'assessment'}.
          </span>
        </p>
        <button
          onClick={() => setShowReportModal(true)}
          className='text-pw-danger text-[10px] hover:underline transition-colors font-bold tracking-wide'>
          Report this {quiz?.type ?? 'assessment'} for investigation or takedown
        </button>
      </div>
    </div>
  );
}
