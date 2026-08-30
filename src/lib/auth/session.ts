import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { env, isProduction } from '../env';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from './constants';

const ALGORITHM = 'HS256';
const SUBJECT = 'admin';

export type SessionPayload = {
  sub: typeof SUBJECT;
  /** Expiry as a unix timestamp in seconds. */
  exp: number;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

/** Issues the session JWT and writes the cookie. */
export async function createSession(): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(SUBJECT)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Nginx Proxy Manager terminates TLS and forwards plain HTTP, so sniffing
    // the request protocol would wrongly conclude "not secure". Decide from the
    // environment instead.
    secure: isProduction,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Returns the verified session, or null for missing/invalid/expired tokens. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: [ALGORITHM],
    });

    if (payload.sub !== SUBJECT || typeof payload.exp !== 'number') {
      return null;
    }

    return { sub: SUBJECT, exp: payload.exp };
  } catch {
    // Bad signature, wrong algorithm, expired — all mean "not logged in".
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
