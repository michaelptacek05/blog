import { headers } from 'next/headers';

/**
 * Client IP as seen behind Nginx Proxy Manager.
 *
 * NPM sets X-Real-IP to the address of the connection it accepted, replacing
 * anything the client sent. X-Forwarded-For is *not* trustworthy: NPM appends
 * to whatever the client supplied, so its first entry is attacker-chosen and
 * keying the login rate limit on it lets every request pick a fresh bucket.
 * Only the last entry — added by the hop right in front of us — is used as a
 * fallback.
 */
export async function clientIp(): Promise<string> {
  const headerList = await headers();

  const realIp = headerList.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  const lastForwarded = headerList.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  return lastForwarded || 'unknown';
}
