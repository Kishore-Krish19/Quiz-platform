import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../config/db';

/**
 * Passwords that have been published — in the README, on the login pages or in the
 * source — and so must never be what guards a real account.
 */
export const PUBLISHED_PASSWORDS = ['Admin@123', 'player123', 'quiz123'];

export const MIN_ADMIN_PASSWORD_LENGTH = 10;

// Lowercase letters and digits without the look-alikes (0/o, 1/l/i), so a password read
// off a printed slip is typed correctly the first time.
const PLAYER_PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** 8 characters from a 31-character alphabet: about 40 bits, far beyond online guessing. */
export function generatePlayerPassword(length = 8): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += PLAYER_PASSWORD_ALPHABET[crypto.randomInt(PLAYER_PASSWORD_ALPHABET.length)];
  }
  return password;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Replaced whenever an admin's password changes; admin tokens are only honoured while they carry it. */
export function newSecurityStamp(): string {
  return crypto.randomBytes(16).toString('hex');
}

/** Why a proposed admin password is unacceptable, or null when it is fine. */
export function adminPasswordProblem(password: string): string | null {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`;
  }
  if (PUBLISHED_PASSWORDS.some((published) => published.toLowerCase() === password.toLowerCase())) {
    return 'is one of the published default passwords';
  }
  return null;
}

/**
 * Player accounts whose password hash is also held by another player — each can sign in
 * as the other. Bulk-created and seeded players shared one hash before passwords were
 * generated per account, which makes this a cheap check with no bcrypt work.
 */
export function playersSharingPasswords(): Set<string> {
  const idsByHash = new Map<string, string[]>();
  for (const user of db.getUsers()) {
    if (user.role !== 'PLAYER') continue;
    const ids = idsByHash.get(user.passwordHash) || [];
    ids.push(user.id);
    idsByHash.set(user.passwordHash, ids);
  }

  const sharing = new Set<string>();
  idsByHash.forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => sharing.add(id));
  });
  return sharing;
}

/** True when the hash is of a password that has been published. */
export async function isPublishedPassword(passwordHash: string): Promise<boolean> {
  for (const published of PUBLISHED_PASSWORDS) {
    if (await bcrypt.compare(published, passwordHash)) return true;
  }
  return false;
}
