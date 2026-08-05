import { DbValidationHandler } from '@/lib/dev-engines/db-validation';

const handler = new DbValidationHandler();

/**
 * Recursively sanitizes any string, object, or array to prevent SQL or NoSQL injections.
 * Ensures safe database insertion into Supabase / Firebase.
 */
export function sanitizeInput<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    let cleaned = input;
    if (handler.hasInjectionRisk(cleaned)) {
      console.warn('[Security Shield] Malicious injection risk blocked and sanitized:', cleaned);
    }
    return handler.sanitizeInput(cleaned) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      sanitizedObj[key] = sanitizeInput(value);
    }
    return sanitizedObj as unknown as T;
  }

  return input;
}
