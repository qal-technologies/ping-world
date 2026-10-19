'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import Image from 'next/image';
import { useAppFileViewer } from '@/components/shared/AppFileViewer';

type PublicOption = { id?: string; text?: string; explanation?: string };
type PublicQuestion = {
  id: string;
  text?: string;
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
  const { openFile } = useAppFileViewer();
  useEffect(() => {
    let alive = true;
    void fetch(
      `/api/public/quiz-response/${encodeURIComponent(publicId)}?responseId=${encodeURIComponent(responseId)}`,
      { cache: 'no-store' },
    )
      .then(async (result) => {
        const body = await result.json().catch(() => null);
        if (!result.ok)
          throw new Error(
            body?.error || 'This response is private or unavailable.',
          );
        if (alive) setResponse(body.response);
      })
      .catch(
        (reason) =>
          alive &&
          setError(
            reason instanceof Error ?
              reason.message
            : 'Response could not be loaded.',
          ),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [publicId, responseId]);

  if (loading)
    return (
      <main className='flex min-h-[100dvh] items-center justify-center gap-3 text-sm text-pw-muted'>
        <LoaderCircle className='h-5 w-5 animate-spin' />
        Loading response…
      </main>
    );
  if (!response)
    return (
      <main className='mx-auto flex min-h-[100dvh] max-w-xl items-center justify-center px-2'>
        <Card className='w-full p-6 text-center'>
          <LockKeyhole className='mx-auto mb-3 h-7 w-7 text-pw-muted' />
          <h1 className='font-bold'>Response unavailable</h1>
          <p className='mt-2 text-sm text-pw-muted'>
            {error || 'This response link is no longer public.'}
          </p>
        </Card>
      </main>
    );

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
    <main className='mx-auto min-h-[70dvh] w-full max-w-4xl space-y-1 px-2 py-8'>
      <Card className='border-white/10 bg-pw-surface/70 p-2 sm:p-4'>
        <p className='text-xs font-bold uppercase tracking-widest text-pw-primary'>
          PingWorld · shared response
        </p>
        <h1 className='mt-2 text-2xl font-extrabold'>Assessment response</h1>
        {response.signedUser && (
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
              className='space-y-1 border-white/10 bg-white/[0.03] ml-1 p-2 sm:p-4'>
              <h2 className='text-sm font-bold mb-1'>
                {index + 1}. {question.text || 'Question'}
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
