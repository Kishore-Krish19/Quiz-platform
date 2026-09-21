import { Server as SocketIOServer, Socket } from 'socket.io';
import { authenticate } from '../middleware/auth';
import { quizEngine } from '../services/quizEngine';
import { ScoringService } from '../services/scoringService';
import { db } from '../config/db';
import { ClientToServerEvents, ServerToClientEvents, User } from '../../src/types';

export function setupQuizSocket(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
  // Middleware for Socket.IO authentication
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication token required for WebSocket connection'));
    }

    // Same check as the REST API: a signature alone is not enough, the token must also
    // match a real account as stored now. Only a genuine admin may join the 'admins'
    // room, which receives the live answer key.
    const outcome = authenticate(token);
    if ('error' in outcome) {
      return next(new Error(outcome.error));
    }

    socket.data.user = outcome.user;
    next();
  });

  // Broadcast connection status to all
  const broadcastConnectionStatus = () => {
    const connectedIds = quizEngine.getConnectedPlayerUserIds();
    const allPlayers = db.getUsers().filter((u) => u.role === 'PLAYER');

    const statusList = allPlayers.map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.displayName,
      isConnected: connectedIds.has(p.id),
    }));

    io.emit('player:connection_status', {
      count: connectedIds.size,
      players: statusList,
    });
  };

  // Wire up QuizEngine event broadcasts
  quizEngine.onStateChange((state) => {
    // Send full state to admins
    io.to('admins').emit('quiz:state', quizEngine.getCurrentState(true));
    // Send player-safe state to players
    io.to('players').emit('quiz:state', quizEngine.getCurrentState(false));

    // Also broadcast updated leaderboard
    const leaderboard = ScoringService.calculateLeaderboard(
      state.activeRoundId || undefined,
      quizEngine.getConnectedPlayerUserIds(),
      state.status === 'QUESTION_ACTIVE' ? state.currentQuestionId || undefined : undefined
    );
    io.emit('quiz:leaderboard_updated', leaderboard);
  });

  quizEngine.onQuestionStart((safeQuestion) => {
    io.emit('quiz:question_started', safeQuestion);
  });

  quizEngine.onQuestionEnd((data) => {
    io.emit('quiz:question_ended', data);

    // The question is closed, so the embargo lifts: every player who answered now
    // receives their own result, privately and all at the same moment.
    quizEngine.getQuestionResults(data.questionId).forEach((result) => {
      io.to(`user_${result.playerId}`).emit('player:answer_result', result);
    });
    // Broadcast updated leaderboard right after question ends
    const session = db.getQuizSession();
    const leaderboard = ScoringService.calculateLeaderboard(
      session?.activeRoundId || undefined,
      quizEngine.getConnectedPlayerUserIds()
    );
    io.emit('quiz:leaderboard_updated', leaderboard);
  });

  quizEngine.onRoundCompleted((data) => {
    io.emit('quiz:round_completed', data);
  });

  quizEngine.onAnswerSubmitted((stats) => {
    io.emit('quiz:player_answered_update', stats);
  });

  // Operator escape hatch: drop every socket held by one player account.
  quizEngine.onForceDisconnect((userId) => {
    io.in(`user_${userId}`).disconnectSockets(true);
  });

  // Handle individual client connections
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as User;
    if (!user) return;

    // Register with quiz engine
    quizEngine.registerSocket(socket.id, user.id, user.role);

    // Join role-specific and user-specific rooms
    if (user.role === 'ADMIN') {
      socket.join('admins');
    } else {
      socket.join('players');
    }
    socket.join(`user_${user.id}`);

    // Send immediate sync to connecting client
    const isAdmin = user.role === 'ADMIN';
    socket.emit('quiz:state', quizEngine.getCurrentState(isAdmin));
    // quiz:state carries only a top-10 preview; send the full standings as well, or a
    // player ranked 11th or lower reads "0 PTS, rank —" until the next state change.
    socket.emit('quiz:leaderboard_updated', quizEngine.getPublicLeaderboard());

    // Replay this player's own answer for the question in play, so a reload or a
    // dropped connection mid-question does not strand them without their result.
    const restorePlayerAnswer = () => {
      if (user.role !== 'PLAYER') return;
      const restored = quizEngine.getRestorableAnswer(user.id);
      if (restored) {
        socket.emit('player:answer_restored', restored);
      }
    };
    restorePlayerAnswer();

    // Broadcast updated player counts
    broadcastConnectionStatus();

    // --- Client event handlers ---

    // Sync request
    socket.on('quiz:request_sync', () => {
      socket.emit('quiz:state', quizEngine.getCurrentState(user.role === 'ADMIN'));
      socket.emit('quiz:leaderboard_updated', quizEngine.getPublicLeaderboard());
      restorePlayerAnswer();
    });

    // Player submit answer
    socket.on('player:submit_answer', (data) => {
      try {
        if (user.role !== 'PLAYER') {
          return socket.emit('system:error', 'Only registered players can submit answers');
        }

        const result = quizEngine.submitAnswer(user.id, data.questionId, data.selectedOptionId);

        // Send private answer confirmation and points to the submitting player
        socket.emit('player:answer_result', result);

        // Notify admins of live update
        const session = db.getQuizSession();
        const answers = session?.currentQuestionId ? db.getAnswers({ questionId: session.currentQuestionId }) : [];
        const correctCount = answers.filter((a) => a.isCorrect).length;

        io.to('admins').emit('admin:stats_update', {
          connectedCount: quizEngine.getConnectedPlayerCount(),
          answeredCount: answers.length,
          correctCount,
          incorrectCount: answers.length - correctCount,
        });
      } catch (err: any) {
        socket.emit('system:error', err.message || 'Submission error');
      }
    });

    // Admin controls via Socket
    socket.on('admin:start_round', (data) => {
      if (user.role !== 'ADMIN') return;
      try {
        quizEngine.setActiveRound(data.roundId, { endLiveQuestion: data.endLiveQuestion === true });
      } catch (err: any) {
        socket.emit('system:error', err.message);
      }
    });

    socket.on('admin:start_question', (data) => {
      if (user.role !== 'ADMIN') return;
      try {
        quizEngine.startQuestion(data?.questionId);
      } catch (err: any) {
        socket.emit('system:error', err.message);
      }
    });

    socket.on('admin:end_question', () => {
      if (user.role !== 'ADMIN') return;
      try {
        quizEngine.endCurrentQuestion();
      } catch (err: any) {
        socket.emit('system:error', err.message);
      }
    });

    socket.on('admin:next_question', () => {
      if (user.role !== 'ADMIN') return;
      try {
        quizEngine.nextQuestion();
      } catch (err: any) {
        socket.emit('system:error', err.message);
      }
    });

    socket.on('admin:previous_question', () => {
      if (user.role !== 'ADMIN') return;
      try {
        quizEngine.previousQuestion();
      } catch (err: any) {
        socket.emit('system:error', err.message);
      }
    });

    socket.on('admin:reset_round', (data) => {
      if (user.role !== 'ADMIN') return;
      try {
        quizEngine.resetRound(data.roundId);
      } catch (err: any) {
        socket.emit('system:error', err.message);
      }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      quizEngine.unregisterSocket(socket.id);
      broadcastConnectionStatus();
    });
  });
}
