export interface RecallerOptions {
  ttlMs?: number; // Cache Time-to-Live
  retryCount?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
  forceRefetch?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class RecallerEngine {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  public async fetchData<T = any>(url: string, options: RecallerOptions = {}): Promise<{ data: T; cached: boolean; fetchTimeMs: number }> {
    const cacheKey = url;
    const ttl = options.ttlMs || 60000; // default 1 min
    const now = Date.now();

    // Check cache
    if (!options.forceRefetch && this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!;
      if (now < entry.expiresAt) {
        return { data: entry.data as T, cached: true, fetchTimeMs: 0 };
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // De-duplicate concurrent pending requests for the same URL
    if (this.pendingRequests.has(cacheKey)) {
      const data = await this.pendingRequests.get(cacheKey);
      return { data: data as T, cached: false, fetchTimeMs: 0 };
    }

    const startTime = Date.now();
    const fetchPromise = this.executeFetchWithRetry<T>(url, options);
    this.pendingRequests.set(cacheKey, fetchPromise);

    try {
      const data = await fetchPromise;
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      });
      return {
        data,
        cached: false,
        fetchTimeMs: Date.now() - startTime,
      };
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  public invalidateCache(keyPattern?: string): number {
    if (!keyPattern) {
      const count = this.cache.size;
      this.cache.clear();
      return count;
    }
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  private async executeFetchWithRetry<T>(url: string, options: RecallerOptions): Promise<T> {
    const maxRetries = options.retryCount || 2;
    const baseDelay = options.retryDelayMs || 500;
    const timeoutMs = options.timeoutMs || 8000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(url, {
          headers: options.headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        return data as T;
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError || new Error(`Failed to fetch ${url}`);
  }
}
