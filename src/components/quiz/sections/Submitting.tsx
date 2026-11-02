'use client';

import type {Quiz} from "@/app/(main)/quiz";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {useAppContext} from "@/context/AppContext";
import {capFirst, cn} from "@/lib/utils";
import {AlertTriangle, LoaderCircle} from "lucide-react";

export default function SubmittingPage({
  submissionRef,
  quiz,
  finalizeQuizAction,
  submissionFailed,
  submissionError,
  onStartFresh,
  isSubmitting,
}: {
  isSubmitting: boolean;
  submissionFailed: boolean;
  submissionError: string;
  onStartFresh: () => Promise<void>;
  quiz: Quiz | null;
  submissionRef: React.RefObject<{
    answers: any[];
    userData: Record<string, string>;
    questionIds: string[];
    reason: 'completion' | 'timeout' | 'self_submit' | 'violation';
    score: number;
    scorePossible: number;
    totalQuestions: number;
    branchHistory: Array<{
      fromQuestionId: string;
      targetQuestionId?: string;
      category?: string;
      questionIds: string[];
      at: string;
    }>;
    startedAt: string;
  } | null>;
  finalizeQuizAction: (
    finalAnswers: any[],
    submissionReason?: 'completion' | 'timeout' | 'self_submit' | 'violation',
  ) => Promise<void>;
}) {
  const { isOnline } = useAppContext();
  const retrySnapshot = submissionRef.current;
  return (
    <main className='relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-pw-bg px-4 py-8 text-white'>
      <div className='pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-pw-primary/20 blur-[10px]' />
      <div className='pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-pw-cyan/10 blur-[12px]' />
      <Card className='relative w-full max-w-xl overflow-hidden border-white/10 bg-pw-surface/50 p-0 rounded-xl shadow-2xl shadow-black/30 bkblur backdrop-blur-xl'>
        <div className='h-1 w-full bg-gradient-to-r from-pw-primary via-pw-cyan to-pw-primary' />
        <div className='space-y-4 p-6 text-center sm:p-9'>
          <div
            className={cn(
              'mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border mb-3',
              submissionFailed ?
                'border-pw-warning/30 bg-pw-warning/10'
              : 'border-pw-primary/30 bg-pw-primary/10',
            )}>
            {submissionFailed ?
              <AlertTriangle className='h-8 w-8 text-pw-warning' />
            : <LoaderCircle className='h-8 w-8 animate-spin text-pw-primary' />}
          </div>
          <div>
            <p className='text-[10px] font-bold uppercase tracking-[.22em] text-pw-cyan'>
              {capFirst(quiz?.type || 'Assessment')} · secure submission
            </p>
            <h1 className='mt-2 text-2xl font-extrabold tracking-tight'>
              {submissionFailed ?
                'Your response is still here'
              : 'Saving your response'}
            </h1>
            <p className='mx-auto mt-2 max-w-sm text-sm leading-relaxed text-pw-muted'>
              {submissionFailed ?
                isOnline ?
                  'Your answers are locked. Check your connection, then retry the save.'
                : 'You are offline. Your answers are locked and unchanged. Reconnect to retry the save.'

              : 'We’re securing your answers and confirming the submission. Please keep this page open.'
              }
            </p>
            {submissionFailed && submissionError && (
              <p role='status' className='mx-auto mt-2 max-w-md text-xs text-pw-warning'>
                {submissionError}
              </p>
            )}
          </div>
          {!submissionFailed && (
            <div className='mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs text-pw-muted mt-2'>
              <span className='h-2 w-2 animate-pulse rounded-full bg-pw-cyan' />
              Submission in progress
            </div>
          )}
          {submissionFailed && retrySnapshot && (
            <div className='space-y-2'>
              <Button
                onClick={() => {
                  void finalizeQuizAction(retrySnapshot.answers, retrySnapshot.reason);
                }}
                disabled={isSubmitting}
                className='btn-primary w-full rounded-xl py-5'>
                {isSubmitting ?
                  <>
                    <LoaderCircle className='mr-2 h-4 w-4 animate-spin' />
                    Saving...
                  </>
                : 'Retry save'}
              </Button>
              {submissionError.includes('expired and was removed after 24 hours') && (
                <Button
                  variant='outline'
                  disabled={isSubmitting}
                  onClick={() => void onStartFresh()}
                  className='w-full rounded-xl border-white/15 bg-white/5 py-5 text-white hover:bg-white/10'>
                  Start a new attempt
                </Button>
              )}
            </div>
          )}
          <p className='text-[11px] text-pw-muted/80'>
            Your answers are frozen while we confirm this submission.
          </p>
        </div>
      </Card>
    </main>
  );
}
