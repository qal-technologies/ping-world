'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { LoaderCircle, LockKeyhole, RotateCw, WifiOff } from 'lucide-react';
import Image from 'next/image';
import { useAppFileViewer } from '@/components/shared/AppFileViewer';

type PublicOption = { id?: string; text?: string; explanation?: string };
type PublicQuestion = {
  id: string;
  text?: string;
  category?: string;
  imageUrl?: string;
  options?: PublicOption[];
  correctExplanation?: string;
};
type PublicAnswer = {
  questionId: string;
  answer?: unknown;
  answerHistory?: PublicAnswer[];
  passed?: boolean;
  fileUrl?: string;
  fileName?: string;
  correct?: boolean;
  questionSnapshot?: PublicQuestion;
};
type PublicResponse = {
  timestamp?: string;
  score?: number;
  totalQuestions?: number;
  answeredQuestions?: number;
  scorePossible?: number;
  branchHistory?: Array<{ fromQuestionId: string; category?: string; questionIds?: string[] }>;
  userData?: Record<string, unknown>;
  pathQuestionSnapshots?: PublicQuestion[];
  answers?: PublicAnswer[];
  signedUser?: { displayName?: string; username?: string } | null;
};

export default function PublicQuizResponseView({
  publicId,
}: {
  publicId: string;
}) {
  const searchParams = useSearchParams();
  const responseId = searchParams.get('responseId') || '';
  const [response, setResponse] = useState<PublicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [isNetworkFailure, setIsNetworkFailure] = useState(false);
  const { openFile } = useAppFileViewer();

  const cacheKey = `pingwrld_response_${publicId}_${responseId}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setIsNetworkFailure(false);

    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOffline(!online);

    let cachedData: PublicResponse | null = null;
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        cachedData = JSON.parse(stored);
      }
    } catch {}

    if (!online && cachedData) {
      setResponse(cachedData);
      setIsCached(true);
      setLoading(false);
      return;
    }

    try {
      const result = await fetch(
        `/api/public/quiz-response/${encodeURIComponent(publicId)}?responseId=${encodeURIComponent(responseId)}`,
        { cache: 'no-store' },
      );
      const body = await result.json().catch(() => null);
      if (!result.ok) {
        throw new Error(
          body?.error || 'This response is private or unavailable.',
        );
      }
      setResponse(body.response);
      setIsCached(false);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(body.response));
      } catch {}
    } catch (reason: any) {
      const isNet =
        !navigator.onLine ||
        reason instanceof TypeError ||
        reason?.message?.includes('fetch') ||
        reason?.message?.includes('network');

      if (isNet) {
        setIsNetworkFailure(true);
        if (cachedData) {
          setResponse(cachedData);
          setIsCached(true);
        } else {
          setError(
            'Unable to connect to PingWorld. Please check your internet connection.',
          );
        }
      } else {
        setError(
          reason instanceof Error ?
            reason.message
          : 'Response could not be loaded.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [publicId, responseId, cacheKey]);

  useEffect(() => {
    loadData();

    const handleOnline = () => {
      setIsOffline(false);
      loadData();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadData]);

  if (loading)
    return (
      <main className='flex min-h-[100dvh] items-center justify-center gap-3 text-sm text-pw-muted'>
        <LoaderCircle className='h-5 w-5 animate-spin' />
        Loading response…
      </main>
    );

  if (!response) {
    if (isOffline || isNetworkFailure) {
      return (
        <main className='mx-auto flex min-h-[100dvh] max-w-xl items-center justify-center px-4'>
          <Card className='w-full border-amber-500/30 bg-pw-surface/90 p-6 text-center'>
            <WifiOff className='mx-auto mb-3 h-8 w-8 text-amber-400' />
            <h1 className='text-lg font-bold text-pw-text'>Network Connection Lost</h1>
            <p className='mt-2 text-sm text-pw-muted'>
              {error || 'Unable to load this assessment response because you are currently offline.'}
            </p>
            <button
              type='button'
              onClick={() => loadData()}
              className='mt-4 inline-flex items-center gap-2 rounded-xl bg-pw-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-pw-primary/90'
            >
              <RotateCw className='h-4 w-4' />
              Try Again
            </button>
          </Card>
        </main>
      );
    }
    return (
      <main className='mx-auto flex min-h-[100dvh] max-w-xl items-center justify-center px-4'>
        <Card className='w-full p-6 py-10 text-center'>
          <LockKeyhole className='mx-auto mb-4 h-10 w-10 text-pw-primary' />
          <h1 className='font-bold mt-2'>Responses unavailable</h1>
          <p className='text-sm text-pw-muted'>
            {error || 'This link may have been disabled.'}
          </p>
        </Card>
      </main>
    );
  }


  const answers = new Map<string, PublicAnswer>(
    (response.answers || []).map((answer) => [
      String(answer.questionId),
      answer,
    ]),
  );
  const questions =
    Array.isArray(response.pathQuestionSnapshots) ?
      response.pathQuestionSnapshots
    : [];
  const label = (
    answer: PublicAnswer | undefined,
    question: PublicQuestion,
  ) => {
    if (!answer) return 'No answer recorded';
    if (answer.passed) return 'Skipped';
    if (answer.fileUrl) return answer.fileName || 'Uploaded file';
    const values =
      Array.isArray(answer.answer) ? answer.answer : [answer.answer];
    return (
      values
        .map(
          (value) =>
            question.options?.find(
              (option, index) =>
                String(option.id ?? index) === String(value) ||
                String(index) === String(value),
            )?.text ?? String(value ?? ''),
        )
        .filter(Boolean)
        .join(', ') || 'No answer recorded'
    );
  };
  return (
    <main className='mx-auto min-h-[70dvh] w-full max-w-4xl space-y-3 px-2 py-8'>
      {(isOffline || isCached) && (
        <div className='flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200'>
          <div className='flex items-center gap-2'>
            <WifiOff className='h-4 w-4 shrink-0 text-amber-400' />
            <span>
              {isOffline
                ? 'You are offline. Showing locally saved response data.'
                : 'Showing locally cached response data.'}
            </span>
          </div>
          <button
            type='button'
            onClick={() => loadData()}
            className='inline-flex items-center gap-1.5 font-semibold text-amber-300 underline hover:text-amber-100'
          >
            <RotateCw className='h-3.5 w-3.5' />
            Refresh
          </button>
        </div>
      )}
      <Card className='border-white/10 bg-pw-surface/70 gap-1 p-2 sm:p-4'>
        <p className='text-xs font-bold uppercase tracking-widest text-pw-primary'>
          PingWorld · shared response
        </p>
        <h1 className='mt-2 text-2xl font-extrabold'>Assessment response</h1>
        {response.signedUser && !Object.entries(response.userData || {}).some(([key, value]) =>
          !['categoryScores','submissionReason','assessmentType','isSignedUser','signedUser','currentPathQuestionIds','pathQuestionSnapshots','branchHistory','attemptTokenHash','deviceKeyHash','attemptId','attemptToken','deviceKey'].includes(key) &&
          (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') && String(value).trim().length > 0
        ) && (
          <p className='text-sm text-pw-muted'>
            {response.signedUser.displayName || response.signedUser.username} ·
            signed user
          </p>
        )}
        <div className='my-3 flex flex-wrap gap-x-6 gap-y-2 text-sm'>
          <p>
            <b>Score:</b> {response.score ?? 0} /{' '}
            {response.scorePossible ?? response.totalQuestions ?? 0}
          </p>
          <p>
            <b>Questions:</b> {response.answeredQuestions === response.totalQuestions? `Attempted all ${response.totalQuestions} questions.` : `${response.answeredQuestions ?? 0} attempted out of ${response.totalQuestions ?? 0}`}
          </p>
          <p>
            <b>Submitted:</b>{' '}
            {response.timestamp ?
              new Date(response.timestamp).toLocaleString()
            : 'Unavailable'}
          </p>
        </div>
        {Object.entries(response.userData || {}).filter(([key, value]) => !['categoryScores','submissionReason','assessmentType','isSignedUser','signedUser','currentPathQuestionIds','pathQuestionSnapshots','branchHistory','attemptTokenHash','deviceKeyHash','attemptId','deviceKey'].includes(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')).length > 0 && <section className='mt-3 grid grid-cols-1 gap-1 border-t border-white/10 pt-3 sm:grid-cols-2'><h2 className='col-span-full text-sm font-semibold'>Participant details</h2>{Object.entries(response.userData || {}).filter(([key, value]) => !['categoryScores','submissionReason','assessmentType','isSignedUser','signedUser','currentPathQuestionIds','pathQuestionSnapshots','branchHistory','attemptTokenHash','deviceKeyHash','attemptId','deviceKey'].includes(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')).map(([key, value]) => <p key={key} className='text-xs text-pw-muted'><b>{key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase())}:</b> {String(value)}</p>)}</section>}
        {(response.branchHistory || []).length > 0 && <section className='mt-3 border-t border-white/10 pt-3'><h2 className='text-sm font-semibold'>Branch path</h2><ol className='mt-1 space-y-1 text-xs text-pw-muted'>{response.branchHistory!.map((branch, index) => { const triggerIndex = questions.findIndex((item) => String(item.id) === String(branch.fromQuestionId)); const branchNums = (branch.questionIds || []).map((id) => questions.findIndex((item) => String(item.id) === String(id)) + 1).filter((number) => number > 0); return <li key={`${branch.fromQuestionId}-${index}`}>Question {triggerIndex >= 0 ? triggerIndex + 1 : index + 1} → {branch.category ? `Group: ${branch.category}` : 'General flow'} · Questions {branchNums.length ? branchNums.join(', ') : branch.questionIds?.length || 0}</li>; })}</ol></section>}
      </Card>
      <section className='space-y-1'>
        {questions.map((question: PublicQuestion, index: number) => {
          const answer = answers.get(String(question.id));
          return (
            <Card
              key={`${question.id}-${index}`}
              className='space-y-1 border-white/10 bg-white/[0.03] ml-1 gap-1 p-2 sm:p-4'>
              <h2 className='text-sm font-bold mb-1'>
                {index + 1}. {question.text || 'Question'}
                {question.category ? <span className='ml-1 font-normal text-pw-muted'>({question.category})</span> : null}
              </h2>
              {question.imageUrl && (
                <Image
                  src={question.imageUrl}
                  alt='Question attachment'
                  width={1024}
                  height={768}
                  unoptimized
                  draggable={false}
                  onContextMenu={(event) => event.preventDefault()}
                  className='max-h-64 max-w-full select-none rounded-xl object-contain'
                />
              )}
              {(
                Array.isArray(answer?.answerHistory) &&
                answer.answerHistory.length > 0
              ) ?
                <div className='space-y-1 text-sm text-pw-text'>
                  {[...answer.answerHistory, answer].map(
                    (revision, revisionIndex) => (
                      <p key={revisionIndex}>
                        <span className='text-pw-muted'>
                          ({revisionIndex + 1}){' '}
                        </span>
                        {label(revision, question)}
                      </p>
                    ),
                  )}
                </div>
              : <p className='text-sm text-pw-text'>
                  <span className='text-pw-muted'>Answer: </span>
                  {label(answer, question)}
                </p>
              }
              {answer?.fileUrl && (
                <button type='button' onClick={() => openFile({ src: answer.fileUrl!, name: answer.fileName || 'Response upload', canDownload: true })} className='text-sm text-pw-cyan underline'>
                  Preview uploaded file
                </button>
              )}
              {answer?.correct === true && (
                <span className='text-xs font-semibold text-pw-success'>
                  Correct
                </span>
              )}
              {answer?.correct === false && (
                <span className='text-xs font-semibold text-pw-danger'>
                  Incorrect
                </span>
              )}
              {question.correctExplanation && (
                <p className='whitespace-pre-wrap text-xs text-pw-cyan'>
                  {question.correctExplanation}
                </p>
              )}
              <div className='mt-1'>
                {question.options && <p>Options:</p>}
              {question.options?.map((option, optionIndex) => (
                <p
                  key={option.id || optionIndex}
                  className='text-xs text-pw-muted'>
                  {optionIndex + 1}. {option.text}
                  {option.explanation ? ` · ${option.explanation}` : ''}
                </p>
              ))}
              </div>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
