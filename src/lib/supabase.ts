import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-key';

type SupabaseBrowserCache = typeof globalThis & {
  __pingworldSupabaseClient?: unknown;
  __pingworldSupabaseStorageClient?: unknown;
};
const browserCache = globalThis as SupabaseBrowserCache;

function getBrowserClient<T>(
  key: '__pingworldSupabaseClient' | '__pingworldSupabaseStorageClient',
  factory: () => T,
): T {
  if (typeof window === 'undefined') return factory();
  const existing = browserCache[key];
  if (existing) return existing as T;
  const client = factory();
  browserCache[key] = client;
  return client;
}

// Keep one auth client across development hot reloads. Recreating the client
// with the same persisted storage key causes GoTrue to warn and can race token
// refreshes. Server rendering still uses the module-scoped instance only.
export const supabase = getBrowserClient('__pingworldSupabaseClient', () => createClient(supabaseUrl, supabaseAnonKey));

const storageDiagnosticFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (!response.ok) {
    const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (requestUrl.includes('/storage/v1/object/upload/sign/')) {
      const responseBody = await response.clone().text().catch(() => '');
      console.error('[SupabaseStorage] Signed upload rejected:', {
        status: response.status,
        body: responseBody.slice(0, 500),
      });
    }
  }
  return response;
};

// Signed Storage uploads must not inherit the active user's access token. Apart from
// keeping these public object-store requests small, the signed token itself grants
// access only to the exact object path issued by our server route.
const createStorageClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'pingworld-supabase-storage-only',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: { fetch: storageDiagnosticFetch },
});
export const supabaseStorage = getBrowserClient('__pingworldSupabaseStorageClient', createStorageClient);
