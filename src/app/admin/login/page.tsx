import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Přihlášení',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/admin');
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm items-center px-4">
      <div className="w-full">
        <h1 className="mb-6 text-xl font-semibold tracking-tight">Přihlášení</h1>
        <LoginForm />
      </div>
    </div>
  );
}
