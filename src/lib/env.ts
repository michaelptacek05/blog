/**
 * Environment access.
 *
 * Values are read lazily through getters so a missing variable fails at the
 * point of use rather than at import time — `next build` runs without a
 * database or secrets and must not blow up just because a module was imported.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get DATABASE_URL(): string {
    return required('DATABASE_URL');
  },
  get SESSION_SECRET(): string {
    return required('SESSION_SECRET');
  },
  get ADMIN_PASSWORD_HASH(): string {
    return required('ADMIN_PASSWORD_HASH');
  },
  /** Public origin without a trailing slash. */
  get SITE_URL(): string {
    return required('SITE_URL').replace(/\/+$/, '');
  },
  get UPLOAD_DIR(): string {
    return process.env.UPLOAD_DIR ?? '/app/uploads';
  },
};

export const isProduction = process.env.NODE_ENV === 'production';
