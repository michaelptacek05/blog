import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col font-mono">
      <header>
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8 sm:px-10">
          <Link href="/" className="transition-opacity hover:opacity-60">
            <Logo />
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/categories"
              className="text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              Categories
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 sm:px-10">{children}</main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <div className="flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Michael Ptáček</span>
          <a href="/rss.xml" className="transition-colors hover:text-foreground">
            RSS
          </a>
        </div>
      </footer>
    </div>
  );
}
