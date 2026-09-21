import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../../src/types';
import { db } from '../config/db';

/** A decoded token. sessionId ties a player's token to one sign-in. */
export interface AuthTokenPayload extends User {
  sessionId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'gadget-code-secret-key-2026-super-secure';

export interface AuthRequest extends Request {
  user?: AuthTokenPayload;
}

export function generateToken(user: User, sessionId?: string): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      ...(sessionId ? { sessionId } : {}),
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * One player account = one signed-in machine. Every player login mints a fresh
 * sessionId on the account, so any token from an earlier sign-in stops working the
 * instant a newer one is issued — a stale tab cannot keep playing alongside it.
 *
 * Admins are exempt: running the control panel on a laptop and a projector at the
 * same time is normal operating practice.
 */
export function isSessionCurrent(payload: AuthTokenPayload): boolean {
  if (payload.role !== 'PLAYER') return true;

  const record = db.getUserById(payload.id);
  if (!record) return false;

  return !!record.activeSessionId && record.activeSessionId === payload.sessionId;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  if (!isSessionCurrent(user)) {
    return res.status(401).json({
      error: 'This account has been signed in on another device. Please log in again.',
    });
  }

  req.user = user;
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
