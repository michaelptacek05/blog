'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/** Material-style light_mode / dark_mode glyphs, inlined to avoid an icon dependency. */
function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zm-1-13h2v3h-2zm0 17h2v3h-2zM3.5 5.91 5.91 3.5l2.12 2.12-2.41 2.41zM15.97 18.38l2.12-2.12 2.41 2.41-2.12 2.12zM2 11h3v2H2zm17 0h3v2h-3zM5.91 20.5 3.5 18.09l2.12-2.12 2.41 2.41zM18.09 3.5l2.41 2.41-2.12 2.12-2.41-2.41z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Press "T" anywhere to flip the theme, as on michaelptacek.com.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.metaKey ||
        event.ctrlKey
      ) {
        return;
      }

      if (event.key.toLowerCase() === 't') {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resolvedTheme, setTheme]);

  // Render a same-sized placeholder until mounted, so the layout does not shift
  // and the server markup cannot disagree with the client.
  if (!mounted) {
    return <div className="h-10 w-10" />;
  }

  return (
    <div className="group relative flex justify-center">
      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
        className="cursor-pointer rounded-xl p-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus:outline-none"
      >
        {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="pointer-events-none absolute top-full z-50 mt-3 flex items-center gap-2 whitespace-nowrap rounded-lg bg-muted px-3 py-1.5 text-sm text-foreground opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
        <div className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-muted" />
        <span className="relative z-10 font-mono font-medium">Toggle theme</span>
        <kbd className="relative z-10 rounded bg-background px-1.5 py-0.5 font-mono text-xs font-bold">
          T
        </kbd>
      </div>
    </div>
  );
}
