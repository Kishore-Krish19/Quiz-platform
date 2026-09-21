import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../config/db';
import { generateToken, AuthRequest } from '../middleware/auth';
import { quizEngine } from '../services/quizEngine';

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

      const user = db.getUserByUsername(username);
      if (!user) {
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
