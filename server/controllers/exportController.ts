import { Request, Response } from 'express';
import { db } from '../config/db';
import { ScoringService } from '../services/scoringService';
import { quizEngine } from '../services/quizEngine';

export class ExportController {
  /**
   * Export Leaderboard as standard CSV
   */
  public static async exportLeaderboardCsv(req: Request, res: Response) {
    try {
      const roundId = req.query.roundId as string | undefined;
      const leaderboard = ScoringService.calculateLeaderboard(
        roundId,
        quizEngine.getConnectedPlayerUserIds()
      );

      const header = 'Rank,Player Username,Display Name,Total Score,Correct Answers,Questions Answered,Average Response Time (ms)\n';
      const rows = leaderboard
        .map(
          (item) =>
            `${item.rank},"${item.username.replace(/"/g, '""')}","${item.displayName.replace(/"/g, '""')}",${item.score},${item.correctAnswers},${item.questionsAnswered},${item.avgResponseTimeMs}`
        )
        .join('\n');

      const csvContent = header + rows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="gadget_code_leaderboard_${new Date().toISOString().slice(0, 10)}.csv"`
      );
      return res.send(csvContent);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to export CSV' });
    }
  }

  /**
   * Export Detailed Answer Matrix as CSV
   */
  public static async exportAnswersMatrixCsv(req: Request, res: Response) {
    try {
      const users = db.getUsers().filter((u) => u.role === 'PLAYER');
      const questions = db.getQuestions();
      const answers = db.getAnswers();

      // Headers: Player, DisplayName, Q1, Q2, ..., TotalScore
      const qHeaders = questions.map((q, idx) => `Q${idx + 1} (${q.points}pts)`).join(',');
      const header = `Username,Display Name,${qHeaders},Total Score\n`;

      const rows = users.map((u) => {
        let totalScore = 0;
        const qCols = questions.map((q) => {
          const ans = answers.find((a) => a.playerId === u.id && a.questionId === q.id);
          if (!ans) return 'Unanswered (0)';
          totalScore += ans.points || 0;
          return ans.isCorrect ? `Correct (+${ans.points})` : 'Incorrect (0)';
        });
        return `"${u.username}","${u.displayName}",${qCols.join(',')},${totalScore}`;
      });

      const csvContent = header + rows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="gadget_code_detailed_matrix_${new Date().toISOString().slice(0, 10)}.csv"`
      );
      return res.send(csvContent);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to export detailed answers' });
    }
  }

  /**
   * JSON Database Backup
   */
  public static async exportBackupJson(req: Request, res: Response) {
    try {
      const dump = db.exportDump();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="gadget_code_backup_${new Date().toISOString().slice(0, 10)}.json"`
      );
      return res.send(dump);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to generate backup' });
    }
  }
}
