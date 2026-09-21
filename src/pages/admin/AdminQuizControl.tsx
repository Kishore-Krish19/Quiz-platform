import React, { useState } from 'react';
import {
  Play,
  Square,
  SkipForward,
  SkipBack,
  RotateCcw,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QuizTimer } from '../../components/quiz/QuizTimer';
import { LeaderboardTable } from '../../components/quiz/LeaderboardTable';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useSocket } from '../../store/socketContext';

export const AdminQuizControl: React.FC = () => {
  const {
    quizState,
    leaderboard,
    startQuestion,
    endQuestion,
    nextQuestion,
    previousQuestion,
    resetRound,
    serverTimeOffset,
  } = useSocket();

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(10);

  const preview = quizState?.adminQuestionPreview;
  const isQuestionActive = quizState?.status === 'QUESTION_ACTIVE';
  const isQuestionEnded = quizState?.status === 'QUESTION_ENDED';
  const isWaiting = quizState?.status === 'WAITING';
  const isRoundComplete = quizState?.status === 'ROUND_COMPLETED';

  const handleStartQuestion = () => {
    if (preview) {
      startQuestion(preview.id, selectedDuration);
    } else {
      startQuestion(undefined, selectedDuration);
    }
  };

  const handleConfirmReset = () => {
    if (quizState?.activeRoundId) {
      resetRound(quizState.activeRoundId);
    }
    setIsResetDialogOpen(false);
  };

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      {/* Top Banner Control Bar */}
      <div className="bg-[#0D1322] border-2 border-cyan-500/40 rounded-3xl p-6 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(0,229,255,0.15)]">
        <div className="flex flex-col gap-1 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 font-mono-tech text-xs font-bold uppercase">
              {quizState?.activeRoundName || 'ROUND 1 — TECHNICAL QUIZ'}
            </span>
            <StatusBadge status={quizState?.status || 'WAITING'} />
          </div>

          <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-wide">
            {quizState?.currentQuestionNumber
              ? `QUESTION ${quizState.currentQuestionNumber} OF ${quizState.totalQuestions}`
              : 'READY TO LAUNCH'}
          </h1>
          <p className="font-mono-tech text-xs text-slate-400">
            Authoritative Server Engine • Synchronized to all {quizState?.connectedPlayersCount || 0} connected LAN PCs
          </p>
        </div>

        {/* Master Control Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Previous Question */}
          <button
            onClick={previousQuestion}
            disabled={isQuestionActive || !quizState?.currentQuestionNumber || quizState.currentQuestionNumber <= 1}
            className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-mono-tech text-xs font-bold transition-all flex items-center gap-1.5"
            title="Return to previous question"
          >
            <SkipBack className="w-4 h-4" />
            <span className="hidden sm:inline">PREV</span>
          </button>

          {/* Primary Start / End Button */}
          {isQuestionActive ? (
            <button
              onClick={endQuestion}
              className="px-6 py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-display font-black text-sm tracking-wider transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,61,87,0.5)] cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>END QUESTION NOW</span>
            </button>
          ) : isRoundComplete ? (
            <div className="px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-display font-bold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>ROUND COMPLETED</span>
            </div>
          ) : (
            <button
              onClick={handleStartQuestion}
              className="px-8 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black text-base tracking-wider transition-all flex items-center gap-2.5 shadow-[0_0_25px_rgba(0,229,255,0.4)] hover:scale-105 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>
                {isQuestionEnded
                  ? `RESTART Q${quizState?.currentQuestionNumber || 1}`
                  : `START QUESTION ${quizState?.currentQuestionNumber || 1}`}
              </span>
            </button>
          )}

          {/* Next Question */}
          <button
            onClick={nextQuestion}
            disabled={isQuestionActive || isRoundComplete}
            className="px-5 py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-display font-black text-sm tracking-wide transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,214,0,0.3)] cursor-pointer"
          >
            <span>NEXT QUESTION</span>
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Reset Round */}
          <button
            onClick={() => setIsResetDialogOpen(true)}
            className="p-3 rounded-xl bg-slate-900 hover:bg-red-950/50 border border-slate-700 hover:border-red-500/50 text-slate-400 hover:text-red-400 transition-colors"
            title="Reset active round progress"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live hold-image indicator — what players are looking at between questions */}
      {quizState?.interstitialImageUrl && (
        <div className="bg-[#0D1322] border-2 border-cyan-500/40 rounded-3xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-[0_0_20px_rgba(0,229,255,0.12)]">
          <img
            src={quizState.interstitialImageUrl}
            alt="Currently on player screens"
            className="w-32 h-20 object-contain rounded-xl border border-[#1F2E4A] bg-black/40"
          />
          <div className="flex-1 text-center sm:text-left">
            <span className="font-mono-tech text-[11px] uppercase font-black text-cyan-300 flex items-center justify-center sm:justify-start gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Now showing on every player screen
            </span>
            <p className="font-mono-tech text-xs text-slate-400 mt-1">
              Competitors are holding on this image. Press START QUESTION when you are ready to continue.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Question Preview + Telemetry & Live Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Question Preview Card */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {preview ? (
            <div className="bg-[#0D1322] border-2 border-[#1F2E4A] rounded-3xl p-6 md:p-8 flex flex-col gap-6">
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1F2E4A]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 font-display font-black text-lg">
                    Q{quizState?.currentQuestionNumber || preview.order}
                  </div>
                  <div>
                    <span className="font-mono-tech text-xs text-slate-400 uppercase font-semibold">
                      Question Preview (Admin View)
                    </span>
                    <h3 className="font-display font-bold text-lg text-white">
                      Multiple Choice Question
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono-tech text-xs">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111A2B] border border-[#1F2E4A] text-yellow-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{preview.points} PTS</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111A2B] border border-[#1F2E4A] text-cyan-300 font-bold">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{preview.duration}s TIMER</span>
                  </div>
                  {preview.afterImageUrl && (
                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111A2B] border border-emerald-500/40 text-emerald-300 font-bold"
                      title="An image will hold on player screens after this question ends"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>HOLD IMAGE</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Question Image */}
              {preview.imageUrl && (
                <img
                  src={preview.imageUrl}
                  alt="Question illustration"
                  className="w-auto max-w-full max-h-64 object-contain mx-auto rounded-2xl border border-[#1F2E4A] bg-black/40"
                />
              )}

              {/* Question Text */}
              <div className="p-4 rounded-2xl bg-[#070B14] border border-[#1F2E4A]">
                <p className="text-white text-lg md:text-xl font-bold leading-relaxed">
                  {preview.text}
                </p>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {preview.options.map((opt, idx) => {
                  const isCorrect = opt.id === preview.correctOptionId;
                  return (
                    <div
                      key={opt.id}
                      className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-400 text-emerald-100 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                          : 'bg-[#111A2B] border-[#1F2E4A] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span
                          className={`flex items-center justify-center w-8 h-8 rounded-lg font-display font-black text-sm ${
                            isCorrect ? 'bg-emerald-400 text-black font-extrabold' : 'bg-[#1F2E4A] text-slate-400'
                          }`}
                        >
                          {letters[idx]}
                        </span>
                        <span className="font-semibold text-sm leading-snug">{opt.text}</span>
                      </div>

                      {isCorrect && (
                        <div className="flex items-center gap-1 font-mono-tech text-[11px] font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>CORRECT</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation Section */}
              {preview.explanation && (
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs font-mono-tech text-cyan-200">
                  <strong className="text-cyan-400 uppercase">Explanation:</strong> {preview.explanation}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#0D1322] border-2 border-dashed border-[#1F2E4A] rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
              <HelpCircle className="w-12 h-12 text-slate-600" />
              <h3 className="font-display font-bold text-xl text-slate-300">No Question Selected</h3>
              <p className="text-xs text-slate-500 font-mono-tech">
                Select an active round to load and preview questions.
              </p>
            </div>
          )}

          {/* Live Telemetry / Answering Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-2xl p-4 flex flex-col items-center text-center">
              <span className="font-mono-tech text-[11px] uppercase font-bold text-slate-400 mb-1">
                Connected
              </span>
              <span className="font-display font-black text-3xl text-cyan-400 text-glow-cyan">
                {quizState?.connectedPlayersCount || 0}
              </span>
            </div>

            <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-2xl p-4 flex flex-col items-center text-center">
              <span className="font-mono-tech text-[11px] uppercase font-bold text-slate-400 mb-1">
                Answered
              </span>
              <span className="font-display font-black text-3xl text-yellow-400 text-glow-yellow">
                {quizState?.answeredPlayersCount || 0}
              </span>
            </div>

            <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-2xl p-4 flex flex-col items-center text-center">
              <span className="font-mono-tech text-[11px] uppercase font-bold text-slate-400 mb-1">
                Correct
              </span>
              <span className="font-display font-black text-3xl text-emerald-400">
                {quizState?.correctAnswersCount || 0}
              </span>
            </div>

            <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-2xl p-4 flex flex-col items-center text-center">
              <span className="font-mono-tech text-[11px] uppercase font-bold text-slate-400 mb-1">
                Incorrect
              </span>
              <span className="font-display font-black text-3xl text-red-400">
                {Math.max(0, (quizState?.answeredPlayersCount || 0) - (quizState?.correctAnswersCount || 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Right Col: Live Synchronized Timer & Live Leaderboard */}
        <div className="flex flex-col gap-6">
          {/* Synchronized Timer Card */}
          <div className="bg-[#0D1322] border-2 border-[#1F2E4A] rounded-3xl p-6 flex flex-col items-center text-center gap-4">
            <span className="font-mono-tech text-xs uppercase font-bold text-slate-400 tracking-wider">
              AUTHORITATIVE TIMER
            </span>

            <QuizTimer
              startTime={quizState?.questionStartedAt || null}
              endTime={quizState?.questionEndsAt || null}
              duration={quizState?.duration || preview?.duration || 10}
              isActive={isQuestionActive}
              serverTimeOffset={serverTimeOffset}
              size="md"
            />

            <div className="w-full pt-3 border-t border-[#1F2E4A] flex items-center justify-between text-xs font-mono-tech text-slate-400">
              <span>Status:</span>
              <StatusBadge status={quizState?.status || 'IDLE'} size="sm" />
            </div>
          </div>

          {/* Live Leaderboard */}
          <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-3xl p-6 flex flex-col gap-3">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Live Round Standings
            </h3>
            <LeaderboardTable entries={leaderboard} maxItems={7} showSearch={false} />
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Reset */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        title="Reset Active Round Progress?"
        message="This will clear all submitted answers and scores for this round. Competitors will return to the waiting screen. Are you sure you want to proceed?"
        confirmLabel="RESET ROUND PROGRESS"
        variant="danger"
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetDialogOpen(false)}
      />
    </div>
  );
};
