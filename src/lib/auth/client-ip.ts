import { headers } from 'next/headers';

/**
 * Client IP as seen behind Nginx Proxy Manager. NPM sets x-forwarded-for, and
 * only the first entry is the original client.
 */
export async function clientIp(): Promise<string> {
  const headerList = await headers();

  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  return headerList.get('x-real-ip')?.trim() || 'unknown';
}
