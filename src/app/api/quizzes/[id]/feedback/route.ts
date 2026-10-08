import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// In-Memory Cache (30s TTL) to prevent continuous DB queries
// ---------------------------------------------------------------------------
interface CacheEntry {
  data: any;
  timestamp: number;
}
const feedbackCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function getCached(key: string) {
  const entry = feedbackCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    feedbackCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: any) {
  feedbackCache.set(key, { data, timestamp: Date.now() });
}

function invalidateCacheForQuiz(quizId: string) {
  for (const key of feedbackCache.keys()) {
    if (key.startsWith(quizId)) {
      feedbackCache.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Feedback Analysis & Filtering Algorithm
// ---------------------------------------------------------------------------
const POSITIVE_WORDS = [
  'great', 'awesome', 'excellent', 'good', 'love', 'helpful', 'clear',
  'well', 'best', 'nice', 'informative', 'enjoyed', 'fantastic', 'superb',
  'brilliant', 'useful', 'fun', 'easy', 'perfect', 'accurate',
];

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'worst', 'horrible', 'confusing', 'poor', 'hate',
  'waste', 'broken', 'bug', 'wrong', 'boring', 'unclear', 'difficult',
  'unfair', 'error', 'slow', 'ugly', 'hard', 'flawed',
];

const CONSTRUCTIVE_WORDS = [
  'suggest', 'improve', 'could', 'feature', 'would be better', 'maybe',
  'consider', 'add', 'please change', 'recommend', 'wish', 'instead',
  'option', 'tweak', 'clarify',
];

const SPAM_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /\b(casino|viagra|crypto|telegram|whatsapp|free cash|forex)\b/i,
  /(.)\1{7,}/, // Repetitive characters e.g. "aaaaaaa"
];

const PROFANITY_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick'];

export function analyzeFeedback(comment: string, rating?: number) {
  const lower = comment.toLowerCase();

  let positiveScore = 0;
  for (const w of POSITIVE_WORDS) {
    if (lower.includes(w)) positiveScore++;
  }

  let negativeScore = 0;
  for (const w of NEGATIVE_WORDS) {
    if (lower.includes(w)) negativeScore++;
  }

  let constructiveScore = 0;
  for (const w of CONSTRUCTIVE_WORDS) {
    if (lower.includes(w)) constructiveScore++;
  }

  const isSpam = SPAM_PATTERNS.some((pat) => pat.test(comment));

  if (typeof rating === 'number') {
    if (rating >= 4) positiveScore += 2;
    else if (rating <= 2) negativeScore += 2;
  }

  let sentiment: 'positive' | 'negative' | 'constructive' | 'neutral' = 'neutral';
  if (isSpam) {
    sentiment = 'negative';
  } else if (constructiveScore > 0 && constructiveScore >= positiveScore && constructiveScore >= negativeScore) {
    sentiment = 'constructive';
  } else if (positiveScore > negativeScore) {
    sentiment = 'positive';
  } else if (negativeScore > positiveScore) {
    sentiment = 'negative';
  }

  // Quality score: length, vocabulary variety, constructiveness
  let qualityScore = Math.min(100, Math.floor(comment.trim().length / 2));
  if (isSpam) qualityScore = 0;
  if (constructiveScore > 0) qualityScore = Math.min(100, qualityScore + 25);

  // Mask basic profanity with asterisks
  let cleanedComment = comment;
  for (const bad of PROFANITY_WORDS) {
    const reg = new RegExp(`\\b${bad}\\b`, 'gi');
    cleanedComment = cleanedComment.replace(reg, '****');
  }

  return {
    sentiment,
    qualityScore,
    isSpam,
    cleanedComment,
  };
}

// ---------------------------------------------------------------------------
// GET: Fetch Feedback with Caching & Filtering
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:quiz-feedback-get', 60, 60_000).limited) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const searchParams = request.nextUrl.searchParams;
  const sentiment = searchParams.get('sentiment'); // positive | negative | constructive | neutral
  const minRating = Number(searchParams.get('minRating')) || 0;
  const filterType = searchParams.get('filter'); // 'clean' | 'all'
  const search = searchParams.get('search')?.toLowerCase() || '';
  const sort = searchParams.get('sort') || 'newest'; // newest | highest | lowest | quality

  const cacheKey = `${user.id}:${id}:${sentiment}:${minRating}:${filterType}:${search}:${sort}`;
  const cachedData = getCached(cacheKey);
  if (cachedData) {
    return NextResponse.json({ ...cachedData, cached: true }, {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: ownedQuiz, error: ownerError } = await admin.from('quizzes')
      .select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
    if (ownerError || !ownedQuiz) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    // 1. Check if quiz_feedback table exists
    const { data: dbFeedback, error: fbError } = await admin
      .from('quiz_feedback')
      .select('*')
      .eq('quiz_id', id)
      .order('created_at', { ascending: false })
      .limit(200);

    let feedbackList: any[] = [];

    if (!fbError && Array.isArray(dbFeedback) && dbFeedback.length > 0) {
      feedbackList = dbFeedback;
    } else {
      // Fallback: extract feedback from quiz responses and quiz settings
      const { data: quiz } = await admin.from('quizzes').select('settings, responses').eq('id', id).maybeSingle();
      const settingsFeedback = Array.isArray(quiz?.settings?.feedback) ? quiz.settings.feedback : [];
      const responsesList = Array.isArray(quiz?.responses) ? quiz.responses : [];
      const responsesFeedback = responsesList
        .filter((r: any) => r.feedback || r.userData?.feedback)
        .map((r: any, idx: number) => ({
          id: r.id || `fb_resp_${idx}`,
          quiz_id: id,
          author_name: r.userData?.FullName || r.userData?.name || 'Anonymous',
          comment: r.feedback || r.userData?.feedback,
          rating: r.rating || (r.score != null && r.totalQuestions ? Math.round((r.score / r.totalQuestions) * 5) : 5),
          created_at: r.timestamp || new Date().toISOString(),
        }));

      feedbackList = [...settingsFeedback, ...responsesFeedback];
    }

    // Process each entry through the algorithm
    let analyzed = feedbackList.map((item) => {
      const analysis = analyzeFeedback(item.comment || '', item.rating);
      return {
        id: item.id,
        quizId: item.quiz_id || id,
        authorName: item.author_name || 'Anonymous',
        comment: analysis.cleanedComment,
        originalComment: item.comment,
        rating: Number(item.rating) || 5,
        sentiment: item.sentiment || analysis.sentiment,
        qualityScore: item.quality_score ?? analysis.qualityScore,
        isSpam: item.is_spam ?? analysis.isSpam,
        createdAt: item.created_at || new Date().toISOString(),
      };
    });

    // Apply filtering algorithm
    if (filterType === 'clean') {
      analyzed = analyzed.filter((f) => !f.isSpam && f.qualityScore >= 10);
    }
    if (sentiment) {
      analyzed = analyzed.filter((f) => f.sentiment === sentiment);
    }
    if (minRating > 0) {
      analyzed = analyzed.filter((f) => f.rating >= minRating);
    }
    if (search) {
      analyzed = analyzed.filter((f) =>
        f.comment.toLowerCase().includes(search) || f.authorName.toLowerCase().includes(search)
      );
    }

    // Sort
    if (sort === 'highest') {
      analyzed.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'lowest') {
      analyzed.sort((a, b) => a.rating - b.rating);
    } else if (sort === 'quality') {
      analyzed.sort((a, b) => b.qualityScore - a.qualityScore);
    } else {
      analyzed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const result = {
      feedback: analyzed,
      total: analyzed.length,
      averageRating:
        analyzed.length > 0
          ? Number((analyzed.reduce((sum, f) => sum + f.rating, 0) / analyzed.length).toFixed(1))
          : 0,
      sentimentSummary: {
        positive: analyzed.filter((f) => f.sentiment === 'positive').length,
        constructive: analyzed.filter((f) => f.sentiment === 'constructive').length,
        neutral: analyzed.filter((f) => f.sentiment === 'neutral').length,
        negative: analyzed.filter((f) => f.sentiment === 'negative').length,
      },
    };

    setCached(cacheKey, result);

    return NextResponse.json({ ...result, cached: false }, {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('[api/feedback] Error fetching feedback:', error);
    return NextResponse.json({ error: 'Failed to retrieve assessment feedback.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST: Add Feedback with Algorithm Processing & Cache Invalidation
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:quiz-feedback-add', 10, 60_000).limited) {
    return NextResponse.json({ error: 'Too many feedback submissions. Please try again in a minute.' }, { status: 429 });
  }

  try {
    const body = (await readJsonWithinLimit(request, 64 * 1024)) as Record<string, any>;
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    const authorName = typeof body.authorName === 'string' && body.authorName.trim()
      ? body.authorName.trim().slice(0, 80)
      : 'Anonymous Participant';

    if (!comment || comment.length < 2 || comment.length > 2000) {
      return NextResponse.json({ error: 'Feedback must be between 2 and 2000 characters.' }, { status: 400 });
    }

    // Run feedback analysis & filtering algorithm
    const analysis = analyzeFeedback(comment, rating);

    const user = await getRequestUser(request).catch(() => null);
    const admin = getSupabaseAdmin();
    const feedbackId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const newFeedbackRecord = {
      id: feedbackId,
      quiz_id: id,
      user_id: user?.id || null,
      author_name: authorName,
      comment: analysis.cleanedComment,
      rating,
      sentiment: analysis.sentiment,
      quality_score: analysis.qualityScore,
      is_spam: analysis.isSpam,
      created_at: timestamp,
    };

    // Attempt writing to quiz_feedback table
    const { error: dbError } = await admin.from('quiz_feedback').insert(newFeedbackRecord);

    if (dbError) {
      console.warn('[api/feedback] DB insert into quiz_feedback fallback:', dbError.message);
      // Fallback: save to quiz settings.feedback array
      const { data: quiz } = await admin.from('quizzes').select('settings').eq('id', id).maybeSingle();
      if (quiz) {
        const currentSettings = quiz.settings || {};
        const existingFeedback = Array.isArray(currentSettings.feedback) ? currentSettings.feedback : [];
        await admin.from('quizzes').update({
          settings: {
            ...currentSettings,
            feedback: [newFeedbackRecord, ...existingFeedback].slice(0, 100),
          },
        }).eq('id', id);
      }
    }

    // Invalidate cache for this quiz so the new feedback shows immediately
    invalidateCacheForQuiz(id);

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedbackId,
        quizId: id,
        authorName,
        comment: analysis.cleanedComment,
        rating,
        sentiment: analysis.sentiment,
        qualityScore: analysis.qualityScore,
        createdAt: timestamp,
      },
    });
  } catch (error: any) {
    console.error('[api/feedback] Error saving feedback:', error);
    return NextResponse.json({ error: 'Failed to record feedback.' }, { status: 500 });
  }
}
