import { redirect } from 'next/navigation';
import { getSession, type SessionPayload } from './session';

/**
 * The single authorization check. Call it at the top of every page under
 * /admin and at the top of every server action that touches admin data.
 *
 * The proxy (src/proxy.ts) only redirects for a nicer UX — it is deliberately
 * not trusted as an auth boundary (CVE-2025-29927).
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  return session;
}
