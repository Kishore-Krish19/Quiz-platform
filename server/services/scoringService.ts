import { LeaderboardEntry, Question, ScoringConfig, User } from '../../src/types';
import { db } from '../config/db';

export class ScoringService {
  /**
   * Calculates points for a given question answer
   */
  public static calculatePoints(
    isCorrect: boolean,
    responseTimeMs: number,
    durationSeconds: number,
    scoringConfig: ScoringConfig = { type: 'SPEED_BASED', basePoints: 1000, minPoints: 100 }
  ): number {
    if (!isCorrect) {
      return 0;
    }

    const durationMs = durationSeconds * 1000;
    const basePoints = scoringConfig.basePoints || 1000;
    const minPoints = scoringConfig.minPoints ?? 100;

    switch (scoringConfig.type) {
      case 'FIXED':
        return basePoints;

      case 'SPEED_BASED': {
        // Speed ratio based on how much time was left when answered
        const timeRemainingMs = Math.max(0, durationMs - responseTimeMs);
        const speedRatio = timeRemainingMs / durationMs;
        // Calculate points with linear interpolation between minPoints and basePoints
        const points = Math.round(minPoints + (basePoints - minPoints) * speedRatio);
        return Math.max(minPoints, Math.min(basePoints, points));
      }

      case 'CUSTOM':
      default: {
        const speedRatio = Math.max(0, 1 - responseTimeMs / durationMs);
        return Math.round(basePoints * speedRatio);
      }
    }
  }

  /**
   * Computes authoritative leaderboard for an active round or overall
   */
  public static calculateLeaderboard(roundId?: string, connectedPlayerIds: Set<string> = new Set()): LeaderboardEntry[] {
    const players: User[] = db.getUsers().filter((u) => u.role === 'PLAYER' && u.isActive !== false);
    const answers = db.getAnswers(roundId ? { roundId } : undefined);

    const playerStatsMap = new Map<
      string,
      {
        score: number;
        correctAnswers: number;
        questionsAnswered: number;
        totalResponseTimeMs: number;
        lastPointsEarned: number;
      }
    >();

    players.forEach((p) => {
      playerStatsMap.set(p.id, {
        score: 0,
        correctAnswers: 0,
        questionsAnswered: 0,
        totalResponseTimeMs: 0,
        lastPointsEarned: 0,
      });
    });

    // Aggregate answers
    answers.forEach((ans) => {
      const stats = playerStatsMap.get(ans.playerId);
      if (stats) {
        stats.score += ans.points || 0;
        if (ans.isCorrect) {
          stats.correctAnswers += 1;
        }
        stats.questionsAnswered += 1;
        stats.totalResponseTimeMs += ans.responseTimeMs || 0;
        stats.lastPointsEarned = ans.points || 0;
      }
    });

    const entries: LeaderboardEntry[] = players.map((p) => {
      const stats = playerStatsMap.get(p.id) || {
        score: 0,
        correctAnswers: 0,
        questionsAnswered: 0,
        totalResponseTimeMs: 0,
        lastPointsEarned: 0,
      };

      const avgResponseTimeMs =
        stats.questionsAnswered > 0 ? Math.round(stats.totalResponseTimeMs / stats.questionsAnswered) : 0;

      return {
        rank: 1,
        playerId: p.id,
        username: p.username,
        displayName: p.displayName || p.username,
        score: stats.score,
        correctAnswers: stats.correctAnswers,
        questionsAnswered: stats.questionsAnswered,
        avgResponseTimeMs,
        isConnected: connectedPlayerIds.has(p.id),
        lastPointsEarned: stats.lastPointsEarned,
      };
    });

    // Deterministic tie-breaking:
    // 1. Higher total score
    // 2. Higher number of correct answers
    // 3. Lower total response time (faster)
    // 4. Alphabetical username
    entries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      if (a.avgResponseTimeMs !== b.avgResponseTimeMs) {
        return a.avgResponseTimeMs - b.avgResponseTimeMs;
      }
      return a.username.localeCompare(b.username);
    });

    // Assign rank 1, 2, 3...
    entries.forEach((item, index) => {
      item.rank = index + 1;
    });

    return entries;
  }
}
