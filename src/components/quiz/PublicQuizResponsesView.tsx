'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle, LockKeyhole, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAppFileViewer } from '@/components/shared/AppFileViewer';

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
  correctExplanation?: string;
  options?: Array<{ id?: string; text?: string }>;
};
type SharedResponse = {
  id: string;
  timestamp?: string;
  score?: number;
  totalQuestions?: number;
  scorePossible?: number;
  branchHistory?: Array<{ fromQuestionId: string; category?: string; questionIds?: string[] }>;
  answeredQuestions?: number;
  userData?: Record<string, unknown>;
  signedUser?: { displayName?: string; username?: string } | null;
  pathQuestionSnapshots?: SharedQuestion[];
  answers?: SharedAnswer[];
};
type SharedPayload = {
  quiz?: { title?: string };
  responses: SharedResponse[];
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
  const { openFile } = useAppFileViewer();
  useEffect(() => {
    let active = true;
    void fetch(`/api/public/quiz-responses/${encodeURIComponent(publicId)}`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(
            body?.error || 'This response page is private or unavailable.',
          );
        if (active) setData(body);
      })
      .catch(
        (reason) =>
          active &&
          setError(
            reason instanceof Error ?
              reason.message
            : 'Responses could not be loaded.',
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [publicId]);
  const loadMore = async () => {
    if (!data?.nextOffset || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetch(
        `/api/public/quiz-responses/${encodeURIComponent(publicId)}?offset=${data.nextOffset}`,
        { cache: 'no-store' },
      );
      const page = await result.json().catch(() => null);
      if (!result.ok || !page)
        throw new Error(page?.error || 'Could not load more responses.');
      setData((current) =>
        current ?
          {
            ...current,
            responses: [...current.responses, ...(page.responses || [])],
            nextOffset: page.nextOffset ?? null,
          }
        : current,
      );
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
  if (!data)
    return (
      <main className='mx-auto flex min-h-[100dvh] max-w-xl items-center justify-center px-4'>
        <Card className='w-full p-6 text-center'>
          <LockKeyhole className='mx-auto mb-3 h-7 w-7 text-pw-muted' />
          <h1 className='font-bold'>Responses unavailable</h1>
          <p className='mt-2 text-sm text-pw-muted'>
            {error || 'This link may have been disabled.'}
          </p>
        </Card>
      </main>
    );
  return (
    <main className='mx-auto min-h-[70dvh] w-full max-w-4xl space-y-2 px-3 py-8'>
      <Card className='border-white/10 bg-pw-surface/70 p-2 sm:p-4 mb-2'>
        <p className='text-xs font-bold uppercase tracking-widest text-pw-primary'>
          PingWorld · shared assessment responses
        </p>
        <h1 className='mt-2 text-2xl font-extrabold'>
          {data.quiz?.title || 'Assessment responses'}
        </h1>
        <p className='text-sm text-pw-muted'>
          {data.responses.length} response
          {data.responses.length === 1 ? '' : 's'} shared by the setter.
        </p>
      </Card>
      {data.responses.length === 0 ?
        <Card className='p-6 text-sm text-pw-muted'>
          No responses have been shared yet.
        </Card>
      : data.responses.map((response, index) => (
          <Card
            key={response.id}
            className='space-y-3 border-white/10 bg-white/[0.03] p-4 sm:p-5'>
            <div className='flex flex-wrap items-start justify-between gap-1'>
              <div className='mb-1'>
                <h2 className='font-bold'>
                  Taker {data.responses.length - index}
                  {response.signedUser ?
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
            {Object.entries(response.userData || {}).filter(([key, value]) => !['categoryScores','submissionReason','assessmentType','isSignedUser','signedUser','currentPathQuestionIds','pathQuestionSnapshots','branchHistory','attemptTokenHash','deviceKeyHash'].includes(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')).length > 0 && <section className='grid grid-cols-1 gap-1 border-t border-white/10 pt-2 sm:grid-cols-2'><h3 className='col-span-full text-xs font-semibold text-pw-text'>Participant details</h3>{Object.entries(response.userData || {}).filter(([key, value]) => !['categoryScores','submissionReason','assessmentType','isSignedUser','signedUser','currentPathQuestionIds','pathQuestionSnapshots','branchHistory','attemptTokenHash','deviceKeyHash'].includes(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')).map(([key, value]) => <p key={key} className='text-xs text-pw-muted'><b>{key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase())}:</b> {String(value)}</p>)}</section>}
            {(response.branchHistory || []).length > 0 && <section className='border-t border-white/10 pt-2'><h3 className='text-xs font-semibold'>Branch path</h3><ol className='mt-1 space-y-1 text-xs text-pw-muted'>{response.branchHistory!.map((branch, branchIndex) => { const pathQuestions = response.pathQuestionSnapshots || []; const triggerIndex = pathQuestions.findIndex((question) => String(question.id) === String(branch.fromQuestionId)); const branchNums = (branch.questionIds || []).map((id) => pathQuestions.findIndex((question) => String(question.id) === String(id)) + 1).filter((number) => number > 0); return <li key={`${branch.fromQuestionId}-${branchIndex}`}>Question {triggerIndex >= 0 ? triggerIndex + 1 : branchIndex + 1} → {branch.category ? `Group: ${branch.category}` : 'General flow'} · Questions {branchNums.length ? branchNums.join(', ') : branch.questionIds?.length || 0}</li>; })}</ol></section>}
          
          {(response?.pathQuestionSnapshots|| [])?.length > 0 && <div className='divider my-4' />}
          
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
                    className='w-full pl-2'>
                    <p className='text-sm font-semibold'>
                      {questionIndex + 1}. {question.text || 'Question'}
                    </p>
                    {answer?.fileUrl ?
                      <p className='mt-1 text-sm'>
                        <span className='text-pw-muted'>Answer: </span>
                        <button type='button' onClick={() => openFile({ src: answer.fileUrl!, name: answer.fileName || 'Response upload', canDownload: true })} className='text-pw-cyan underline'>
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
