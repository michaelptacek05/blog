/**
 * Kept in its own module so the proxy (Edge runtime) can import the cookie name
 * without pulling in `next/headers`, `jose` or the argon2 native binding.
 */
export const SESSION_COOKIE_NAME = 'session';

/** Session lifetime: 7 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
