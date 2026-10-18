'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle, LockKeyhole, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';

type SharedAnswer = { questionId: string; answer?: string | number | boolean | Array<string | number>; passed?: boolean; correct?: boolean; fileUrl?: string; fileName?: string };
type SharedQuestion = { id: string; text?: string; correctExplanation?: string; options?: Array<{ id?: string; text?: string }> };
type SharedResponse = { id: string; timestamp?: string; score?: number; totalQuestions?: number; scorePossible?: number; answeredQuestions?: number; userData?: Record<string, unknown>; signedUser?: { displayName?: string; username?: string } | null; pathQuestionSnapshots?: SharedQuestion[]; answers?: SharedAnswer[] };
type SharedPayload = { quiz?: { title?: string }; responses: SharedResponse[]; nextOffset: number | null };

export default function PublicQuizResponsesView({ publicId }: { publicId: string }) {
  const [data, setData] = useState<SharedPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch(`/api/public/quiz-responses/${encodeURIComponent(publicId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || 'This response page is private or unavailable.');
        if (active) setData(body);
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Responses could not be loaded.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [publicId]);
  const loadMore = async () => {
    if (!data?.nextOffset || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetch(`/api/public/quiz-responses/${encodeURIComponent(publicId)}?offset=${data.nextOffset}`, { cache: 'no-store' });
      const page = await result.json().catch(() => null);
      if (!result.ok || !page) throw new Error(page?.error || 'Could not load more responses.');
      setData((current) => current ? { ...current, responses: [...current.responses, ...(page.responses || [])], nextOffset: page.nextOffset ?? null } : current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load more responses.'); }
    finally { setLoadingMore(false); }
  };
  if (loading) return <main className='flex min-h-[70dvh] items-center justify-center gap-3 text-sm text-pw-muted'><LoaderCircle className='h-5 w-5 animate-spin' />Loading shared responses…</main>;
  if (!data) return <main className='mx-auto flex min-h-[70dvh] max-w-lg items-center justify-center px-4'><Card className='w-full p-6 text-center'><LockKeyhole className='mx-auto mb-3 h-7 w-7 text-pw-muted' /><h1 className='font-bold'>Responses unavailable</h1><p className='mt-2 text-sm text-pw-muted'>{error || 'This link may have been disabled.'}</p></Card></main>;
  return <main className='mx-auto min-h-[70dvh] w-full max-w-4xl space-y-4 px-4 py-8'>
    <Card className='border-white/10 bg-pw-surface/70 p-5 sm:p-7'><p className='text-xs font-bold uppercase tracking-widest text-pw-primary'>PingWorld · shared assessment responses</p><h1 className='mt-2 text-2xl font-extrabold'>{data.quiz?.title || 'Assessment responses'}</h1><p className='mt-1 text-sm text-pw-muted'>{data.responses.length} response{data.responses.length === 1 ? '' : 's'} shared by the setter.</p></Card>
    {data.responses.length === 0 ? <Card className='p-6 text-sm text-pw-muted'>No responses have been shared yet.</Card> : data.responses.map((response, index) => <Card key={response.id} className='space-y-3 border-white/10 bg-white/[0.03] p-4 sm:p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'><div><h2 className='font-bold'>Taker {data.responses.length - index}{response.signedUser ? ` · ${response.signedUser.displayName || response.signedUser.username} (signed user)` : ''}</h2><p className='text-xs text-pw-muted'>{response.timestamp ? new Date(response.timestamp).toLocaleString() : 'Submission time unavailable'}</p></div><div className='text-right text-sm font-semibold'>Score {response.score ?? 0} / {response.scorePossible ?? response.totalQuestions ?? 0}<p className='text-xs font-normal text-pw-muted'>{response.answeredQuestions ?? 0} attempted of {response.totalQuestions ?? 0}</p></div></div>
      {Object.entries(response.userData || {}).map(([key, value]) => <p key={key} className='text-xs text-pw-muted'><b>{key}:</b> {String(value)}</p>)}
      {(response.pathQuestionSnapshots || []).map((question, questionIndex) => {
        const answer = (response.answers || []).find((item) => String(item.questionId) === String(question.id));
        const selected = Array.isArray(answer?.answer) ? answer.answer : answer?.answer === undefined ? [] : [answer.answer];
        const values = selected.map((value) => question.options?.find((option, optionIndex) => String(option.id ?? optionIndex) === String(value) || String(optionIndex) === String(value))?.text ?? String(value));
        return <div key={`${question.id}-${questionIndex}`} className='rounded-xl border border-white/5 bg-black/10 p-3'><p className='text-sm font-semibold'>{questionIndex + 1}. {question.text || 'Question'}</p>
          {answer?.fileUrl ? <p className='mt-1 text-sm'><span className='text-pw-muted'>Answer: </span><a href={answer.fileUrl} target='_blank' rel='noreferrer' className='text-pw-cyan underline'>{answer.fileName || 'Open uploaded file'}</a></p> : <p className='mt-1 whitespace-pre-wrap text-sm text-pw-muted'>Answer: {answer?.passed ? 'Passed' : values.join(', ') || 'No answer recorded'}</p>}
          {typeof answer?.correct === 'boolean' && <p className={answer.correct ? 'mt-1 text-xs text-pw-success' : 'mt-1 text-xs text-pw-danger'}>{answer.correct ? 'Correct' : 'Incorrect'}</p>}
          {question.correctExplanation && <p className='mt-2 whitespace-pre-wrap text-xs text-pw-cyan'>{question.correctExplanation}</p>}</div>;
      })}
    </Card>)}
    {data.nextOffset !== null && <button type='button' onClick={() => void loadMore()} disabled={loadingMore} className='mx-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white disabled:opacity-60'>{loadingMore ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <ChevronDown className='h-4 w-4' />}{loadingMore ? 'Loading…' : 'Load more responses'}</button>}
    {error && <p role='status' className='text-center text-sm text-pw-danger'>{error}</p>}
  </main>;
}
