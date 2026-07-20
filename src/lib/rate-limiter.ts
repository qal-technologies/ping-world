import { NextRequest } from 'next/server';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting. Note that in a serverless environment, this will reset
// when the instance cold-starts, but it provides a lightweight, dependency-free layer of protection.
const rateLimitStore = new Map<string, RateLimitInfo>();

// Clean up stale entries every 5 minutes
if (typeof globalThis !== 'undefined') {
  const global = globalThis as any;
  if (!global.rateLimitCleanupInterval) {
    global.rateLimitCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, info] of rateLimitStore.entries()) {
        if (now > info.resetTime) {
          rateLimitStore.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
}

/**
 * Extracts client IP address from request headers safely.
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}

/**
 * Checks if a request by a client IP for a specific route has exceeded the limit.
 * @returns An object stating if it's limited, remaining quota, and time of reset.
 */
export function isRateLimited(
  ip: string,
  route: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const key = `${ip}:${route}`;
  const info = rateLimitStore.get(key);

  if (!info || now > info.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { limited: false, remaining: limit - 1, reset: resetTime };
  }

  if (info.count >= limit) {
    return { limited: true, remaining: 0, reset: info.resetTime };
  }

  info.count += 1;
  return { limited: false, remaining: limit - info.count, reset: info.resetTime };
}
