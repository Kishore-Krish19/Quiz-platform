import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../../src/types';
import { db } from '../config/db';
import type { StoredUser } from '../config/db';
import { loadJwtSecret } from '../config/jwtSecret';

/**
 * A decoded token. sessionId ties a player's token to one sign-in; stamp ties an
 * admin's token to the account's current password.
 */
export interface AuthTokenPayload extends User {
  sessionId?: string;
  stamp?: string;
}

export interface AuthRequest extends Request {
  user?: AuthTokenPayload;
}

let jwtSecret: string | null = null;

/**
 * Loads the signing secret. Must run once at startup, before any token is issued or
 * checked; throws a StartupConfigError when the configured secret is unsafe.
 */
export function initAuth(): void {
  jwtSecret = loadJwtSecret();
}

function signingSecret(): string {
  if (!jwtSecret) {
    throw new Error('initAuth() must run before tokens are issued or verified');
  }
  return jwtSecret;
}

export function generateToken(user: StoredUser, sessionId?: string): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      ...(sessionId ? { sessionId } : {}),
      ...(user.role === 'ADMIN' && user.securityStamp ? { stamp: user.securityStamp } : {}),
    },
    signingSecret(),
    { algorithm: 'HS256', expiresIn: '24h' }
  );
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, signingSecret(), { algorithms: ['HS256'] }) as AuthTokenPayload;
  } catch {
    return null;
  }
}

/**
 * A valid signature proves only that this server issued the token at some point.
 * Whether it still grants access is decided by the account it names, as stored now:
 *
 *  - the account must exist and still hold the role the token claims;
 *  - a player token must belong to the account's current sign-in. One player account =
 *    one signed-in machine: every login mints a fresh session id, so a token from an
 *    earlier sign-in stops working the moment a newer one is issued;
 *  - an admin token must carry the account's current security stamp, which is replaced
 *    whenever the password changes, so changing a leaked password ends every session
 *    opened with it. Admins may still be signed in on several screens at once — the
 *    control panel on a laptop and a projector is normal operating practice.
 *
 * Returns why the token no longer grants access, or null when it does.
 */
function rejectionReason(payload: AuthTokenPayload, record: StoredUser | undefined): string | null {
  if (!record || record.role !== payload.role) {
    return 'This account no longer exists. Please log in again.';
  }

  if (record.role === 'PLAYER') {
    return record.activeSessionId && record.activeSessionId === payload.sessionId
      ? null
      : 'This account has been signed in on another device. Please log in again.';
  }

  if (record.isActive === false) {
    return 'This admin account is disabled.';
  }
  return record.securityStamp && record.securityStamp === payload.stamp
    ? null
    : 'The admin password has changed since this sign-in. Please log in again.';
}

export type AuthOutcome = { user: AuthTokenPayload } | { status: 401 | 403; error: string };

/** Verifies a raw token and resolves it against the stored account. Shared by REST and Socket.IO. */
export function authenticate(token: string): AuthOutcome {
  const payload = verifyToken(token);
  if (!payload) {
    return { status: 403, error: 'Invalid or expired token' };
  }

  const record = db.getUserById(payload.id);
  const reason = rejectionReason(payload, record);
  if (reason || !record) {
    return { status: 401, error: reason || 'Please log in again.' };
  }

  // Identity comes from the account as stored, not from what the token claims.
  return {
    user: {
      ...payload,
      role: record.role,
      username: record.username,
      displayName: record.displayName,
    },
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const outcome = authenticate(token);
  if ('error' in outcome) {
    return res.status(outcome.status).json({ error: outcome.error });
  }

  req.user = outcome.user;
  next();
}

export function requireRole(role: UserRole) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. Requires ${role} role.` });
    }

    next();
  };
}
