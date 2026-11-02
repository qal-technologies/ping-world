'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  LoaderCircle,
  LockKeyhole,
  RotateCw,
  WifiOff,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAppFileViewer } from '@/components/shared/AppFileViewer';
import {capFirst} from '@/lib/utils';

type SharedAnswer = {
  questionId: string;
  answer?: string | number | boolean | Array<string | number>;
  passed?: boolean;
  correct?: boolean;
  fileUrl?: string;
  fileName?: string;
};
type SharedQuestion = {
  id: string;
  text?: string;
  category?: string;
  correctExplanation?: string;
  options?: Array<{ id?: string; text?: string }>;
};
type SharedResponse = {
  id: string;
  timestamp?: string;
  score?: number;
  totalQuestions?: number;
  scorePossible?: number;
  branchHistory?: Array<{
    fromQuestionId: string;
    category?: string;
    questionIds?: string[];
  }>;
  answeredQuestions?: number;
  userData?: Record<string, unknown>;
  signedUser?: { displayName?: string; username?: string } | null;
  pathQuestionSnapshots?: SharedQuestion[];
  answers?: SharedAnswer[];
};
type SharedPayload = {
  quiz?: { title?: string };
  responses: SharedResponse[];
  totalCount?: number;
  nextOffset: number | null;
};

export default function PublicQuizResponsesView({
  publicId,
}: {
  publicId: string;
}) {
  const [data, setData] = useState<SharedPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [isNetworkFailure, setIsNetworkFailure] = useState(false);
  const { openFile } = useAppFileViewer();

  const cacheKey = `pingwrld_public_responses_${publicId}`;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError('');
    setIsNetworkFailure(false);

    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOffline(!online);

    let cachedData: SharedPayload | null = null;
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) cachedData = JSON.parse(stored);
    } catch {}

    if (!online && cachedData) {
      setData(cachedData);
      setIsCached(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/public/quiz-responses/${encodeURIComponent(publicId)}`,
        { cache: 'no-store' },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error || 'This response page is private or unavailable.',
        );
      }
      setData(body);
      setIsCached(false);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(body));
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
          setData(cachedData);
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
          : 'Responses could not be loaded.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [publicId, cacheKey]);

  useEffect(() => {
    loadInitial();

    const handleOnline = () => {
      setIsOffline(false);
      loadInitial();
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
  }, [loadInitial]);

  const loadMore = async () => {
    if (!data?.nextOffset || loadingMore) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Cannot load more responses while offline.');
      return;
    }
    setLoadingMore(true);
    try {
      const result = await fetch(
        `/api/public/quiz-responses/${encodeURIComponent(publicId)}?offset=${data.nextOffset}`,
        { cache: 'no-store' },
      );
      const page = await result.json().catch(() => null);
      if (!result.ok || !page)
        throw new Error(page?.error || 'Could not load more responses.');
      setData((current) => {
        if (!current) return current;
        const updated = {
          ...current,
          responses: [...current.responses, ...(page.responses || [])],
          totalCount: page.totalCount ?? current.totalCount,
          nextOffset: page.nextOffset ?? null,
        };
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } catch (reason) {
      setError(
        reason instanceof Error ?
          reason.message
        : 'Could not load more responses.',
      );
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading)
    return (
      <main className='flex min-h-[100dvh] items-center justify-center gap-3 text-sm text-pw-muted'>
        <LoaderCircle className='h-5 w-5 animate-spin' />
        Loading shared responses…
      </main>
    );

  if (!data) {
    if (isOffline || isNetworkFailure) {
      return (
        <main className='mx-auto flex min-h-[100dvh] max-w-xl items-center justify-center px-4'>
          <Card className='w-full border-amber-500/30 bg-pw-surface/90 p-6 text-center'>
            <WifiOff className='mx-auto mb-3 h-8 w-8 text-amber-400' />
            <h1 className='text-lg font-bold text-pw-text'>
              Network Connection Lost
            </h1>
            <p className='mt-2 text-sm text-pw-muted'>
              {error ||
                'Unable to load shared assessment responses because you are currently offline.'}
            </p>
            <button
              type='button'
              onClick={() => loadInitial()}
              className='mt-4 inline-flex items-center gap-2 rounded-xl bg-pw-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-pw-primary/90'>
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

  return (
    <main className='mx-auto min-h-[70dvh] w-full max-w-4xl space-y-3 px-3 py-8'>
      {(isOffline || isCached) && (
        <div className='flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200'>
          <div className='flex items-center gap-2'>
            <WifiOff className='h-4 w-4 shrink-0 text-amber-400' />
            <span>
              {isOffline ?
                'You are offline. Showing locally saved shared responses.'
              : 'Showing locally cached shared responses.'}
            </span>
          </div>
          <button
            type='button'
            onClick={() => loadInitial()}
            className='inline-flex items-center gap-1.5 font-semibold text-amber-300 underline hover:text-amber-100'>
            <RotateCw className='h-3.5 w-3.5' />
            Refresh
          </button>
        </div>
      )}

      <Card className='bg-transparent ring-0 p-1 gap-1 sm:p-2 mb-2'>
        <p className='text-xs font-bold uppercase tracking-widest text-pw-primary'>
          PingWorld · shared assessment responses
        </p>
        <h1 className='mt-2 text-2xl font-extrabold'>
          {data.quiz?.title || 'Assessment responses'}
        </h1>
        <p className='text-sm text-pw-muted'>
          {data.totalCount ?? data.responses.length} response
          {(data.totalCount ?? data.responses.length) === 1 ? '' : 's'} shared
          by the setter.
        </p>
      </Card>
      {data.responses.length === 0 ?
        <Card className='p-6 text-sm text-pw-muted'>
          No responses have been shared yet.
        </Card>
      : data.responses.map((response, index) => (
          <Card
            key={response.id}
            className='space-y-3 border-white/10 bg-white/[0.03] gap-2 p-4 sm:p-5'>
            <div className='flex flex-wrap items-start justify-between gap-1'>
              <div className='mb-1'>
                <h2 className='font-bold'>
                  Taker{' '}
                  {index + 1}
                  {response.signedUser && !Object.entries(response.userData || {}).some(([key, value]) =>
                    !['categoryScores','submissionReason','assessmentType','isSignedUser','signedUser','currentPathQuestionIds','pathQuestionSnapshots','branchHistory','attemptTokenHash','deviceKeyHash','attemptId','attemptToken','deviceKey'].includes(key) &&
                    (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') && String(value).trim().length > 0
                  ) ?
                    ` · ${response.signedUser.displayName || response.signedUser.username} (signed user)`
                  : ''}
                </h2>
                <p className='text-xs text-pw-muted'>
                  {response.timestamp ?
                    new Date(response.timestamp).toLocaleString()
                  : 'Submission time unavailable'}
                </p>
              </div>

              <div className='text-sm font-semibold mb-1'>
                Score {response.score ?? 0} /{' '}
                {response.scorePossible ?? response.totalQuestions ?? 0}
                <p className='text-xs font-normal text-pw-muted'>
                  {response.answeredQuestions ?? 0} attempted of{' '}
                  {response.totalQuestions ?? 0}
                </p>
              </div>
            </div>
            {Object.entries(response.userData || {}).filter(
              ([key, value]) =>
                ![
                  'categoryScores',
                  'submissionReason',
                  'assessmentType',
                  'isSignedUser',
                  'signedUser',
                  'currentPathQuestionIds',
                  'pathQuestionSnapshots',
                  'branchHistory',
                  'attemptTokenHash',
                  'deviceKeyHash',
                ].includes(key) &&
                (typeof value === 'string' ||
                  typeof value === 'number' ||
                  typeof value === 'boolean'),
            ).length > 0 && (
              <section className='grid grid-cols-1 gap-1 border-t border-white/10 pt-2 sm:grid-cols-2'>
                <h3 className='col-span-full text-xs font-semibold text-pw-text'>
                  Participant details
                </h3>
                {Object.entries(response.userData || {})
                  .filter(
                    ([key, value]) =>
                      ![
                        'categoryScores',
                        'submissionReason',
                        'assessmentType',
                        'isSignedUser',
                        'signedUser',
                        'currentPathQuestionIds',
                        'pathQuestionSnapshots',
                        'branchHistory',
                        'attemptTokenHash',
                        'deviceKeyHash',
                      ].includes(key) &&
                      (typeof value === 'string' ||
                        typeof value === 'number' ||
                        typeof value === 'boolean'),
                  )
                  .map(([key, value]) => (
                    <p
                      key={key}
                      className='text-xs text-pw-muted'>
                      <b>
                        {key
                          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                          .replace(/[_-]+/g, ' ')
                          .replace(/^./, (letter) => letter.toUpperCase())}
                        :
                      </b>{' '}
                      {String(value)}
                    </p>
                  ))}
              </section>
            )}
            {(response.branchHistory || []).length > 0 && (
              <section className='border-t border-white/10 pt-2'>
                <h3 className='text-xs font-semibold'>Branch path</h3>
                <ol className='mt-1 space-y-1 text-xs text-pw-muted'>
                  {response.branchHistory!.map((branch, branchIndex) => {
                    const pathQuestions = response.pathQuestionSnapshots || [];
                    const triggerIndex = pathQuestions.findIndex(
                      (question) =>
                        String(question.id) === String(branch.fromQuestionId),
                    );
                    const branchNums = (branch.questionIds || [])
                      .map(
                        (id) =>
                          pathQuestions.findIndex(
                            (question) => String(question.id) === String(id),
                          ) + 1,
                      )
                      .filter((number) => number > 0);
                    return (
                      <li key={`${branch.fromQuestionId}-${branchIndex}`}>
                        Question{' '}
                        {triggerIndex >= 0 ? triggerIndex + 1 : branchIndex + 1}{' '}
                        {branch.category &&
                          `(Group: ${capFirst(branch.category)})`
                        }{' '}

                        · Questions{' '}
                        {branchNums.length ?
                          branchNums.join(', ')
                        : branch.questionIds?.length || 0}
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {(response?.pathQuestionSnapshots || [])?.length > 0 && (
              <div className='divider my-4' />
            )}

            {(response.pathQuestionSnapshots || []).map(
              (question, questionIndex) => {
                const answer = (response.answers || []).find(
                  (item) => String(item.questionId) === String(question.id),
                );
                const selected =
                  Array.isArray(answer?.answer) ? answer.answer
                  : answer?.answer === undefined ? []
                  : [answer.answer];
                const values = selected.map(
                  (value) =>
                    question.options?.find(
                      (option, optionIndex) =>
                        String(option.id ?? optionIndex) === String(value) ||
                        String(optionIndex) === String(value),
                    )?.text ?? String(value),
                );
                return (
                  <div
                    key={`${question.id}-${questionIndex}`}
                    className='w-full pl-1'>
                    <p className='text-sm font-semibold'>
                      {questionIndex + 1}. {question.text || 'Question'}
                      {question.category ? <span className='ml-1 font-normal text-pw-muted'>({question.category})</span> : null}
                    </p>
                    {answer?.fileUrl ?
                      <p className='mt-1 text-sm'>
                        <span className='text-pw-muted'>Answer: </span>
                        <button
                          type='button'
                          onClick={() =>
                            openFile({
                              src: answer.fileUrl!,
                              name: answer.fileName || 'Response upload',
                              canDownload: true,
                            })
                          }
                          className='text-pw-cyan underline'>
                          {answer.fileName || 'Open uploaded file'}
                        </button>
                      </p>
                    : <p className='mt-1 whitespace-pre-wrap text-sm text-pw-muted'>
                        Answer:{' '}
                        {answer?.passed ?
                          'Skipped'
                        : values.join(', ') || 'No answer recorded'}
                      </p>
                    }
                    {typeof answer?.correct === 'boolean' && (
                      <p
                        className={
                          answer.correct ?
                            'mt-1 text-xs text-pw-success'
                          : 'mt-1 text-xs text-pw-danger'
                        }>
                        {answer.correct ? 'Correct' : 'Incorrect'}
                      </p>
                    )}
                    {question.correctExplanation && (
                      <p className='mt-2 whitespace-pre-wrap text-xs text-pw-cyan'>
                        {question.correctExplanation}
                      </p>
                    )}
                  </div>
                );
              },
            )}
          </Card>
        ))
      }
      {data.nextOffset !== null && (
        <button
          type='button'
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className='mx-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white disabled:opacity-60'>
          {loadingMore ?
            <LoaderCircle className='h-4 w-4 animate-spin' />
          : <ChevronDown className='h-4 w-4' />}
          {loadingMore ? 'Loading…' : 'Load more responses'}
        </button>
      )}
      {error && (
        <p
          role='status'
          className='text-center text-sm text-pw-danger'>
          {error}
        </p>
      )}
    </main>
  );
}
