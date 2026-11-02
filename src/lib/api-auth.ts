import { createClient } from '@supabase/supabase-js';

const getSupabaseAuthConfig = () => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

/** Validate a Supabase access token. Never trust a caller-supplied user id. */
export async function getRequestUserFromToken(token: string | undefined) {
  const { url, key } = getSupabaseAuthConfig();
  if (!token || token.length > 256 * 1024 || !url || !key) return null;

  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
      },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[getRequestUserFromToken] auth.getUser failed:', error.message);
      }
      return null;
    }
    return data.user;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[getRequestUserFromToken] Exception during auth validation:', err);
    }
    return null;
  }
}

/** Validate a bearer session with Supabase Auth; never trust a caller-supplied user id. */
export async function getRequestUser(request: Request) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return getRequestUserFromToken(token);
}

export async function readJsonWithinLimit(request: Request, maxBytes: number) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');

  // 1. Try standard request.text() first (safe across Next.js dev server, Node, and edge runtimes)
  if (typeof (request as any).text === 'function') {
    try {
      const raw = await request.text();
      if (raw.length > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
      if (!raw || !raw.trim()) return {};
      return JSON.parse(raw);
    } catch (err) {
      if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') throw err;
      // If text parsing failed because body was already read or empty, attempt json() or reader
    }
  }

  // 2. Try request.json()
  if (typeof (request as any).json === 'function') {
    try {
      return await request.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Unexpected end') || msg.includes('JSON')) return {};
    }
  }

  // 3. Stream reader fallback
  if (!request.body) return {};
  try {
    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let raw = '';
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error('PAYLOAD_TOO_LARGE');
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    if (!raw || !raw.trim()) return {};
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') throw error;
    throw new Error('INVALID_JSON');
  }
}
