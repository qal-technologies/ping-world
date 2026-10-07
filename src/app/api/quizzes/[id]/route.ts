import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:public-quiz', 60, 60_000).limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  try {
    const { id } = await context.params;
    const ownerUsername = request.nextUrl.searchParams.get('owner');
    const admin = getSupabaseAdmin();
    let query = admin.from('quizzes').select('*');
    if (ownerUsername) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('username', ownerUsername)
        .maybeSingle();
      if (!profile?.id) {
        return NextResponse.json(
          { error: 'Assessment owner not found.' },
          { status: 404 },
        );
      }
      query = query.eq('user_id', profile.id).or(`id.eq.${id},custom_id.eq.${id}`);
    } else {
      query = query.or(`id.eq.${id},custom_id.eq.${id}`);
    }
    const { data: row, error } = await query.maybeSingle();
    if (
      error ||
      !row ||
      (row.expires_at && new Date(row.expires_at).getTime() < Date.now())
    ) {
      return NextResponse.json(
        { error: 'Assessment not found or expired.' },
        { status: 404 },
      );
    }
    const settings =
      row.settings && typeof row.settings === 'object' ? row.settings : {};
    const questions = Array.isArray(row.questions) ? row.questions : [];
    const sanitizedQuestions = questions.map(
      (question: Record<string, unknown>) => ({
        ...question,
        correctIndex: null,
      }),
    );
    const {
      settings: _privateSettings,
      responses: _responses,
      user_id: _owner,
      ...columns
    } = row;
    const safeQuiz = {
      ...columns,
      ...settings,
      id: row.id,
      title: row.title || settings.title || 'Assessment',
      description: row.description || settings.description || '',
      type: row.type || settings.type || 'quiz',
      questions: sanitizedQuestions,
      endScreen: row.endScreen || settings.endScreen,
      customUrl: row.custom_id || '',
      responses: [],
    };
    return NextResponse.json(
      { quiz: safeQuiz },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    console.error('[api/quizzes] Public quiz read failed.');
    return NextResponse.json(
      { error: 'Assessment is temporarily unavailable.' },
      { status: 503 },
    );
  }
}
