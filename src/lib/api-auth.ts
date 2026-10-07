import { createClient } from '@supabase/supabase-js';

const getSupabasePublicConfig = () => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

/** Validate a Supabase access token. Never trust a caller-supplied user id. */
export async function getRequestUserFromToken(token: string | undefined) {
  const { url, anonKey } = getSupabasePublicConfig();
  if (!token || token.length > 256 * 1024 || !url || !anonKey) return null;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
    },
  });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
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
  if (!request.body) throw new Error('INVALID_JSON');

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let bytes = 0;
  try {
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
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') throw error;
    throw new Error('INVALID_JSON');
  }
}
