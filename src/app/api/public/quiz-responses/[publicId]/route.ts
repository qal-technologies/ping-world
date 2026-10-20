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
    const { data: rows, error: responseError, count } = await admin.from('quiz_responses').select('id,timestamp,score,total_questions,user_data,answers', { count: 'exact' }).eq('quiz_id', quiz.id).order('timestamp', { ascending: false }).range(offset, offset + 49);
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
    return NextResponse.json({ quiz: { id: quiz.id, title: quiz.title || quiz.settings?.title || 'Assessment', type: quiz.type }, responses, totalCount: count ?? offset + responses.length, nextOffset: (rows || []).length === 50 && offset < 4_950 ? offset + 50 : null }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Responses could not be loaded.' }, { status: 503 });
  }
}
