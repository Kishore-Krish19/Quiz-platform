import React, { useState, useEffect } from 'react';
import {
  Users,
  Layers,
  HelpCircle,
  Trophy,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { StatCard } from '../../components/admin/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LeaderboardTable } from '../../components/quiz/LeaderboardTable';
import { useSocket } from '../../store/socketContext';
import { api } from '../../services/api';
import { AdminTab } from '../../components/admin/AdminSidebar';

interface AdminDashboardProps {
  onNavigateTab: (tab: AdminTab) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const { quizState, leaderboard } = useSocket();
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [dbInfo, setDbInfo] = useState<{
    connected: boolean;
    mode: string;
    databaseName: string;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const [playersRes, roundsRes, dbRes] = await Promise.all([
          api.getPlayers(),
          api.getRounds(),
          api.getDbStatus().catch(() => null),
        ]);
        setTotalPlayers(playersRes.players.length);
        setTotalRounds(roundsRes.rounds.length);
        const questionsCount = roundsRes.rounds.reduce(
          (sum, r) => sum + (r.totalQuestions || 0),
          0
        );
        setTotalQuestions(questionsCount);
        if (dbRes?.database) {
          setDbInfo(dbRes.database);
        }
      } catch (err) {
        console.error('Failed to load overview data:', err);
      }
    };
    loadOverview();
  }, []);

  const topLeader = leaderboard.length > 0 ? leaderboard[0] : null;

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      {/* Database Connection Status Banner */}
      {dbInfo && !dbInfo.connected && (
        <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-between gap-4 text-yellow-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            <div className="text-xs font-mono-tech">
              <span className="font-bold">DEVELOPMENT FALLBACK ACTIVE:</span> MongoDB is currently unreachable. If preparing for the official event, run local MongoDB (<code className="bg-black/40 px-1 py-0.5 rounded">mongod</code>) and check <code className="bg-black/40 px-1 py-0.5 rounded">.env</code>.
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('docs')}
            className="px-3 py-1 rounded-lg bg-yellow-400 text-black font-bold text-xs hover:bg-yellow-300 transition-colors shrink-0"
          >
            Setup Guide
          </button>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0D1322] to-[#111A2B] border-2 border-cyan-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(0,229,255,0.15)]">
        <div className="flex flex-col gap-2 max-w-xl text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400 text-cyan-300 font-mono-tech text-xs font-black tracking-wider uppercase">
              LIVE EVENT SYSTEM
            </span>
            <StatusBadge status={quizState?.status || 'IDLE'} />
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono-tech font-bold flex items-center gap-1 border ${dbInfo?.connected ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'}`}>
              <Database className="w-3 h-3" />
              {dbInfo?.connected ? `MongoDB: ${dbInfo.databaseName}` : 'Dev Mode Storage'}
            </span>
          </div>

          <h1 className="font-display font-black text-3xl md:text-4xl text-white tracking-wide">
            {quizState?.activeRoundName || 'Round 1 — Technical Quiz'}
          </h1>

          <p className="font-mono-tech text-slate-300 text-xs md:text-sm leading-relaxed">
            Ready to orchestrate 40+ competitor PCs over Ethernet LAN. Real-time authoritative game loop and synchronized question timers.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('quiz')}
          className="px-6 py-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black text-base tracking-wider transition-all duration-200 flex items-center gap-3 shadow-[0_0_25px_rgba(0,229,255,0.4)] hover:scale-105 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-black" />
          <span>OPEN QUIZ CONTROL</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Top Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Connected Competitors"
          value={`${quizState?.connectedPlayersCount || 0} / ${totalPlayers}`}
          subtitle="Real-time WebSocket players"
          icon={Users}
          variant="cyan"
          badge="LAN LIVE"
        />

        <StatCard
          title="Current Question"
          value={
            quizState?.currentQuestionNumber
              ? `Q${quizState.currentQuestionNumber} / ${quizState.totalQuestions}`
              : `0 / ${totalQuestions}`
          }
          subtitle={`Active round: ${quizState?.activeRoundNumber || 1}`}
          icon={HelpCircle}
          variant="yellow"
          badge={quizState?.status || 'WAITING'}
        />

        <StatCard
          title="Leaderboard Leader"
          value={topLeader ? topLeader.displayName : '—'}
          subtitle={topLeader ? `${topLeader.score.toLocaleString()} PTS (${topLeader.correctAnswers} correct)` : 'No answers scored yet'}
          icon={Trophy}
          variant="emerald"
          badge={topLeader ? 'RANK #1' : 'READY'}
        />

        <StatCard
          title="Active Questions"
          value={totalQuestions}
          subtitle={`${totalRounds} round(s) configured`}
          icon={Layers}
          variant="cyan"
        />
      </div>

      {/* Split View: Quick Actions & Live Leaderboard Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Leaderboard */}
        <div className="lg:col-span-2 bg-[#0D1322] border border-[#1F2E4A] rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h3 className="font-display font-bold text-xl text-white">Live Leaderboard Preview</h3>
            </div>
            <button
              onClick={() => onNavigateTab('leaderboard')}
              className="text-xs font-mono-tech font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>Full Leaderboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <LeaderboardTable entries={leaderboard} maxItems={5} showSearch={false} />
        </div>

        {/* Right 1 Col: Quick Control Shortcuts */}
        <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-2xl p-6 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Quick Command Shortcuts
            </h3>
            <p className="text-xs text-slate-400 font-mono-tech leading-relaxed">
              Navigate directly to quiz operations or configure roster and question sets.
            </p>

            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={() => onNavigateTab('quiz')}
                className="w-full p-3 rounded-xl bg-[#111A2B] hover:bg-cyan-500/15 border border-[#1F2E4A] hover:border-cyan-400 text-left flex items-center justify-between text-sm text-slate-200 transition-all font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Play className="w-4 h-4 text-cyan-400" />
                  <span>Launch Next Question</span>
                </div>
                <span className="font-mono-tech text-xs text-cyan-400">→</span>
              </button>

              <button
                onClick={() => onNavigateTab('players')}
                className="w-full p-3 rounded-xl bg-[#111A2B] hover:bg-yellow-500/15 border border-[#1F2E4A] hover:border-yellow-400 text-left flex items-center justify-between text-sm text-slate-200 transition-all font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-yellow-400" />
                  <span>Manage 40+ Competitor Accounts</span>
                </div>
                <span className="font-mono-tech text-xs text-yellow-400">→</span>
              </button>

              <button
                onClick={() => onNavigateTab('questions')}
                className="w-full p-3 rounded-xl bg-[#111A2B] hover:bg-emerald-500/15 border border-[#1F2E4A] hover:border-emerald-400 text-left flex items-center justify-between text-sm text-slate-200 transition-all font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <span>Edit Technical Questions Bank</span>
                </div>
                <span className="font-mono-tech text-xs text-emerald-400">→</span>
              </button>

              <button
                onClick={() => onNavigateTab('docs')}
                className="w-full p-3 rounded-xl bg-[#111A2B] hover:bg-purple-500/15 border border-[#1F2E4A] hover:border-purple-400 text-left flex items-center justify-between text-sm text-slate-200 transition-all font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>LAN IP & Computer Lab Setup Guide</span>
                </div>
                <span className="font-mono-tech text-xs text-purple-400">→</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-[#070B14] rounded-xl border border-[#1F2E4A] text-center font-mono-tech text-[11px] text-slate-400">
            Authoritative Server Clock: <strong className="text-cyan-400">SYNCHRONIZED</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
