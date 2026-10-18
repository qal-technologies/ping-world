'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import Image from 'next/image';

type PublicOption = { id?: string; text?: string; explanation?: string };
type PublicQuestion = { id: string; text?: string; imageUrl?: string; options?: PublicOption[]; correctExplanation?: string };
type PublicAnswer = { questionId: string; answer?: unknown; answerHistory?: PublicAnswer[]; passed?: boolean; fileUrl?: string; fileName?: string; correct?: boolean; questionSnapshot?: PublicQuestion };
type PublicResponse = { timestamp?: string; score?: number; totalQuestions?: number; answeredQuestions?: number; scorePossible?: number; userData?: Record<string, unknown>; pathQuestionSnapshots?: PublicQuestion[]; answers?: PublicAnswer[]; signedUser?: { displayName?: string; username?: string } | null };

export default function PublicQuizResponseView({ publicId }: { publicId: string }) {
  const searchParams = useSearchParams();
  const responseId = searchParams.get('responseId') || '';
  const [response, setResponse] = useState<PublicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    void fetch(`/api/public/quiz-response/${encodeURIComponent(publicId)}?responseId=${encodeURIComponent(responseId)}`, { cache: 'no-store' })
      .then(async (result) => {
        const body = await result.json().catch(() => null);
        if (!result.ok) throw new Error(body?.error || 'This response is private or unavailable.');
        if (alive) setResponse(body.response);
      })
      .catch((reason) => alive && setError(reason instanceof Error ? reason.message : 'Response could not be loaded.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [publicId, responseId]);

  if (loading) return <main className='flex min-h-[70dvh] items-center justify-center gap-3 text-sm text-pw-muted'><LoaderCircle className='h-5 w-5 animate-spin' />Loading response…</main>;
  if (!response) return <main className='mx-auto flex min-h-[70dvh] max-w-lg items-center justify-center px-4'><Card className='w-full p-6 text-center'><LockKeyhole className='mx-auto mb-3 h-7 w-7 text-pw-muted' /><h1 className='font-bold'>Response unavailable</h1><p className='mt-2 text-sm text-pw-muted'>{error || 'This response link is no longer public.'}</p></Card></main>;

  const answers = new Map<string, PublicAnswer>((response.answers || []).map((answer) => [String(answer.questionId), answer]));
  const questions = Array.isArray(response.pathQuestionSnapshots) ? response.pathQuestionSnapshots : [];
  const label = (answer: PublicAnswer | undefined, question: PublicQuestion) => {
    if (!answer) return 'No answer recorded';
    if (answer.passed) return 'Passed';
    if (answer.fileUrl) return answer.fileName || 'Uploaded file';
    const values = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
    return values.map((value) => question.options?.find((option, index) => String(option.id ?? index) === String(value) || String(index) === String(value))?.text ?? String(value ?? '')).filter(Boolean).join(', ') || 'No answer recorded';
  };
  return <main className='mx-auto min-h-[70dvh] w-full max-w-3xl space-y-4 px-4 py-8'>
    <Card className='border-white/10 bg-pw-surface/70 p-5 sm:p-7'>
      <p className='text-xs font-bold uppercase tracking-widest text-pw-primary'>PingWorld · shared response</p>
      <h1 className='mt-2 text-2xl font-extrabold'>Assessment response</h1>
      {response.signedUser && <p className='mt-1 text-sm text-pw-muted'>{response.signedUser.displayName || response.signedUser.username} · signed user</p>}
      <div className='mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm'><span><b>Score:</b> {response.score ?? 0} / {response.scorePossible ?? response.totalQuestions ?? 0}</span><span><b>Questions:</b> {response.answeredQuestions ?? 0} attempted / {response.totalQuestions ?? 0}</span><span><b>Submitted:</b> {response.timestamp ? new Date(response.timestamp).toLocaleString() : 'Unavailable'}</span></div>
      {Object.entries(response.userData || {}).map(([key, value]) => <p key={key} className='mt-2 text-xs text-pw-muted'><b>{key}:</b> {String(value)}</p>)}
    </Card>
    <section className='space-y-3'>
      {questions.map((question: PublicQuestion, index: number) => {
        const answer = answers.get(String(question.id));
        return <Card key={`${question.id}-${index}`} className='space-y-2 border-white/10 bg-white/[0.03] p-4'>
          <h2 className='text-sm font-bold'>{index + 1}. {question.text || 'Question'}</h2>
          {question.imageUrl && <Image src={question.imageUrl} alt='Question attachment' width={1024} height={768} unoptimized draggable={false} onContextMenu={(event) => event.preventDefault()} className='max-h-64 max-w-full select-none rounded-xl object-contain' />}
          {Array.isArray(answer?.answerHistory) && answer.answerHistory.length > 0 ? <div className='space-y-1 text-sm text-pw-text'>
            {[...answer.answerHistory, answer].map((revision, revisionIndex) => <p key={revisionIndex}><span className='text-pw-muted'>({revisionIndex + 1}) </span>{label(revision, question)}</p>)}
          </div> : <p className='text-sm text-pw-text'><span className='text-pw-muted'>Answer: </span>{label(answer, question)}</p>}
          {answer?.correct === true && <span className='text-xs font-semibold text-pw-success'>Correct</span>}
          {answer?.correct === false && <span className='text-xs font-semibold text-pw-danger'>Incorrect</span>}
          {question.correctExplanation && <p className='whitespace-pre-wrap text-xs text-pw-cyan'>{question.correctExplanation}</p>}
          {question.options?.map((option, optionIndex) => <p key={option.id || optionIndex} className='text-xs text-pw-muted'>{option.text}{option.explanation ? ` · ${option.explanation}` : ''}</p>)}
        </Card>;
      })}
    </section>
  </main>;
}
