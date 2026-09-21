import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  AnswerResult,
  AnswerSubmission,
  LeaderboardEntry,
  QuizSessionState,
  SafeQuestion,
  User,
} from '../types';
import { useAuth } from './authContext';
import { sounds } from '../utils/soundEffects';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  /** serverNow = Date.now() + serverTimeOffset. See the quiz:state handler. */
  serverTimeOffset: number;
  quizState: QuizSessionState | null;
  leaderboard: LeaderboardEntry[];
  lastAnswerResult: AnswerResult | null;
  selectedOptionId: string | null;
  isAnswerSubmitted: boolean;
  error: string | null;
  submitAnswer: (questionId: string, selectedOptionId: string) => void;
  setSelectedOptionId: (optId: string | null) => void;
  refreshState: () => void;
  // Admin commands
  startRound: (roundId: string) => void;
  startQuestion: (questionId?: string, duration?: number) => void;
  endQuestion: () => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  resetRound: (roundId: string) => void;
}

// How long answered-count pings are batched before a single re-render. Long enough
// to collapse a 100-player answer burst, short enough that the counter still reads live.
const PROGRESS_FLUSH_MS = 250;

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [quizState, setQuizState] = useState<QuizSessionState | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lastAnswerResult, setLastAnswerResult] = useState<AnswerResult | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    setIsConnecting(true);

    let pendingProgress: { questionId: string; answeredCount: number; totalConnected: number } | null = null;
    let progressTimer: ReturnType<typeof setTimeout> | null = null;

    const flushProgress = () => {
      progressTimer = null;
      const next = pendingProgress;
      pendingProgress = null;
      if (!next) return;

      setQuizState((prev) => {
        if (!prev) return prev;
        // A ping for a question that is no longer in play would paint a stale count
        // over the next question's fresh zero.
        if (prev.currentQuestionId !== next.questionId) return prev;
        if (
          prev.answeredPlayersCount === next.answeredCount &&
          prev.connectedPlayersCount === next.totalConnected
        ) {
          return prev;
        }
        return {
          ...prev,
          answeredPlayersCount: next.answeredCount,
          connectedPlayersCount: next.totalConnected,
        };
      });
    };

    const newSocket = io({
      auth: { token },
      query: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 30,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      newSocket.emit('quiz:request_sync');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setIsConnecting(true);
    });

    newSocket.on('connect_error', (err) => {
      setIsConnected(false);
      setIsConnecting(false);
      setError(err.message || 'Connection error');
    });

    newSocket.on('quiz:state', (state: QuizSessionState) => {
      // questionEndsAt is a SERVER timestamp. Rendering a countdown as
      // (questionEndsAt - Date.now()) measures it against this machine's clock, so an
      // unsynced lab PC shows a countdown wrong by exactly its clock skew — the
      // question still ends on time, but the number on screen lies. Track how far this
      // clock sits from the server's and let the timer render server-relative time.
      // The threshold ignores network jitter while still catching real drift.
      if (typeof state.serverTime === 'number') {
        const offset = state.serverTime - Date.now();
        setServerTimeOffset((prev) => (Math.abs(prev - offset) > 200 ? offset : prev));
      }

      setQuizState(state);
      if (state.leaderboardPreview && state.leaderboardPreview.length > 0) {
        setLeaderboard(state.leaderboardPreview);
      }
      // If question changed or ended, reset submission lock if appropriate
      if (state.status === 'WAITING' || state.status === 'ROUND_COMPLETED') {
        setSelectedOptionId(null);
        setIsAnswerSubmitted(false);
      }
    });

    newSocket.on('quiz:question_started', (question: SafeQuestion) => {
      setSelectedOptionId(null);
      setIsAnswerSubmitted(false);
      setLastAnswerResult(null);
      sounds.playQuestionStart();
    });

    newSocket.on('quiz:question_ended', (data) => {
      sounds.playTimesUp();
    });

    newSocket.on('quiz:round_completed', (data) => {
      setLeaderboard(data.finalLeaderboard);
      sounds.playRoundComplete();
    });

    newSocket.on('quiz:leaderboard_updated', (updatedLeaderboard: LeaderboardEntry[]) => {
      setLeaderboard(updatedLeaderboard);
    });

    newSocket.on('player:answer_result', (result: AnswerResult) => {
      // Arrives twice: a bare receipt on submit, then the full result once the
      // question closes. No sound here — the player screen owns the reveal chime,
      // so nothing gives the answer away early.
      setLastAnswerResult(result);
    });

    // One progress ping is broadcast per submission, so a 40-player burst delivers 40
    // of them within a few hundred milliseconds. Coalesce into at most one re-render
    // per tick, and drop the update entirely when nothing visible moved — otherwise
    // every client re-renders the whole quiz screen N times at peak load.
    newSocket.on('quiz:player_answered_update', (stats) => {
      // Progress only — how many have answered, never who was right.
      pendingProgress = stats;
      if (!progressTimer) {
        progressTimer = setTimeout(flushProgress, PROGRESS_FLUSH_MS);
      }
    });

    newSocket.on('player:answer_restored', (result: AnswerResult) => {
      // A replay of a result this player already saw — restore it silently, with no
      // correct/incorrect chime, since nothing new has happened.
      setLastAnswerResult(result);
      setSelectedOptionId(result.selectedOptionId);
      setIsAnswerSubmitted(true);
    });

    newSocket.on('system:error', (msg: string) => {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    });

    setSocket(newSocket);

    return () => {
      if (progressTimer) {
        clearTimeout(progressTimer);
        progressTimer = null;
      }
      newSocket.disconnect();
    };
  }, [token, user]);

  const submitAnswer = useCallback(
    (questionId: string, optId: string) => {
      if (!socket || !isConnected) {
        setError('Cannot submit answer: disconnected from server');
        return;
      }
      setSelectedOptionId(optId);
      setIsAnswerSubmitted(true);
      socket.emit('player:submit_answer', { questionId, selectedOptionId: optId });
    },
    [socket, isConnected]
  );

  const refreshState = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('quiz:request_sync');
    }
  }, [socket, isConnected]);

  // Admin Actions
  const startRound = useCallback(
    (roundId: string) => {
      if (socket && isConnected) {
        socket.emit('admin:start_round', { roundId });
      }
    },
    [socket, isConnected]
  );

  const startQuestion = useCallback(
    (questionId?: string, duration?: number) => {
      if (socket && isConnected) {
        socket.emit('admin:start_question', { questionId, duration });
      }
    },
    [socket, isConnected]
  );

  const endQuestion = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('admin:end_question');
    }
  }, [socket, isConnected]);

  const nextQuestion = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('admin:next_question');
    }
  }, [socket, isConnected]);

  const previousQuestion = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('admin:previous_question');
    }
  }, [socket, isConnected]);

  const resetRound = useCallback(
    (roundId: string) => {
      if (socket && isConnected) {
        socket.emit('admin:reset_round', { roundId });
      }
    },
    [socket, isConnected]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isConnecting,
        serverTimeOffset,
        quizState,
        leaderboard,
        lastAnswerResult,
        selectedOptionId,
        isAnswerSubmitted,
        error,
        submitAnswer,
        setSelectedOptionId,
        refreshState,
        startRound,
        startQuestion,
        endQuestion,
        nextQuestion,
        previousQuestion,
        resetRound,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return ctx;
}
