'use server';

import { redirect } from 'next/navigation';
import { clientIp } from '@/lib/auth/client-ip';
import { requireAdmin } from '@/lib/auth/guard';
import { verifyAdminPassword } from '@/lib/auth/password';
import { clearLoginAttempts, consumeLoginAttempt } from '@/lib/auth/rate-limit';
import { createSession, destroySession } from '@/lib/auth/session';

export type LoginState = {
  error?: string;
};

function minutesFrom(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000));
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const ip = await clientIp();
  const limit = consumeLoginAttempt(ip);

  if (!limit.allowed) {
    return {
      error: `Příliš mnoho pokusů. Zkus to znovu za ${minutesFrom(limit.retryAfterMs)} min.`,
    };
  }

  const password = formData.get('password');
  const plaintext = typeof password === 'string' ? password : '';

  // The hash is verified even for an empty password, so the response time does
  // not reveal whether an admin password is configured at all.
  const ok = await verifyAdminPassword(plaintext);

  // The attempt was already counted above; a success wipes the slate.
  if (!ok) {
    return { error: 'Nesprávné heslo.' };
  }

  clearLoginAttempts(ip);
  await createSession();

  // redirect() throws internally — must stay outside any try/catch.
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  // Even logging out goes through the guard: no session, nothing to do here.
  await requireAdmin();
  await destroySession();
  redirect('/admin/login');
}
