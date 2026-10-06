/**
 * Client-side feedback helper with local cache to throttle continuous API fetches.
 */

const clientFeedbackCache = new Map<string, { data: any; timestamp: number }>();
const CLIENT_CACHE_TTL_MS = 30_000; // 30 seconds client cache

export interface FeedbackFilterOptions {
  sentiment?: 'positive' | 'negative' | 'constructive' | 'neutral';
  minRating?: number;
  filter?: 'clean' | 'all';
  search?: string;
  sort?: 'newest' | 'highest' | 'lowest' | 'quality';
}

export async function fetchQuizFeedback(quizId: string, options: FeedbackFilterOptions = {}, forceRefresh = false) {
  const query = new URLSearchParams();
  if (options.sentiment) query.set('sentiment', options.sentiment);
  if (options.minRating) query.set('minRating', String(options.minRating));
  if (options.filter) query.set('filter', options.filter);
  if (options.search) query.set('search', options.search);
  if (options.sort) query.set('sort', options.sort);

  const cacheKey = `${quizId}:${query.toString()}`;
  if (!forceRefresh) {
    const cached = clientFeedbackCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/feedback?${query.toString()}`);
  if (!res.ok) {
    throw new Error('Could not fetch assessment feedback');
  }
  const data = await res.json();
  clientFeedbackCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

export async function submitQuizFeedback(quizId: string, payload: { comment: string; rating?: number; authorName?: string }) {
  const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to submit feedback');
  }
  // Clear local cache for this quiz
  for (const key of clientFeedbackCache.keys()) {
    if (key.startsWith(quizId)) clientFeedbackCache.delete(key);
  }
  return res.json();
}
