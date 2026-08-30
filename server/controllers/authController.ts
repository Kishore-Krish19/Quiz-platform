import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db';
import { generateToken, AuthRequest } from '../middleware/auth';

export class AuthController {
  public static async login(req: Request, res: Response) {
    try {
      const { username, password, expectedRole } = req.body;

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

      const token = generateToken(user);

      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
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
