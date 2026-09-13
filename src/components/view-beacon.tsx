'use client';

import { useEffect } from 'react';

/**
 * Reports a view once the post has actually rendered in a browser. Counting on
 * the client rather than in the server component keeps out crawlers that do
 * not run JavaScript and requests that never reach a real reader.
 */
export function ViewBeacon({ postId }: { postId: number }) {
  useEffect(() => {
    // Automated browsers (Puppeteer, Playwright, Selenium) announce themselves.
    if (navigator.webdriver) {
      return;
    }

    void fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
      keepalive: true,
    }).catch(() => {
      // Nothing for the reader to do about a missed view.
    });
  }, [postId]);

  return null;
}
