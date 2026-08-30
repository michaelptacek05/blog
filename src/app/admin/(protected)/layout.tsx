import Link from 'next/link';
import { logoutAction } from '../actions';

/**
 * Chrome for the signed-in area. Still not an auth boundary — every page below
 * calls requireAdmin() for itself.
 */
export default function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="font-semibold tracking-tight">
              Admin
            </Link>
            <Link
              href="/admin/categories"
              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              Kategorie
            </Link>
            <Link href="/" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
              Zobrazit blog
            </Link>
          </nav>

          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              Odhlásit
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
