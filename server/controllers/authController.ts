import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../config/db';
import { generateToken, AuthRequest } from '../middleware/auth';
import { loginRetryAfterMs, recordLoginFailure } from '../middleware/loginThrottle';
import { quizEngine } from '../services/quizEngine';
import { adminPasswordProblem, hashPassword, newSecurityStamp } from '../services/passwordService';

const MAX_DISPLAY_NAME = 40;

/**
 * Players type this themselves at every login, so it is untrusted input that ends up
 * on the leaderboard, in the connection roster and in the exported CSVs.
 * Returns null when nothing usable was supplied, meaning "keep the existing name".
 */
function sanitizeDisplayName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;

  let name = raw
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // control characters
    .replace(/\s+/g, ' ')
    .trim();

  // A leading =, +, - or @ turns the cell into a formula when a leaderboard export
  // is opened in Excel. This field is player-supplied and lands in those exports.
  name = name.replace(/^[=+\-@]+/, '').trim();

  if (!name) return null;
  return name.slice(0, MAX_DISPLAY_NAME);
}

export class AuthController {
  public static async login(req: Request, res: Response) {
    try {
      const { username, password, expectedRole, displayName } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const retryAfterMs = loginRetryAfterMs(clientIp);
      if (retryAfterMs > 0) {
        res.setHeader('Retry-After', Math.ceil(retryAfterMs / 1000));
        return res.status(429).json({
          error: `Too many failed sign-in attempts from this machine. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`,
        });
      }

      const user = db.getUserByUsername(username);
      if (!user) {
        recordLoginFailure(clientIp);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is disabled. Contact event administrator.' });
      }

      if (expectedRole && user.role !== expectedRole) {
        return res.status(403).json({
          error: `Account role is ${user.role}. Please login via the correct portal.`,
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        recordLoginFailure(clientIp);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Players name themselves on the way in; admins keep a stable identity.
      let activeUser = user;
      let sessionId: string | undefined;

      if (user.role === 'PLAYER') {
        const requestedName = sanitizeDisplayName(displayName);
        if (!requestedName) {
          return res.status(400).json({
            error: 'A display name is required. Enter the name you want on the leaderboard.',
          });
        }

        // One account, one machine. Rejected rather than taking over, so a competitor
        // cannot silently boot a teammate off mid-question. Clears itself as soon as
        // the other device disconnects; an admin can force sign-out a stuck one.
        if (quizEngine.isPlayerConnected(user.id)) {
          return res.status(409).json({
            error:
              'This player account is already signed in on another device. Sign out there first, or ask the event admin to release it.',
          });
        }

        // A fresh session id invalidates every token from an earlier sign-in.
        sessionId = crypto.randomUUID();
        activeUser =
          db.updateUser(user.id, { displayName: requestedName, activeSessionId: sessionId }) || user;
      } else if (!user.securityStamp) {
        // Admin tokens are bound to the account's security stamp; accounts from before
        // stamps existed get one on first sign-in.
        activeUser = db.updateUser(user.id, { securityStamp: newSecurityStamp() }) || user;
      }

      // Generated after the rename so the token carries the name in play.
      const token = generateToken(activeUser, sessionId);

      return res.json({
        token,
        user: {
          id: activeUser.id,
          username: activeUser.username,
          displayName: activeUser.displayName,
          role: activeUser.role,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error during authentication' });
    }
  }

  /**
   * Lets a signed-in admin replace their own password. The security stamp is replaced
   * with it, which ends every other session opened with the old password — including
   * open control-panel sockets, which receive the live answer key. The caller gets a
   * fresh token so their own screen carries on.
   */
  public static async changeAdminPassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const account = req.user ? db.getUserById(req.user.id) : undefined;
      if (!account || account.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only an admin can change the admin password' });
      }

      if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
      }

      if (!(await bcrypt.compare(currentPassword, account.passwordHash))) {
        return res.status(401).json({ error: 'The current password is incorrect' });
      }

      const problem = adminPasswordProblem(newPassword);
      if (problem) {
        return res.status(400).json({ error: `The new password ${problem}.` });
      }
      if (newPassword === currentPassword) {
        return res.status(400).json({ error: 'The new password must differ from the current one.' });
      }

      const updated = db.updateUser(account.id, {
        passwordHash: await hashPassword(newPassword),
        securityStamp: newSecurityStamp(),
      });
      if (!updated) {
        return res.status(404).json({ error: 'Admin account not found' });
      }

      quizEngine.disconnectUser(updated.id);

      return res.json({
        token: generateToken(updated),
        user: {
          id: updated.id,
          username: updated.username,
          displayName: updated.displayName,
          role: updated.role,
        },
      });
    } catch (err) {
      console.error('Admin password change error:', err);
      return res.status(500).json({ error: 'Failed to change the admin password' });
    }
  }

  public static async getMe(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  }
}
