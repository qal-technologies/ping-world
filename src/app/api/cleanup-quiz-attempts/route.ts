import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Retire abandoned in-progress attempts after a full day. A failed final
 * submission remains retryable for that day; media is removed before its row
 * so a storage error leaves the attempt available for the next cleanup run.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: stale, error } = await admin
      .from('quiz_attempts')
      .select('id,quiz_id,started_at,updated_at')
      .eq('status', 'in_progress')
      .lt('updated_at', cutoff)
      .order('updated_at', { ascending: true })
      .limit(200);
    if (error) throw error;

    let deleted = 0;
    const failed: string[] = [];
    for (const attempt of stale || []) {
      const prefix = `${attempt.quiz_id}/${attempt.id}`;
      try {
        const { data: files, error: listError } = await admin.storage
          .from('quiz-response-media')
          .list(prefix, { limit: 1000 });
        if (listError) throw listError;
        const paths = (files || [])
          .filter((file) => file.name && file.name !== '.')
          .map((file) => `${prefix}/${file.name}`);
        for (let offset = 0; offset < paths.length; offset += 100) {
          const { error: removeError } = await admin.storage
            .from('quiz-response-media')
            .remove(paths.slice(offset, offset + 100));
          if (removeError) throw removeError;
        }
        const { error: deleteError } = await admin
          .from('quiz_attempts')
          .delete()
          .eq('id', attempt.id)
          .eq('quiz_id', attempt.quiz_id)
          .eq('status', 'in_progress')
          .lt('updated_at', cutoff);
        if (deleteError) throw deleteError;
        deleted += 1;
      } catch (attemptError) {
        failed.push(String(attempt.id));
        console.error('[cleanup-quiz-attempts] Attempt cleanup deferred:',
          attemptError instanceof Error ? attemptError.message : 'unknown');
      }
    }

    return NextResponse.json({
      success: failed.length === 0,
      scanned: stale?.length || 0,
      deleted,
      failed: failed.length,
      checkedAt: new Date().toISOString(),
    }, {
      status: failed.length ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[cleanup-quiz-attempts] Sweep failed:',
      error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Abandoned attempt cleanup failed.' }, { status: 503 });
  }
}
