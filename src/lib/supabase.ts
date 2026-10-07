import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
export const supabaseStorage = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: { fetch: storageDiagnosticFetch },
});
