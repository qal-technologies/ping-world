import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

type QuizExportRow = { id: string; timestamp: string; score: number; total_questions: number; user_data: Record<string, unknown>; answers: Array<Record<string, any>> };

function csvCell(value: unknown) {
  let text = value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
  text = text.replace(/\r\n?/g, '\n');
  if (/^[\s]*[=+\-@\t]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function answerText(question: any, answer: unknown) {
  const resolve = (value: unknown) => {
    if (question.type === 'upload') return value ? '[File submitted]' : '';
    const option = question.options?.find((item: any) => item?.id === value);
    return option?.text ?? (value == null ? '' : String(value));
  };
  return Array.isArray(answer) ? answer.map(resolve).join('; ') : resolve(answer);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:quiz-export-email', 5, 60_000).limited) {
    return NextResponse.json({ error: 'Too many export emails. Try again shortly.' }, { status: 429 });
  }
  if (isRateLimited('resend-export-global', 'api:quiz-export-email-global', 80, 24 * 60 * 60_000).limited) {
    return NextResponse.json({ error: 'The daily export-email limit has been reached.' }, { status: 429 });
  }
  const user = await getRequestUser(request);
  if (!user || !user.email || !user.email_confirmed_at) {
    return NextResponse.json({ error: 'Sign in with a verified email address to email exports.' }, { status: 401 });
  }
  const premiumTier = user.app_metadata?.tier;
  const premiumExpiry = user.app_metadata?.tier_expires_at ? new Date(user.app_metadata.tier_expires_at).getTime() : 0;
  if (!['flexible', 'standard', 'pro'].includes(premiumTier) || (premiumExpiry > 0 && premiumExpiry <= Date.now())) {
    return NextResponse.json({ error: 'Email exports are available to active paid subscribers.' }, { status: 403 });
  }
  if (user.user_metadata?.notification_preferences?.email === false) {
    return NextResponse.json({ error: 'Enable email notifications in Settings to request emailed exports.' }, { status: 403 });
  }
  if (isRateLimited(user.id, 'api:quiz-export-email-account', 3, 60 * 60_000).limited) {
    return NextResponse.json({ error: 'You can email up to three exports per hour.' }, { status: 429 });
  }

  try {
    const body = await readJsonWithinLimit(request, 4 * 1024) as Record<string, unknown>;
    const quizId = typeof body.quizId === 'string' ? body.quizId : '';
    const format = body.format === 'json' ? 'json' : 'csv';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(quizId)) {
      return NextResponse.json({ error: 'Invalid assessment.' }, { status: 400 });
    }
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) return NextResponse.json({ error: 'Email delivery is not configured on this site.' }, { status: 503 });

    const admin = getSupabaseAdmin();
    const { data: quiz, error: quizError } = await admin.from('quizzes')
      .select('id,user_id,title,type,questions').eq('id', quizId).eq('user_id', user.id).maybeSingle();
    if (quizError || !quiz) return NextResponse.json({ error: 'Assessment not found or access denied.' }, { status: 404 });

    const exportStartedAt = new Date().toISOString();
    const { count, error: countError } = await admin.from('quiz_responses')
      .select('id', { count: 'exact', head: true }).eq('quiz_id', quizId).lte('timestamp', exportStartedAt);
    if (countError) throw countError;
    const responseCount = count || 0;
    if (responseCount > 5000) return NextResponse.json({ error: 'This assessment has over 5,000 responses. Use the on-page export to download them.' }, { status: 413 });

    const responses: QuizExportRow[] = [];
    let lastResponseId = '';
    while (responses.length < responseCount) {
      const { data, error } = await admin.from('quiz_responses')
        .select('id,timestamp,score,total_questions,user_data,answers').eq('quiz_id', quizId)
        .lte('timestamp', exportStartedAt).gt('id', lastResponseId)
        .order('id', { ascending: true }).range(0, 499);
      if (error) throw error;
      const page = (data || []) as QuizExportRow[];
      if (!page.length) break;
      responses.push(...page);
      lastResponseId = page[page.length - 1].id;
    }
    responses.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

    const questions = Array.isArray(quiz.questions) ? quiz.questions.map((question: any) => ({
      id: String(question.id || ''),
      text: String(question.text || '').slice(0, 2000),
      type: String(question.type || 'input'),
      options: Array.isArray(question.options) ? question.options.map((option: any) => ({ id: String(option.id || ''), text: String(option.text || '').slice(0, 500) })) : [],
    })) : [];
    const safeTitle = String(quiz.title || 'Assessment').replace(/[\r\n\t]/g, ' ').slice(0, 120);
    const filenameBase = safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'assessment';

    let filename: string;
    let contentType: string;
    let content: string;
    if (format === 'json') {
      filename = `${filenameBase}-responses.json`;
      contentType = 'application/json';
      content = JSON.stringify({ assessment: { id: quiz.id, title: safeTitle, type: quiz.type, questions }, exportedAt: new Date().toISOString(), responses }, null, 2);
    } else {
      filename = `${filenameBase}-responses.csv`;
      const userKeys = Array.from(new Set(responses.flatMap((response) => Object.keys(response.user_data || {}))));
      const columns = ['Timestamp', 'Score', 'Total', ...userKeys.map((key) => key.toUpperCase()), ...questions.map((question: any, index: number) => `Q${index + 1}: ${question.text}`)];
      const rows = responses.map((response) => {
        const answers = new Map((Array.isArray(response.answers) ? response.answers : []).map((answer: any) => [String(answer.questionId || ''), answer.answer]));
        return [response.timestamp, response.score, response.total_questions, ...userKeys.map((key) => response.user_data?.[key] ?? ''), ...questions.map((question: any) => answerText(question, answers.get(question.id)))];
      });
      contentType = 'text/csv; charset=utf-8';
      content = [columns.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\r\n');
    }
    if (Buffer.byteLength(content, 'utf8') > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'This export is too large to email. Use the on-page download instead.' }, { status: 413 });
    }

    const safeHtmlTitle = safeTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: `Your assessment export: ${safeTitle}`,
        html: `<p>Your <strong>${safeHtmlTitle}</strong> response export is attached.</p><p>${responses.length} response(s) included.</p>`,
        attachments: [{ filename, content: Buffer.from(content, 'utf8').toString('base64'), content_type: contentType }],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!emailResponse.ok) {
      console.warn('[api/quiz-export-email] Provider rejected the export:', emailResponse.status);
      return NextResponse.json({ error: 'Email delivery failed. Check the site email configuration and try again.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, email: user.email, responseCount: responses.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    }
    console.error('[api/quiz-export-email] Export email failed.');
    return NextResponse.json({ error: 'Could not email this export.' }, { status: 503 });
  }
}
