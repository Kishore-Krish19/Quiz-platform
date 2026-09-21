import React, { useState } from 'react';
import {
  Trophy,
  Download,
  FileSpreadsheet,
  Database,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  Medal,
} from 'lucide-react';
import { LeaderboardTable } from '../../components/quiz/LeaderboardTable';
import { useSocket } from '../../store/socketContext';
import { api } from '../../services/api';

export const AdminLeaderboardPage: React.FC = () => {
  const { leaderboard, quizState } = useSocket();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      await api.exportLeaderboardCSV(quizState?.activeRoundId ?? undefined);
    } catch (err) {
      console.error('Export CSV failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMatrixCSV = async () => {
    try {
      setIsExporting(true);
      await api.exportPlayerMatrixCSV();
    } catch (err) {
      console.error('Export Matrix failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackupDB = async () => {
    try {
      setIsExporting(true);
      const data = await api.backupDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gadget_code_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup DB failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      {/* Header & Export Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-wide flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-400" />
            Live Competition Leaderboard & Results
          </h1>
          <p className="font-mono-tech text-xs text-slate-400">
            Real-time multi-dimensional scoring engine with automatic speed tie-breaking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-[#111A2B] hover:bg-[#162136] border border-cyan-500/40 text-cyan-300 font-mono-tech text-xs font-bold transition-all flex items-center gap-2"
            title="Download CSV rankings"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>EXPORT LEADERBOARD (CSV)</span>
          </button>

          <button
            onClick={handleExportMatrixCSV}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-[#111A2B] hover:bg-[#162136] border border-yellow-500/40 text-yellow-300 font-mono-tech text-xs font-bold transition-all flex items-center gap-2"
            title="Download full player-question matrix"
          >
            <FileSpreadsheet className="w-4 h-4 text-yellow-400" />
            <span>EXPORT MATRIX (CSV)</span>
          </button>

          <button
            onClick={handleBackupDB}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-[#111A2B] hover:bg-[#162136] border border-purple-500/40 text-purple-300 font-mono-tech text-xs font-bold transition-all flex items-center gap-2"
            title="Download full JSON database snapshot"
          >
            <Database className="w-4 h-4 text-purple-400" />
            <span>BACKUP DB (JSON)</span>
          </button>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Rank 2 (Silver) */}
          {top3[1] ? (
            <div className="order-2 md:order-1 bg-[#0D1322] border-2 border-slate-400/50 rounded-3xl p-6 flex flex-col items-center text-center justify-between shadow-[0_0_20px_rgba(203,213,225,0.15)] relative">
              <div className="w-12 h-12 rounded-2xl bg-slate-300 text-black flex items-center justify-center font-display font-black text-xl mb-3 shadow-lg">
                2
              </div>
              <div className="flex flex-col items-center">
                <span className="font-mono-tech text-xs text-slate-400">@{top3[1].username}</span>
                <h3 className="font-display font-bold text-xl text-white mt-1">{top3[1].displayName}</h3>
                <span className="font-display font-black text-3xl text-slate-300 my-2">
                  {top3[1].score.toLocaleString()} <span className="text-xs font-mono-tech">PTS</span>
                </span>
              </div>
              <div className="w-full pt-3 border-t border-[#1F2E4A] flex items-center justify-around font-mono-tech text-xs text-slate-400">
                <span>{top3[1].correctAnswers} Correct</span>
                <span>{(top3[1].avgResponseTimeMs / 1000).toFixed(2)}s avg</span>
              </div>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}

          {/* Rank 1 (Gold Champions) */}
          {top3[0] && (
            <div className="order-1 md:order-2 bg-[#0D1322] border-2 border-yellow-400 rounded-3xl p-6 md:p-8 flex flex-col items-center text-center justify-between shadow-[0_0_35px_rgba(255,214,0,0.3)] relative md:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-yellow-400 text-black flex items-center justify-center font-display font-black text-2xl mb-3 shadow-[0_0_20px_rgba(255,214,0,0.6)]">
                <Trophy className="w-8 h-8 fill-black" />
              </div>
              <div className="flex flex-col items-center">
                <span className="font-mono-tech text-xs text-yellow-400 font-bold uppercase tracking-widest">
                  CURRENT LEADER
                </span>
                <h3 className="font-display font-black text-2xl text-white mt-1">{top3[0].displayName}</h3>
                <span className="font-mono-tech text-xs text-slate-400">@{top3[0].username}</span>
                <span className="font-display font-black text-4xl text-yellow-400 text-glow-yellow my-2">
                  {top3[0].score.toLocaleString()} <span className="text-xs font-mono-tech">PTS</span>
                </span>
              </div>
              <div className="w-full pt-3 border-t border-[#1F2E4A] flex items-center justify-around font-mono-tech text-xs text-yellow-300 font-bold">
                <span>{top3[0].correctAnswers} Correct</span>
                <span>{(top3[0].avgResponseTimeMs / 1000).toFixed(2)}s avg</span>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {top3[2] ? (
            <div className="order-3 bg-[#0D1322] border-2 border-amber-600/50 rounded-3xl p-6 flex flex-col items-center text-center justify-between shadow-[0_0_20px_rgba(217,119,6,0.15)] relative">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-display font-black text-xl mb-3 shadow-lg">
                3
              </div>
              <div className="flex flex-col items-center">
                <span className="font-mono-tech text-xs text-slate-400">@{top3[2].username}</span>
                <h3 className="font-display font-bold text-xl text-white mt-1">{top3[2].displayName}</h3>
                <span className="font-display font-black text-3xl text-amber-500 my-2">
                  {top3[2].score.toLocaleString()} <span className="text-xs font-mono-tech">PTS</span>
                </span>
              </div>
              <div className="w-full pt-3 border-t border-[#1F2E4A] flex items-center justify-around font-mono-tech text-xs text-slate-400">
                <span>{top3[2].correctAnswers} Correct</span>
                <span>{(top3[2].avgResponseTimeMs / 1000).toFixed(2)}s avg</span>
              </div>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-3xl p-6 flex flex-col gap-4">
        <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          Full Competitor Rankings Table
        </h3>
        <LeaderboardTable entries={leaderboard} showSearch={true} />
      </div>
    </div>
  );
};
