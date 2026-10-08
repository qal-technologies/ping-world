import { supabase } from '@/lib/supabase';

/**
 * Client-side feedback helper with local cache to throttle continuous API fetches.
 */

const clientFeedbackCache = new Map<string, { data: unknown; timestamp: number }>();
const feedbackStorageKey = (quizId: string, query: string) => `quiz_feedback:${encodeURIComponent(quizId)}:${query}`;
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
  let localData: unknown = null;
  if (!forceRefresh) {
    const cached = clientFeedbackCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS) {
      return cached.data;
    }
    try {
      const stored = localStorage.getItem(`pw_${feedbackStorageKey(quizId, query.toString())}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        localData = parsed;
        clientFeedbackCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
        if (!navigator.onLine) return parsed;
      }
    } catch {}
  }

  if (!navigator.onLine) {
    if (localData) return localData;
    throw new Error('No saved assessment feedback is available offline.');
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      if (localData) return localData;
      throw new Error('Sign in to view assessment feedback.');
    }
    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/feedback?${query.toString()}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', credentials: 'omit',
    });
    if (!res.ok) {
      if (localData) return localData;
      throw new Error('Could not fetch assessment feedback');
    }
    const data = await res.json();
    clientFeedbackCache.set(cacheKey, { data, timestamp: Date.now() });
    try { localStorage.setItem(`pw_${feedbackStorageKey(quizId, query.toString())}`, JSON.stringify(data)); } catch {}
    return data;
  } catch (error) {
    if (localData) return localData;
    throw error;
  }
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
