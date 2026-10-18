import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  if (isRateLimited(getClientIp(request), 'api:public-quiz-response', 30, 60_000).limited) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const { publicId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(publicId)) return NextResponse.json({ error: 'Response not found.' }, { status: 404 });
  try {
    const admin = getSupabaseAdmin();
    const responseId = request.nextUrl.searchParams.get('responseId') || '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(responseId)) return NextResponse.json({ error: 'Response not found.' }, { status: 404 });
    const { data: quiz, error: quizError } = await admin.from('quizzes').select('id').eq('settings->>publicResponsesId', publicId).maybeSingle();
    if (quizError || !quiz) return NextResponse.json({ error: 'Response not found.' }, { status: 404 });
    const { data: row, error } = await admin.from('quiz_responses').select('id,quiz_id,timestamp,score,total_questions,user_data,answers').eq('id', responseId).eq('quiz_id', quiz.id).maybeSingle();
    const userData = row?.user_data && typeof row.user_data === 'object' ? row.user_data : {};
    if (error || !row) return NextResponse.json({ error: 'Response not found.' }, { status: 404 });
    const sanitizeQuestion = (question: unknown) => {
      if (!question || typeof question !== 'object') return question;
      const safeQuestion = { ...(question as Record<string, unknown>) };
      delete safeQuestion.correctIndex;
      return safeQuestion;
    };
    const answers = Array.isArray(row.answers) ? row.answers.map((item: unknown) => {
      if (!item || typeof item !== 'object') return item;
      const answer = item as Record<string, unknown>;
      return { ...answer, ...(answer.questionSnapshot ? { questionSnapshot: sanitizeQuestion(answer.questionSnapshot) } : {}) };
    }) : [];
    return NextResponse.json({
      response: {
        timestamp: row.timestamp,
        score: row.score,
        totalQuestions: row.total_questions,
        answeredQuestions: userData.answeredQuestions ?? 0,
        scorePossible: userData.scorePossible ?? row.total_questions,
        userData: Object.fromEntries(Object.entries(userData).filter(([key]) => !['canViewPublic', 'publicId', 'attemptId', 'attemptToken', 'deviceKey', 'currentPathQuestionIds', 'pathQuestionSnapshots', 'branchHistory'].includes(key))),
        pathQuestionSnapshots: Array.isArray(userData.pathQuestionSnapshots) ? userData.pathQuestionSnapshots.map(sanitizeQuestion) : [],
        answers,
        signedUser: userData.isSignedUser ? userData.signedUser : null,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Response could not be loaded.' }, { status: 503 });
  }
}
