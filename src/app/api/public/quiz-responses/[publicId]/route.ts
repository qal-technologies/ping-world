import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  if (isRateLimited(getClientIp(request), 'api:public-quiz-responses', 20, 60_000).limited) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const { publicId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(publicId)) return NextResponse.json({ error: 'Responses not found.' }, { status: 404 });
  try {
    const admin = getSupabaseAdmin();
    const { data: quiz, error } = await admin.from('quizzes').select('id,title,type,description,settings').eq('settings->>publicResponsesId', publicId).maybeSingle();
    if (error || !quiz) return NextResponse.json({ error: 'Responses not found.' }, { status: 404 });
    const offset = Math.max(0, Math.min(Number(request.nextUrl.searchParams.get('offset')) || 0, 4_950));
    const { data: rows, error: responseError, count } = await admin.from('quiz_responses').select('id,timestamp,score,total_questions,user_data,answers', { count: 'exact' }).eq('quiz_id', quiz.id).order('timestamp', { ascending: false }).order('id', { ascending: true }).range(offset, offset + 49);
    if (responseError) throw responseError;
    const sanitizeQuestion = (question: unknown) => {
      if (!question || typeof question !== 'object') return question;
      const safe = { ...(question as Record<string, unknown>) }; delete safe.correctIndex; return safe;
    };
    const responseRows = (rows || []) as Array<{ id: string; timestamp: string; score: number | null; total_questions: number | null; user_data: Record<string, unknown> | null; answers: unknown[] | null }>;
    const responses = responseRows.map((row) => {
      const userData = row.user_data && typeof row.user_data === 'object' ? row.user_data : {};
      const answerRows = Array.isArray(row.answers) ? row.answers : [];
      return {
        id: row.id, timestamp: row.timestamp, score: row.score, totalQuestions: row.total_questions,
        answeredQuestions: userData.answeredQuestions ?? 0, scorePossible: userData.scorePossible ?? row.total_questions,
        branchHistory: Array.isArray(userData.branchHistory) ? userData.branchHistory : [],
        userData: Object.fromEntries(Object.entries(userData).filter(([key]) => !['canViewPublic','publicId','attemptId','attemptToken','attemptTokenHash','deviceKey','deviceKeyHash','currentPathQuestionIds','pathQuestionSnapshots','branchHistory'].includes(key))),
        pathQuestionSnapshots: Array.isArray(userData.pathQuestionSnapshots) ? userData.pathQuestionSnapshots.map(sanitizeQuestion) : [],
        answers: answerRows.map((item) => {
          if (!item || typeof item !== 'object') return item;
          const answer = item as Record<string, unknown>;
          return { ...answer, ...(answer.questionSnapshot ? { questionSnapshot: sanitizeQuestion(answer.questionSnapshot) } : {}) };
        }),
        signedUser: userData.isSignedUser ? userData.signedUser : null,
      };
    });
    let pollResults: Array<{ questionId: string; text: string; category: string; totalVotes: number; options: Array<{ label: string; votes: number }> }> | undefined;
    let pollTruncated = false;
    if (quiz.type === 'survey' && quiz.settings?.surveyType === 'poll') {
      const { data: voteRows, error: voteError } = await admin.from('quiz_responses')
        .select('answers').eq('quiz_id', quiz.id).order('timestamp', { ascending: false }).range(0, 999);
      if (voteError) throw voteError;
      pollTruncated = (count || 0) > 1000;
      const tallies = new Map<string, { text: string; category: string; votes: Map<string, number> }>();
      for (const voteRow of voteRows || []) {
        for (const rawAnswer of Array.isArray(voteRow.answers) ? voteRow.answers : []) {
          if (!rawAnswer || typeof rawAnswer !== 'object') continue;
          const answer = rawAnswer as Record<string, any>;
          if (answer.passed || answer.answer === undefined || answer.answer === null || answer.answer === '') continue;
          const question = answer.questionSnapshot && typeof answer.questionSnapshot === 'object' ? answer.questionSnapshot : null;
          if (!question || typeof answer.questionId !== 'string') continue;
          const tally = tallies.get(answer.questionId) || { text: String(question.text || 'Question'), category: String(question.category || 'General'), votes: new Map<string, number>() };
          const selections = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
          for (const selection of selections) {
            const options = Array.isArray(question.options) ? question.options : [];
            const option = options.find((item: any, index: number) => String(item?.id ?? index) === String(selection)) || options[Number(selection)];
            const label = String(option?.text ?? selection).trim();
            if (label) tally.votes.set(label, (tally.votes.get(label) || 0) + 1);
          }
          tallies.set(answer.questionId, tally);
        }
      }
      pollResults = [...tallies.entries()].map(([questionId, value]) => ({
        questionId,
        text: value.text,
        category: value.category,
        totalVotes: [...value.votes.values()].reduce((sum, votes) => sum + votes, 0),
        options: [...value.votes.entries()].map(([label, votes]) => ({ label, votes })).sort((a, b) => b.votes - a.votes),
      }));
    }
    return NextResponse.json({ quiz: { id: quiz.id, title: quiz.title || quiz.settings?.title || 'Assessment', type: quiz.type, surveyType: quiz.settings?.surveyType || 'research' }, responses, totalCount: count ?? offset + responses.length, nextOffset: (rows || []).length === 50 && offset < 4_950 ? offset + 50 : null, pollResults, pollTruncated }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Responses could not be loaded.' }, { status: 503 });
  }
}
