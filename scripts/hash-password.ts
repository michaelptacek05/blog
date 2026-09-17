/**
 * Prints an argon2id hash for ADMIN_PASSWORD_HASH.
 *
 *   docker compose exec web npm run hash-password
 *
 * The password is read from stdin (not from argv) so it does not end up in the
 * shell history or the process list.
 */
import { createInterface } from 'node:readline/promises';
import { hashPassword } from '../src/lib/auth/password';

async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });

  // Not trimmed: login compares the password exactly as typed, so a hash of a
  // trimmed copy would never match a password with outer spaces.
  const password = await rl.question('Heslo: ');
  rl.close();

  if (password.length < 8) {
    console.error('Heslo musí mít aspoň 8 znaků.');
    process.exit(1);
  }

  const hash = await hashPassword(password);

  // Stored base64 so neither Docker Compose's env_file interpolation nor
  // Next's .env loader can mangle the '$' separators. See decodeHash().
  const encoded = Buffer.from(hash, 'utf8').toString('base64');

  console.error('\nVlož do .env (hash je base64, aby přežil Compose i Next):\n');
  console.log(`ADMIN_PASSWORD_HASH=${encoded}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
