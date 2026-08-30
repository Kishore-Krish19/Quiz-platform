import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import os from 'os';
import { db } from '../config/db';
import { quizEngine } from '../services/quizEngine';

export class AdminController {
  // --- Players Management ---
  public static async getPlayers(req: Request, res: Response) {
    try {
      const users = db.getUsers().filter((u) => u.role === 'PLAYER');
      const connectedSet = quizEngine.getConnectedPlayerUserIds();
      const answers = db.getAnswers();

      const players = users.map((u) => {
        const playerAnswers = answers.filter((a) => a.playerId === u.id);
        const score = playerAnswers.reduce((sum, a) => sum + (a.points || 0), 0);
        const correctCount = playerAnswers.filter((a) => a.isCorrect).length;

        return {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          isActive: u.isActive !== false,
          isConnected: connectedSet.has(u.id),
          score,
          correctAnswers: correctCount,
          questionsAnswered: playerAnswers.length,
          createdAt: u.createdAt,
        };
      });

      // Sort by score desc
      players.sort((a, b) => b.score - a.score);

      return res.json({ players });
    } catch (err) {
      console.error('Error fetching players:', err);
      return res.status(500).json({ error: 'Failed to fetch players' });
    }
  }

  public static async createPlayer(req: Request, res: Response) {
    try {
      const { username, displayName, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const existing = db.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = db.addUser({
        username: username.trim(),
        displayName: (displayName || username).trim(),
        passwordHash,
        role: 'PLAYER',
        isActive: true,
      });

      return res.status(201).json({
        player: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          isActive: user.isActive,
        },
      });
    } catch (err) {
      console.error('Error creating player:', err);
      return res.status(500).json({ error: 'Failed to create player' });
    }
  }

  public static async bulkCreatePlayers(req: Request, res: Response) {
    try {
      const { count, prefix = 'player', defaultPassword = 'quiz123' } = req.body;
      const num = Math.min(100, Math.max(1, parseInt(count) || 10));

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      const createdList: any[] = [];
      const currentUsers = db.getUsers();

      for (let i = 1; i <= num; i++) {
        const padIndex = i.toString().padStart(2, '0');
        const username = `${prefix}${padIndex}`;

        if (!currentUsers.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
          const user = db.addUser({
            username,
            displayName: `Player ${padIndex}`,
            passwordHash,
            role: 'PLAYER',
            isActive: true,
          });
          createdList.push({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
          });
        }
      }

      return res.json({
        message: `Successfully created ${createdList.length} players`,
        players: createdList,
        defaultPassword,
      });
    } catch (err) {
      console.error('Bulk player create error:', err);
      return res.status(500).json({ error: 'Failed to bulk create players' });
    }
  }

  public static async updatePlayer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { displayName, isActive, password } = req.body;

      const updates: any = {};
      if (displayName !== undefined) updates.displayName = displayName;
      if (isActive !== undefined) updates.isActive = isActive;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updates.passwordHash = await bcrypt.hash(password, salt);
      }

      const updated = db.updateUser(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Player not found' });
      }

      return res.json({
        player: {
          id: updated.id,
          username: updated.username,
          displayName: updated.displayName,
          isActive: updated.isActive,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update player' });
    }
  }

  public static async deletePlayer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const removed = db.deleteUser(id);
      if (!removed) {
        return res.status(404).json({ error: 'Player not found' });
      }
      return res.json({ message: 'Player removed successfully', id });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete player' });
    }
  }

  // --- Rounds Management ---
  public static async getRounds(req: Request, res: Response) {
    try {
      const rounds = db.getRounds();
      const questions = db.getQuestions();

      const roundsWithCounts = rounds.map((r) => {
        const qCount = questions.filter((q) => q.roundId === r.id).length;
        return {
          ...r,
          totalQuestions: qCount,
        };
      });

      return res.json({ rounds: roundsWithCounts });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch rounds' });
    }
  }

  public static async createRound(req: Request, res: Response) {
    try {
      const { name, description, defaultDuration = 10, scoringConfig } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Round name is required' });
      }

      const rounds = db.getRounds();
      const nextNumber = rounds.length > 0 ? Math.max(...rounds.map((r) => r.roundNumber || 0)) + 1 : 1;

      const round = db.addRound({
        roundNumber: nextNumber,
        name: name.trim(),
        description: description?.trim() || '',
        status: 'READY',
        defaultDuration: Number(defaultDuration) || 10,
        scoringConfig: scoringConfig || {
          type: 'SPEED_BASED',
          basePoints: 1000,
          minPoints: 100,
        },
      });

      return res.status(201).json({ round });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create round' });
    }
  }

  public static async updateRound(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, status, defaultDuration, scoringConfig } = req.body;

      const updates: any = {};
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (status) updates.status = status;
      if (defaultDuration !== undefined) updates.defaultDuration = Number(defaultDuration);
      if (scoringConfig) updates.scoringConfig = scoringConfig;

      const updated = db.updateRound(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Round not found' });
      }

      return res.json({ round: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update round' });
    }
  }

  public static async deleteRound(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const removed = db.deleteRound(id);
      if (!removed) {
        return res.status(404).json({ error: 'Round not found' });
      }
      return res.json({ message: 'Round and associated questions deleted', id });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete round' });
    }
  }

  public static async setActiveRound(req: Request, res: Response) {
    try {
      const { roundId } = req.body;
      if (!roundId) {
        return res.status(400).json({ error: 'roundId is required' });
      }

      const session = quizEngine.setActiveRound(roundId);
      return res.json({ message: 'Active round updated', session });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to set active round' });
    }
  }

  // --- Questions Management ---
  public static async getQuestions(req: Request, res: Response) {
    try {
      const { roundId } = req.params;
      const questions = db.getQuestions(roundId);
      return res.json({ questions });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }
  }

  public static async createQuestion(req: Request, res: Response) {
    try {
      const { roundId } = req.params;
      const { text, options, correctOptionId, duration = 10, points = 1000, explanation, type = 'MCQ' } = req.body;

      if (!text || !options || !Array.isArray(options) || options.length < 2 || !correctOptionId) {
        return res.status(400).json({ error: 'Question text, valid options, and correctOptionId are required' });
      }

      const questions = db.getQuestions(roundId);
      const nextOrder = questions.length + 1;

      const question = db.addQuestion({
        roundId,
        order: nextOrder,
        type,
        text: text.trim(),
        options,
        correctOptionId,
        duration: Number(duration) || 10,
        points: Number(points) || 1000,
        explanation: explanation?.trim() || '',
        isActive: true,
      });

      return res.status(201).json({ question });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create question' });
    }
  }

  public static async updateQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { text, options, correctOptionId, duration, points, explanation, order } = req.body;

      const updates: any = {};
      if (text) updates.text = text;
      if (options) updates.options = options;
      if (correctOptionId) updates.correctOptionId = correctOptionId;
      if (duration !== undefined) updates.duration = Number(duration);
      if (points !== undefined) updates.points = Number(points);
      if (explanation !== undefined) updates.explanation = explanation;
      if (order !== undefined) updates.order = Number(order);

      const updated = db.updateQuestion(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Question not found' });
      }

      return res.json({ question: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update question' });
    }
  }

  public static async deleteQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const removed = db.deleteQuestion(id);
      if (!removed) {
        return res.status(404).json({ error: 'Question not found' });
      }
      return res.json({ message: 'Question deleted', id });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete question' });
    }
  }

  // --- Settings & LAN System Status ---
  public static async getSettings(req: Request, res: Response) {
    try {
      const settings = db.getEventSettings();
      const networkInterfaces = os.networkInterfaces();
      const lanIps: string[] = [];

      Object.keys(networkInterfaces).forEach((ifaceName) => {
        networkInterfaces[ifaceName]?.forEach((iface) => {
          if (iface.family === 'IPv4' && !iface.internal) {
            lanIps.push(iface.address);
          }
        });
      });

      return res.json({
        settings,
        system: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          platform: process.platform,
          memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
          lanIps: lanIps.length > 0 ? lanIps : ['127.0.0.1'],
          port: process.env.PORT || 3000,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to get settings' });
    }
  }

  public static async updateSettings(req: Request, res: Response) {
    try {
      const updated = db.setEventSettings(req.body);
      return res.json({ settings: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  public static async resetScores(req: Request, res: Response) {
    try {
      const { roundId } = req.body;
      db.resetQuizProgress(roundId);
      return res.json({ message: 'Quiz progress and scores reset successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reset scores' });
    }
  }
}
