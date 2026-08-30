import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Journal — Michael Ptáček',
    template: '%s — Journal',
  },
  description: 'Notes on programming, design and the things in between.',
  alternates: {
    types: {
      'application/rss+xml': [{ url: '/rss.xml', title: 'Journal' }],
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
