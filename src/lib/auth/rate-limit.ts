/**
 * In-memory login throttle: 5 attempts per 15 minutes per IP.
 *
 * Deliberately process-local — a single-admin blog runs one container, and a
 * shared store would be more moving parts than the threat warrants. State is
 * kept on globalThis so hot reloads in development do not reset it.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Bucket = {
  attempts: number;
  /** Unix ms when this bucket's window ends. */
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  __loginBuckets?: Map<string, Bucket>;
};

const buckets: Map<string, Bucket> = globalForRateLimit.__loginBuckets ?? new Map();
globalForRateLimit.__loginBuckets = buckets;

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Milliseconds until the caller may try again; 0 when allowed. */
  retryAfterMs: number;
};

/**
 * Counts an attempt *before* the password is checked. Checking and counting in
 * one synchronous step means parallel requests cannot all pass the limit while
 * the slow hash verification of the first ones is still running.
 */
export function consumeLoginAttempt(ip: string): RateLimitResult {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(ip);

  if (!bucket) {
    buckets.set(ip, { attempts: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.attempts >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }

  bucket.attempts += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function clearLoginAttempts(ip: string): void {
  buckets.delete(ip);
}
