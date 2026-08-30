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
  failures: number;
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

export function checkLoginRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(ip);

  if (!bucket || bucket.failures < MAX_ATTEMPTS) {
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
}

export function registerFailedLogin(ip: string): void {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { failures: 1, resetAt: now + WINDOW_MS });
    return;
  }

  bucket.failures += 1;
}

export function clearLoginAttempts(ip: string): void {
  buckets.delete(ip);
}
