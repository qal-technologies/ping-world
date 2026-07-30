// ============================================================
// Recaller Fetch Engine — Production-grade data fetcher
// TTL cache, debounce, deduplication, recall protection,
// exponential backoff retry, abort signal, hook guard
// ============================================================

export interface RecallerOptions {
  ttlMs?: number; // Cache TTL (default: 60 000ms)
  retryCount?: number; // Max retry attempts (default: 2)
  retryDelayMs?: number; // Base delay for exponential backoff (default: 500ms)
  timeoutMs?: number; // Request timeout (default: 8000ms)
  headers?: Record<string, string>;
  forceRefetch?: boolean; // Bypass cache
  debounceMs?: number; // Debounce duplicate triggers (default: 300ms)
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export interface RecallerResponse<T> {
  data: T;
  cached: boolean;
  fetchTimeMs: number;
  timestamp: number;
}

export interface CacheStats {
  size: number;
  keys: string[];
  entries: Array<{ key: string; expiresAt: number; ttlRemaining: number }>;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * RecallerEngine — the TanStack Query / Axios alternative.
 * Key features:
 * - TTL-based cache with auto-expiry
 * - Debounced calls to prevent duplicate triggers (e.g. from useEffect double-fire)
 * - In-flight deduplication: only one network call per URL at a time
 * - Per-call recall guard: if a fetch for the same key is already pending, waits for it
 * - Exponential backoff with configurable retry count
 * - AbortController per request with configurable timeout
 * - Works on client & server (no browser globals required)
 */
export class RecallerEngine {
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly pending = new Map<string, Promise<any>>();
  private readonly debounceTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly recallGuard = new Set<string>(); // Prevents hook over-fire

  /** Fetch with full cache, debounce, dedup, and retry */
  public async fetchData<T = any>(
    url: string,
    options: RecallerOptions = {},
  ): Promise<RecallerResponse<T>> {
    const cacheKey = this._cacheKey(url, options);
    const ttl = options.ttlMs ?? 60_000;
    const now = Date.now();

    // ---- TTL Cache check ----
    if (!options.forceRefetch && this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!;
      if (now < entry.expiresAt) {
        return {
          data: entry.data as T,
          cached: true,
          fetchTimeMs: 0,
          timestamp: entry.timestamp,
        };
      }
      this.cache.delete(cacheKey);
    }

    // ---- Recall guard (prevents useEffect double-fire from causing duplicate DB reads) ----
    if (this.recallGuard.has(cacheKey)) {
      // Wait for the existing pending to complete then return cached
      if (this.pending.has(cacheKey)) {
        const data = await this.pending.get(cacheKey);
        return {
          data: data as T,
          cached: false,
          fetchTimeMs: 0,
          timestamp: Date.now(),
        };
      }
    }

    // ---- In-flight deduplication ----
    if (this.pending.has(cacheKey)) {
      const data = await this.pending.get(cacheKey);
      return {
        data: data as T,
        cached: false,
        fetchTimeMs: 0,
        timestamp: Date.now(),
      };
    }

    // ---- Debounce: if another call with same key arrives within debounceMs, cancel the first ----
    if (options.debounceMs && options.debounceMs > 0) {
      await this._debounce(cacheKey, options.debounceMs);
    }

    const startTime = Date.now();
    this.recallGuard.add(cacheKey);
    const fetchPromise = this._executeWithRetry<T>(url, options);
    this.pending.set(cacheKey, fetchPromise);

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
        timestamp: Date.now(),
      };
    } finally {
      this.pending.delete(cacheKey);
      // Recall guard removed after short delay to handle React StrictMode double-fire
      setTimeout(() => this.recallGuard.delete(cacheKey), 500);
    }
  }

  /** POST shorthand */
  public async post<T = any>(
    url: string,
    body: unknown,
    options: Omit<RecallerOptions, 'method' | 'body'> = {},
  ): Promise<RecallerResponse<T>> {
    return this.fetchData<T>(url, {
      ...options,
      method: 'POST',
      body,
      ttlMs: 0,
    });
  }

  /** Invalidate cache by key pattern */
  public invalidateCache(keyPattern?: string): number {
    if (!keyPattern) {
      const c = this.cache.size;
      this.cache.clear();
      return c;
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

  /** Invalidate a specific exact URL */
  public invalidate(url: string, options?: RecallerOptions): 0 | 1 {
    const key = this._cacheKey(url, options ?? {});
    if (this.cache.has(key)) {
      this.cache.delete(key);
      return 1;
    }
    return 0;
  }

  /** Full cache statistics */
  public getCacheStats(): CacheStats {
    const now = Date.now();
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        expiresAt: entry.expiresAt,
        ttlRemaining: Math.max(0, entry.expiresAt - now),
      })),
    };
  }

  /** Prefetch a URL and prime the cache */
  public async prefetch<T = any>(
    url: string,
    options: RecallerOptions = {},
  ): Promise<void> {
    await this.fetchData<T>(url, { ...options, forceRefetch: true });
  }

  /** Check if a cached entry is still valid */
  public isCached(url: string, options: RecallerOptions = {}): boolean {
    const key = this._cacheKey(url, options);
    const entry = this.cache.get(key);
    return !!entry && Date.now() < entry.expiresAt;
  }

  // ---- Private ----

  private _cacheKey(url: string, options: RecallerOptions): string {
    const method = options.method ?? 'GET';
    const bodyKey = options.body ? JSON.stringify(options.body) : '';
    return `${method}::${url}::${bodyKey}`;
  }

  private _debounce(key: string, ms: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key)!);
      }
      const timer = setTimeout(() => {
        this.debounceTimers.delete(key);
        resolve();
      }, ms);
      this.debounceTimers.set(key, timer);
    });
  }

  private async _executeWithRetry<T>(
    url: string,
    options: RecallerOptions,
  ): Promise<T> {
    const maxRetries = options.retryCount ?? 2;
    const baseDelay = options.retryDelayMs ?? 500;
    const timeoutMs = options.timeoutMs ?? 8_000;
    const method = options.method ?? 'GET';

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
          },
          signal: controller.signal,
        };

        if (options.body && method !== 'GET') {
          fetchOptions.body =
            typeof options.body === 'string' ?
              options.body
            : JSON.stringify(options.body);
        }

        const res = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          return (await res.json()) as T;
        }
        return (await res.text()) as unknown as T;
      } catch (err) {
        lastError = err as Error;
        // Don't retry on abort/timeout
        if ((err as Error).name === 'AbortError') break;
        if (attempt < maxRetries) {
          await new Promise((r) =>
            setTimeout(r, baseDelay * Math.pow(2, attempt)),
          );
        }
      }
    }

    throw lastError ?? new Error(`Recaller: failed to fetch ${url}`);
  }
}
