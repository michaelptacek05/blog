import { hash, verify, type Algorithm } from '@node-rs/argon2';

/**
 * Algorithm.Argon2id. Inlined because @node-rs/argon2 exports Algorithm as an
 * ambient const enum, which `verbatimModuleSyntax` cannot import as a value.
 */
const ARGON2ID = 2 as Algorithm;

/** OWASP-recommended argon2id parameters (m=19 MiB, t=2, p=1). */
const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Verified whenever ADMIN_PASSWORD_HASH is missing or blank, so an
 * unconfigured instance costs the same time as a wrong password and cannot be
 * distinguished by timing. The plaintext behind it is random and discarded.
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$hW0+dyF0NPWxGSGgbNPuvQ$9TALF7vAWOjMxR39gmoQsaXOH5Hfb/Bnv9/Wz26Z5Bc';

/**
 * ADMIN_PASSWORD_HASH is stored base64-encoded, because a raw argon2 string
 * ($argon2id$v=19$m=...) does not survive the trip into the app:
 *
 *   1. Docker Compose interpolates $VAR inside env_file, expanding $argon2id,
 *      $v and $m to empty strings.
 *   2. Next's own loader (@next/env) reads the bind-mounted .env and
 *      OVERWRITES the process environment with its dotenv-expanded value, so
 *      even a correct value from Compose gets replaced.
 *
 * Base64 contains no '$' and passes both layers untouched. A raw hash pasted
 * by hand is still accepted.
 */
function decodeHash(raw: string): string {
  const value = raw.trim();

  if (value.startsWith('$argon2')) {
    return value;
  }

  if (value.startsWith('$$argon2')) {
    return value.replaceAll('$$', '$');
  }

  const decoded = Buffer.from(value, 'base64').toString('utf8');
  return decoded.startsWith('$argon2') ? decoded : value;
}

export function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, ARGON2_OPTIONS);
}

export async function verifyAdminPassword(plaintext: string): Promise<boolean> {
  const configured = process.env.ADMIN_PASSWORD_HASH;
  const isConfigured = typeof configured === 'string' && configured.length > 0;
  const target = isConfigured ? decodeHash(configured) : DUMMY_HASH;

  try {
    const matches = await verify(target, plaintext);
    // Never authenticate against the dummy hash, even in the astronomically
    // unlikely case that it matches.
    return matches && isConfigured;
  } catch {
    // Malformed hash in the environment — treat as a failed login, not a crash.
    return false;
  }
}
