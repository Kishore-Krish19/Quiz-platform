import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { quizEngine } from '../services/quizEngine';
import { ScoringService } from '../services/scoringService';
import { db } from '../config/db';

export class QuizController {
  public static async getState(req: AuthRequest, res: Response) {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const state = quizEngine.getCurrentState(isAdmin);
      return res.json({ state });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch quiz state' });
    }
  }

  public static async startRound(req: AuthRequest, res: Response) {
    try {
      const { roundId } = req.body;
      if (!roundId) {
        return res.status(400).json({ error: 'roundId is required' });
      }

      const session = quizEngine.setActiveRound(roundId);
      return res.json({ message: 'Round started', session });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to start round' });
    }
  }

  public static async startQuestion(req: AuthRequest, res: Response) {
    try {
      const { questionId, duration } = req.body;
      const safeQuestion = quizEngine.startQuestion(questionId, duration ? Number(duration) : undefined);
      return res.json({ message: 'Question started', question: safeQuestion });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to start question' });
    }
  }

  public static async endQuestion(req: AuthRequest, res: Response) {
    try {
      quizEngine.endCurrentQuestion();
      return res.json({ message: 'Question ended' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to end question' });
    }
  }

  public static async nextQuestion(req: AuthRequest, res: Response) {
    try {
      const result = quizEngine.nextQuestion();
      return res.json({ result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to advance to next question' });
    }
  }

  public static async previousQuestion(req: AuthRequest, res: Response) {
    try {
      const prevQ = quizEngine.previousQuestion();
      return res.json({ question: prevQ });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to move to previous question' });
    }
  }

  public static async submitAnswer(req: AuthRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== 'PLAYER') {
        return res.status(403).json({ error: 'Only players can submit answers' });
      }

      const { questionId, selectedOptionId } = req.body;
      if (!questionId || !selectedOptionId) {
        return res.status(400).json({ error: 'questionId and selectedOptionId are required' });
      }

      const result = quizEngine.submitAnswer(req.user.id, questionId, selectedOptionId);
      return res.json({ result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Answer submission rejected' });
    }
  }

  public static async getLeaderboard(req: Request, res: Response) {
    try {
      const roundId = req.query.roundId as string | undefined;
      const session = db.getQuizSession();
      const leaderboard = ScoringService.calculateLeaderboard(
        roundId,
        quizEngine.getConnectedPlayerUserIds(),
        session?.status === 'QUESTION_ACTIVE' ? session.currentQuestionId || undefined : undefined
      );
      return res.json({ leaderboard });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  }
}
