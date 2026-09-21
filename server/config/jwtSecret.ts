import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { StartupConfigError } from './startupError';

/** Secrets that have appeared in this repository (README, .env.example, source code). */
const PUBLISHED_SECRETS = ['gadget-code-secret-key-2026-super-secure'];

/** Every player receives a signed token, so a short secret can be brute-forced offline from one. */
const MIN_SECRET_LENGTH = 32;

/** Git-ignored, and outside anything the dev server is allowed to serve (see vite.config.ts). */
export const JWT_SECRET_FILE = path.join(process.cwd(), 'data', '.jwt-secret');

function isPublished(secret: string): boolean {
  return PUBLISHED_SECRETS.includes(secret);
}

/**
 * Resolves the key that signs and verifies every token.
 *
 * JWT_SECRET from the environment wins when it is set, but only if it is long enough and
 * not one that has been published. Otherwise each install generates its own random
 * secret on first start and keeps it in data/.jwt-secret, so tokens survive restarts
 * and no two installs share a key.
 */
export function loadJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();

  if (fromEnv) {
    if (isPublished(fromEnv)) {
      throw new StartupConfigError('JWT_SECRET is the published default from the README.', [
        'Anyone who has read the README can sign their own admin token with it.',
        'Delete the JWT_SECRET line from .env — the server then generates a random secret',
        'for this install and keeps it in data/.jwt-secret — or set at least 32 random characters.',
      ]);
    }
    if (fromEnv.length < MIN_SECRET_LENGTH) {
      throw new StartupConfigError(`JWT_SECRET is shorter than ${MIN_SECRET_LENGTH} characters.`, [
        'Every player receives a token signed with it, so a short secret can be cracked offline.',
        'Delete the JWT_SECRET line from .env to have a random one generated, or make it longer.',
      ]);
    }
    return fromEnv;
  }

  try {
    const stored = fs.readFileSync(JWT_SECRET_FILE, 'utf-8').trim();
    if (stored.length >= MIN_SECRET_LENGTH && !isPublished(stored)) {
      return stored;
    }
  } catch {
    // Not generated yet — fall through and create it.
  }

  const generated = crypto.randomBytes(48).toString('base64url');
  fs.mkdirSync(path.dirname(JWT_SECRET_FILE), { recursive: true });
  fs.writeFileSync(JWT_SECRET_FILE, `${generated}\n`, { encoding: 'utf-8', mode: 0o600 });
  console.log(
    `🔐 Generated a JWT signing secret for this install (${path.relative(process.cwd(), JWT_SECRET_FILE)}).`
  );
  return generated;
}
