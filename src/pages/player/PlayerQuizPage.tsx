import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize2,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { GadgetLogo } from '../../components/common/GadgetLogo';
import { RobotMascot } from '../../components/common/RobotMascot';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConnectionIndicator } from '../../components/common/ConnectionIndicator';
import { FullscreenToggle } from '../../components/common/FullscreenToggle';
import { QuizTimer } from '../../components/quiz/QuizTimer';
import { AnswerOptionCard } from '../../components/quiz/AnswerOptionCard';
import { LeaderboardTable } from '../../components/quiz/LeaderboardTable';
import { useAuth } from '../../store/authContext';
import { useSocket } from '../../store/socketContext';
import { sounds } from '../../utils/soundEffects';

export const PlayerQuizPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { quizState, leaderboard, submitAnswer, lastAnswerResult, serverTimeOffset } = useSocket();

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuted());
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const markImageFailed = (url: string) => setFailedImages((prev) => ({ ...prev, [url]: true }));

  // Track if we played sound for current question result
  const lastProcessedQuestionId = useRef<string | null>(null);
  const lastResultSoundQuestionId = useRef<string | null>(null);

  const currentQuestion = quizState?.activeQuestion || (quizState as any)?.currentQuestion;
  const isQuestionActive = quizState?.status === 'QUESTION_ACTIVE';
  const isQuestionEnded = quizState?.status === 'QUESTION_ENDED';
  const isWaiting = quizState?.status === 'WAITING' || quizState?.status === 'IDLE';
  const isRoundComplete = quizState?.status === 'ROUND_COMPLETED';

  // Image shown above the question text, and the hold image shown between questions.
  const questionImageUrl =
    currentQuestion?.imageUrl && !failedImages[currentQuestion.imageUrl] ? currentQuestion.imageUrl : null;
  const interstitialImageUrl =
    quizState?.interstitialImageUrl && !failedImages[quizState.interstitialImageUrl]
      ? quizState.interstitialImageUrl
      : null;

  // Find player's current leaderboard status
  const currentLeaderboardEntry = leaderboard.find((item) => item.playerId === user?.id);
  const liveScore = currentLeaderboardEntry ? currentLeaderboardEntry.score : user?.score || 0;
  const currentRank = currentLeaderboardEntry ? currentLeaderboardEntry.rank : '—';

  // Check player's answer status for this question
  const myAnswer =
    lastAnswerResult && lastAnswerResult.questionId === currentQuestion?.id
      ? lastAnswerResult
      : (quizState as any)?.playerAnswers
        ? (quizState as any).playerAnswers[user?.id || '']
        : null;

  // A reconnecting player gets their answer back from the server; that counts as
  // submitted too, otherwise the options unlock and the server rejects the retry.
  const hasSubmittedAnswer =
    isAnswerSubmitted || (!!myAnswer && myAnswer.questionId === currentQuestion?.id);

  // What the player locked in, for the waiting state below. Falls back to the
  // server's receipt so it survives a reload mid-question.
  const lockedOptionId = selectedOptionId || myAnswer?.selectedOptionId || null;
  const lockedOptionIndex =
    lockedOptionId && currentQuestion
      ? currentQuestion.options.findIndex((opt: any) => opt.id === lockedOptionId)
      : -1;
  const lockedOption = lockedOptionIndex >= 0 ? currentQuestion.options[lockedOptionIndex] : null;

  // Reset local selection when a new question arrives
  useEffect(() => {
    if (currentQuestion) {
      if (lastProcessedQuestionId.current !== currentQuestion.id) {
        lastProcessedQuestionId.current = currentQuestion.id;
        setSelectedOptionId(null);
        setIsAnswerSubmitted(false);
        // Do not chime when loading straight into a question that has already closed.
        if (isQuestionActive) {
          sounds.playRoundStart();
        }
      }
    }
  }, [currentQuestion?.id]);

  // Handle result sound playback when question ends
  useEffect(() => {
    if (!isQuestionEnded || !currentQuestion) return;
    // A receipt with no verdict means this player's result is still in flight; wait
    // for it rather than chiming "incorrect" at someone who got it right.
    if (myAnswer && myAnswer.isCorrect === undefined) return;
    if (lastResultSoundQuestionId.current === currentQuestion.id) return;

    lastResultSoundQuestionId.current = currentQuestion.id;
    sounds.playAnswerResult(myAnswer?.isCorrect === true);
  }, [isQuestionEnded, myAnswer, currentQuestion]);

  // Handle victory fanfare on round complete
  useEffect(() => {
    if (isRoundComplete) {
      sounds.playVictoryFanfare();
    }
  }, [isRoundComplete]);

  // Submit answer
  const handleSelectOption = (optionId: string) => {
    if (!isQuestionActive || !currentQuestion || hasSubmittedAnswer) return;
    setSelectedOptionId(optionId);
    setIsAnswerSubmitted(true);
    sounds.playOptionSelect();
    submitAnswer(currentQuestion.id, optionId);
  };

  // Keyboard shortcut listener (Keys 1..4 or A..D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isQuestionActive || !currentQuestion || hasSubmittedAnswer) return;

      const key = e.key.toUpperCase();
      let index = -1;

      if (['1', '2', '3', '4', '5', '6'].includes(key)) {
        index = parseInt(key, 10) - 1;
      } else if (['A', 'B', 'C', 'D', 'E', 'F'].includes(key)) {
        index = key.charCodeAt(0) - 65;
      }

      if (index >= 0 && index < currentQuestion.options.length) {
        const option = currentQuestion.options[index];
        if (option) {
          handleSelectOption(option.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuestionActive, currentQuestion, hasSubmittedAnswer]);

  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  return (
    <div className="min-h-screen bg-[#070B14] bg-tech-grid bg-radial-vignette flex flex-col justify-between p-3 md:p-6 select-none">
      {/* Top HUD Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between gap-4 py-2 border-b border-[#1F2E4A]/80">
        <GadgetLogo size="sm" />

        {/* Player Profile & Live Score Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#0D1322] border border-cyan-500/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
            <div className="w-8 h-8 rounded-xl bg-cyan-400 text-black flex items-center justify-center font-display font-black text-xs">
              #{currentRank}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs text-white leading-tight">
                {user?.displayName || user?.username}
              </span>
              <div className="flex items-center gap-1">
                <span className="font-display font-black text-xs text-yellow-400">
                  {liveScore.toLocaleString()}
                </span>
                <span className="font-mono-tech text-[9px] text-slate-400 uppercase">PTS</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleMute}
            className="p-2 rounded-xl bg-[#0D1322] border border-[#1F2E4A] hover:border-cyan-400 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <FullscreenToggle />
          <ConnectionIndicator />

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-[#0D1322] border border-red-500/30 hover:bg-red-500/20 text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Game Stage */}
      <main className="max-w-5xl w-full mx-auto my-auto py-4 flex flex-col items-center justify-center flex-1">
        {/* VIEW 1A: BETWEEN-QUESTION HOLD IMAGE */}
        {isWaiting && interstitialImageUrl && (
          <div className="w-full max-w-4xl flex flex-col items-center gap-5 animate-fade-in">
            <img
              src={interstitialImageUrl}
              alt="Between questions"
              onError={() => markImageFailed(interstitialImageUrl)}
              className="w-auto max-w-full max-h-[70vh] object-contain rounded-3xl border-2 border-cyan-500/40 bg-black/40 shadow-[0_0_40px_rgba(0,229,255,0.15)]"
            />

            <div className="flex items-center gap-2 text-slate-400 font-mono-tech text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Hold tight — the coordinator will start the next question shortly...</span>
            </div>
          </div>
        )}

        {/* VIEW 1B: WAITING / STANDBY */}
        {isWaiting && !interstitialImageUrl && (
          <div className="w-full max-w-2xl bg-[#0D1322] border-2 border-cyan-500/40 rounded-3xl p-6 md:p-10 flex flex-col items-center text-center shadow-[0_0_40px_rgba(0,229,255,0.15)] animate-fade-in">
            <div className="mb-6">
              <RobotMascot mood="excited" size="lg" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-cyan-400/20 text-cyan-300 font-mono-tech text-xs font-bold uppercase border border-cyan-400/40">
                {quizState?.activeRoundName || 'ROUND 1 — TECHNICAL QUIZ'}
              </span>
              <StatusBadge status="WAITING" />
            </div>

            <h2 className="font-display font-black text-2xl md:text-3xl text-white tracking-wide mb-3">
              STANDBY COMPETITOR
            </h2>

            <p className="font-mono-tech text-slate-300 text-xs md:text-sm max-w-md leading-relaxed mb-6">
              The event coordinator is preparing the next question. Get ready to lock in your answers swiftly!
            </p>

            <div className="w-full p-4 rounded-2xl bg-[#070B14] border border-[#1F2E4A] flex items-center justify-around font-mono-tech text-xs">
              <div className="flex flex-col items-center">
                <span className="text-slate-500 uppercase text-[10px]">Your Current Rank</span>
                <span className="font-display font-black text-xl text-yellow-400">#{currentRank}</span>
              </div>
              <div className="h-8 w-px bg-[#1F2E4A]" />
              <div className="flex flex-col items-center">
                <span className="text-slate-500 uppercase text-[10px]">Total Score</span>
                <span className="font-display font-black text-xl text-cyan-400">
                  {liveScore.toLocaleString()} PTS
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-slate-500 font-mono-tech text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Listening for administrator broadcast signal...</span>
            </div>
          </div>
        )}

        {/* VIEW 2: QUESTION ACTIVE & QUESTION ENDED */}
        {(isQuestionActive || isQuestionEnded) && currentQuestion && (
          <div className="w-full flex flex-col gap-5 animate-fade-in">
            {/* Question Header & Synchronized Timer */}
            <div className="bg-[#0D1322] border-2 border-cyan-500/40 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(0,229,255,0.15)]">
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 font-mono-tech text-xs font-black uppercase">
                    QUESTION {quizState?.currentQuestionNumber || currentQuestion.order} OF{' '}
                    {quizState?.totalQuestions}
                  </span>
                  <div className="flex items-center gap-1 font-mono-tech text-xs text-yellow-400 font-bold px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{currentQuestion.points} PTS</span>
                  </div>
                </div>

                <h3 className="font-display font-bold text-lg md:text-xl text-white tracking-wide mt-1">
                  Speed-Weighted Multiple Choice
                </h3>
              </div>

              {/* Authoritative Timer Component */}
              <QuizTimer
                startTime={quizState?.questionStartedAt || null}
                endTime={quizState?.questionEndsAt || null}
                duration={quizState?.duration || currentQuestion.duration}
                isActive={isQuestionActive}
                serverTimeOffset={serverTimeOffset}
                size="md"
              />
            </div>

            {/* Question Statement Card — image first, then the question text */}
            <div className="w-full bg-[#0D1322] border border-[#1F2E4A] rounded-3xl p-6 md:p-8 text-center shadow-lg">
              {questionImageUrl && (
                <img
                  src={questionImageUrl}
                  alt="Question illustration"
                  onError={() => markImageFailed(questionImageUrl)}
                  className="w-auto max-w-full max-h-[30vh] object-contain mx-auto mb-5 rounded-2xl border border-[#1F2E4A] bg-black/40"
                />
              )}
              <p className="font-display font-bold text-xl md:text-2xl text-white leading-relaxed">
                {currentQuestion.text}
              </p>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOptionId === opt.id || myAnswer?.selectedOptionId === opt.id;
                let revealState: 'correct' | 'incorrect' | 'neutral' | null = null;

                if (isQuestionEnded) {
                  if (opt.id === currentQuestion.correctOptionId) {
                    revealState = 'correct';
                  } else if (isSelected && opt.id !== currentQuestion.correctOptionId) {
                    revealState = 'incorrect';
                  } else {
                    revealState = 'neutral';
                  }
                }

                return (
                  <AnswerOptionCard
                    key={opt.id}
                    option={opt}
                    index={idx}
                    isSelected={isSelected}
                    isLocked={hasSubmittedAnswer || isQuestionEnded}
                    isDisabled={!isQuestionActive || hasSubmittedAnswer}
                    revealState={revealState}
                    onSelect={handleSelectOption}
                  />
                );
              })}
            </div>

            {/* Answer locked — the holding state between submitting and the reveal.
                Deliberately neutral: it must not hint at correctness, because nobody
                learns anything until the timer ends. */}
            {isQuestionActive && hasSubmittedAnswer && (
              <div className="w-full p-4 md:p-5 rounded-3xl border-2 border-cyan-500/50 bg-[#0D1322] flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-[0_0_25px_rgba(0,229,255,0.15)]">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-cyan-400/20 border border-cyan-400/40 text-cyan-300">
                    <Lock className="w-5 h-5" />
                  </div>

                  <div className="flex flex-col text-center sm:text-left">
                    <h4 className="font-display font-black text-lg md:text-xl text-white tracking-wide">
                      ANSWER LOCKED IN
                    </h4>
                    <span className="font-mono-tech text-xs text-slate-300">
                      {lockedOption ? (
                        <>
                          You chose{' '}
                          <span className="text-cyan-300 font-bold">
                            {String.fromCharCode(65 + lockedOptionIndex)}
                          </span>{' '}
                          — {lockedOption.text}
                        </>
                      ) : (
                        'Your answer has been recorded.'
                      )}
                    </span>
                    <span className="font-mono-tech text-[11px] text-slate-500 mt-0.5">
                      Sit tight — everyone sees the correct answer when the timer runs out.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-5 font-mono-tech shrink-0">
                  {typeof myAnswer?.responseTimeMs === 'number' && (
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Locked At</span>
                      <span className="font-display font-black text-lg text-cyan-400">
                        {(myAnswer.responseTimeMs / 1000).toFixed(2)}s
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Answered</span>
                    <span className="font-display font-black text-lg text-white">
                      {quizState?.answeredPlayersCount ?? 0}
                      <span className="text-slate-500">/{quizState?.connectedPlayersCount ?? 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Question Result Banner (Shown when Question Ends) */}
            {isQuestionEnded && (
              <div
                className={`w-full p-4 md:p-6 rounded-3xl border-2 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in ${myAnswer?.isCorrect
                  ? 'bg-emerald-950/40 border-emerald-400 text-emerald-200 shadow-[0_0_25px_rgba(52,211,153,0.3)]'
                  : 'bg-red-950/40 border-red-500 text-red-200 shadow-[0_0_25px_rgba(239,68,68,0.3)]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {myAnswer?.isCorrect ? (
                    <div className="p-3 rounded-2xl bg-emerald-500 text-black">
                      <CheckCircle2 className="w-6 h-6 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-red-500 text-white">
                      <XCircle className="w-6 h-6 stroke-[3]" />
                    </div>
                  )}

                  <div className="flex flex-col">
                    <h4 className="font-display font-black text-xl text-white">
                      {myAnswer?.isCorrect ? 'CORRECT ANSWER!' : myAnswer ? 'INCORRECT ANSWER' : 'TIME EXPIRED'}
                    </h4>
                    <span className="font-mono-tech text-xs">
                      {myAnswer?.isCorrect
                        ? `Answered in ${(myAnswer.responseTimeMs / 1000).toFixed(2)}s • +${(myAnswer.points || (myAnswer as any).pointsEarned || 0).toLocaleString()} Points Awarded!`
                        : myAnswer
                          ? 'No points awarded for this question.'
                          : 'No answer was submitted before the timer ran out.'}
                    </span>
                  </div>
                </div>

                <div className="text-center sm:text-right">
                  <span className="font-mono-tech text-xs uppercase font-bold text-slate-400 block">
                    Updated Score
                  </span>
                  <span className="font-display font-black text-2xl text-yellow-400 text-glow-yellow">
                    {liveScore.toLocaleString()} PTS
                  </span>
                </div>
              </div>
            )}

            {/* Explanation Section */}
            {isQuestionEnded && currentQuestion.explanation && (
              <div className="w-full p-4 rounded-2xl bg-[#0D1322] border border-[#1F2E4A] font-mono-tech text-xs text-cyan-300">
                <strong className="text-white uppercase font-bold">Explanation:</strong>{' '}
                {currentQuestion.explanation}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: ROUND COMPLETED / VICTORY PODIUM */}
        {isRoundComplete && (
          <div className="w-full max-w-3xl bg-[#0D1322] border-2 border-yellow-400/60 rounded-3xl p-6 md:p-10 flex flex-col items-center text-center shadow-[0_0_40px_rgba(255,214,0,0.25)] animate-fade-in">
            <div className="mb-4">
              <RobotMascot mood="winner" size="lg" />
            </div>

            <span className="font-mono-tech text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 mb-2">
              COMPETITION ROUND CONCLUDED
            </span>

            <h2 className="font-display font-black text-3xl md:text-5xl text-white tracking-wide mb-2">
              FINAL RESULTS PODIUM
            </h2>

            <p className="font-mono-tech text-slate-300 text-xs md:text-sm max-w-md leading-relaxed mb-6">
              Congratulations! All questions in this round have finished scoring.
            </p>

            {/* Player Final Result Plaque */}
            <div className="w-full p-6 rounded-2xl bg-[#070B14] border-2 border-cyan-400/50 flex flex-col sm:flex-row items-center justify-around gap-4 mb-8 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
              <div className="flex flex-col items-center">
                <span className="font-mono-tech text-xs uppercase text-slate-400">Final Rank</span>
                <span className="font-display font-black text-4xl text-yellow-400 text-glow-yellow">
                  #{currentRank}
                </span>
              </div>
              <div className="h-10 w-px bg-[#1F2E4A] hidden sm:block" />
              <div className="flex flex-col items-center">
                <span className="font-mono-tech text-xs uppercase text-slate-400">Total Points</span>
                <span className="font-display font-black text-4xl text-cyan-400 text-glow-cyan">
                  {liveScore.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Final Leaderboard Standings Table */}
            <div className="w-full flex flex-col gap-3">
              <h3 className="font-display font-bold text-xl text-white text-left flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Final Standings
              </h3>
              <LeaderboardTable entries={leaderboard} currentPlayerId={user?.id} />
            </div>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="max-w-6xl w-full mx-auto flex items-center justify-between text-slate-500 font-mono-tech text-xs pt-3 border-t border-[#1F2E4A]/60">
        <div>
          <span>GADGET CODE ARENA • AUTHORITATIVE SPEED SCORING</span>
        </div>
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>LAN READY</span>
        </div>
      </footer>
    </div>
  );
};
