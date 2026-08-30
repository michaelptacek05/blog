import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';

/**
 * Redirect-only convenience layer (the Next 16 successor to middleware.ts).
 *
 * It checks nothing but the *presence* of a cookie and grants no access on its
 * own: a request that skips or spoofs its way past this file still hits
 * requireAdmin() on the page and in every server action. That separation is the
 * lesson of CVE-2025-29927, where a crafted header bypassed middleware entirely.
 */
export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
