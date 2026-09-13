import { createHash } from 'node:crypto';

/**
 * In-memory "have we just counted this visitor?" check, so a refresh or a back
 * button does not add another view.
 *
 * Process-local for the same reason as the login rate limit: one container, and
 * keeping it out of the database means no visitor identifier is ever persisted.
 * The key is a hash, so raw IPs do not sit in memory either. A restart forgets
 * everything — at worst a few views are counted twice.
 */

const WINDOW_MS = 30 * 60 * 1000;
/** Hard ceiling so a flood of distinct visitors cannot grow the map unbounded. */
const MAX_ENTRIES = 50_000;

const globalForViews = globalThis as unknown as {
  __recentViews?: Map<string, number>;
};

/** Key → unix ms when the visitor may be counted again. */
const recent: Map<string, number> = globalForViews.__recentViews ?? new Map();
globalForViews.__recentViews = recent;

function prune(now: number): void {
  for (const [key, expiresAt] of recent) {
    if (expiresAt <= now) {
      recent.delete(key);
    }
  }
}

/**
 * Returns true the first time a visitor views a post within the window, and
 * marks them as seen. Check-and-set is synchronous, so two parallel requests
 * cannot both pass.
 */
export function shouldCountView(postId: number, ip: string, userAgent: string): boolean {
  const now = Date.now();
  const key = createHash('sha256').update(`${postId}\n${ip}\n${userAgent}`).digest('base64url');

  const expiresAt = recent.get(key);
  if (expiresAt !== undefined && expiresAt > now) {
    return false;
  }

  if (recent.size >= MAX_ENTRIES) {
    prune(now);
    if (recent.size >= MAX_ENTRIES) {
      recent.clear();
    }
  }

  recent.set(key, now + WINDOW_MS);
  return true;
}

/** Crawlers, link unfurlers and headless browsers that do run JavaScript. */
const BOT_USER_AGENT =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|curl|wget|python|httpclient/i;

export function isBot(userAgent: string): boolean {
  return userAgent === '' || BOT_USER_AGENT.test(userAgent);
}
