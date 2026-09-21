import express, { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { AdminController } from '../controllers/adminController';
import { QuizController } from '../controllers/quizController';
import { ExportController } from '../controllers/exportController';
import { UploadController, UPLOADS_DIR, MAX_IMAGE_BYTES } from '../controllers/uploadController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { mongoState } from '../config/mongo';
import { db } from '../config/db';

const router = Router();

// Health & Database Diagnostics Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'GADGET CODE Quiz Platform',
    database: {
      connected: mongoState.isConnected,
      mode: mongoState.mode,
      databaseName: mongoState.databaseName,
      error: mongoState.lastError,
    },
  });
});

router.get('/db-status', (req, res) => {
  res.json({
    database: {
      connected: mongoState.isConnected,
      mode: mongoState.mode,
      databaseName: mongoState.databaseName,
      uri: mongoState.uri ? mongoState.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : '',
      error: mongoState.lastError,
      stats: {
        usersCount: db.getUsers().length,
        roundsCount: db.getRounds().length,
        questionsCount: db.getQuestions().length,
        answersCount: db.getAnswers().length,
      },
    },
  });
});

// Quiz Images (public GET — <img src> cannot send an Authorization header)
router.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    fallthrough: false,
    index: false,
    maxAge: '1h',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

// Auth Routes
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticateToken, AuthController.getMe);

// Public / Player Accessible Quiz Routes
router.get('/quiz/state', authenticateToken, QuizController.getState);
router.post('/quiz/answer', authenticateToken, QuizController.submitAnswer);
router.get('/quiz/leaderboard', authenticateToken, QuizController.getLeaderboard);

// Admin Only - Quiz Controls
router.post('/admin/quiz/round', authenticateToken, requireRole('ADMIN'), QuizController.startRound);
router.post('/admin/quiz/start-question', authenticateToken, requireRole('ADMIN'), QuizController.startQuestion);
router.post('/admin/quiz/end-question', authenticateToken, requireRole('ADMIN'), QuizController.endQuestion);
router.post('/admin/quiz/next-question', authenticateToken, requireRole('ADMIN'), QuizController.nextQuestion);
router.post('/admin/quiz/previous-question', authenticateToken, requireRole('ADMIN'), QuizController.previousQuestion);
router.post('/admin/quiz/reset-scores', authenticateToken, requireRole('ADMIN'), AdminController.resetScores);

// Admin Only - Players Management
router.get('/admin/players', authenticateToken, requireRole('ADMIN'), AdminController.getPlayers);
router.post('/admin/players', authenticateToken, requireRole('ADMIN'), AdminController.createPlayer);
router.post('/admin/players/bulk', authenticateToken, requireRole('ADMIN'), AdminController.bulkCreatePlayers);
router.put('/admin/players/:id', authenticateToken, requireRole('ADMIN'), AdminController.updatePlayer);
router.delete('/admin/players/:id', authenticateToken, requireRole('ADMIN'), AdminController.deletePlayer);

// Admin Only - Rounds Management
router.get('/admin/rounds', authenticateToken, requireRole('ADMIN'), AdminController.getRounds);
router.post('/admin/rounds', authenticateToken, requireRole('ADMIN'), AdminController.createRound);
router.put('/admin/rounds/:id', authenticateToken, requireRole('ADMIN'), AdminController.updateRound);
router.delete('/admin/rounds/:id', authenticateToken, requireRole('ADMIN'), AdminController.deleteRound);
router.post('/admin/rounds/set-active', authenticateToken, requireRole('ADMIN'), AdminController.setActiveRound);

// Admin Only - Questions Management
router.get('/admin/rounds/:roundId/questions', authenticateToken, requireRole('ADMIN'), AdminController.getQuestions);
router.post('/admin/rounds/:roundId/questions', authenticateToken, requireRole('ADMIN'), AdminController.createQuestion);
router.put('/admin/questions/:id', authenticateToken, requireRole('ADMIN'), AdminController.updateQuestion);
router.delete('/admin/questions/:id', authenticateToken, requireRole('ADMIN'), AdminController.deleteQuestion);

// Admin Only - Image Uploads (raw image body, parsed before the JSON body parser sees it)
router.post(
  '/admin/uploads',
  authenticateToken,
  requireRole('ADMIN'),
  express.raw({ type: 'image/*', limit: MAX_IMAGE_BYTES }),
  UploadController.uploadImage
);

// Admin Only - Settings & Exports
router.get('/admin/settings', authenticateToken, requireRole('ADMIN'), AdminController.getSettings);
router.put('/admin/settings', authenticateToken, requireRole('ADMIN'), AdminController.updateSettings);
router.get('/admin/export/leaderboard.csv', authenticateToken, requireRole('ADMIN'), ExportController.exportLeaderboardCsv);
router.get('/admin/export/matrix.csv', authenticateToken, requireRole('ADMIN'), ExportController.exportAnswersMatrixCsv);
router.get('/admin/export/backup.json', authenticateToken, requireRole('ADMIN'), ExportController.exportBackupJson);

export default router;
