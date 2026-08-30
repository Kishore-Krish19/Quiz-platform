import React, { useState } from 'react';
import { Trophy, Medal, Search, Zap, CheckCircle2, Clock } from 'lucide-react';
import { LeaderboardEntry } from '../../types';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentPlayerId?: string;
  maxItems?: number;
  showSearch?: boolean;
  className?: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  currentPlayerId,
  maxItems,
  showSearch = true,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = entries
    .filter(
      (item) =>
        item.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, maxItems || entries.length);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-yellow-400 text-black font-black text-sm shadow-[0_0_15px_rgba(255,214,0,0.5)]">
            <Trophy className="w-4 h-4 fill-black" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-300 text-black font-black text-sm shadow-[0_0_10px_rgba(203,213,225,0.4)]">
            <Medal className="w-4 h-4 fill-black" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-600 text-white font-black text-sm shadow-[0_0_10px_rgba(217,119,6,0.4)]">
            <Medal className="w-4 h-4 fill-white" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#1F2E4A] text-slate-300 font-mono-tech font-bold text-xs border border-slate-700">
            #{rank}
          </div>
        );
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by player name or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0D1322] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#1F2E4A] bg-[#0D1322]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1F2E4A] bg-[#111A2B]/80 text-[11px] font-mono-tech uppercase font-bold text-slate-400 tracking-wider">
              <th className="py-3 px-4 w-16">Rank</th>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-4 text-right">Score</th>
              <th className="py-3 px-4 text-center hidden sm:table-cell">Accuracy</th>
              <th className="py-3 px-4 text-right hidden md:table-cell">Avg Speed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#162136] text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500 font-mono-tech text-xs">
                  No competitors found
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isCurrent = currentPlayerId === item.playerId;
                return (
                  <tr
                    key={item.playerId}
                    className={`transition-colors duration-150 ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-l-4 border-l-cyan-400 text-white font-bold'
                        : 'hover:bg-[#111A2B] text-slate-200'
                    }`}
                  >
                    <td className="py-3 px-4">{getRankBadge(item.rank)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {/* Online Indicator */}
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.isConnected ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.8)]' : 'bg-slate-600'
                          }`}
                          title={item.isConnected ? 'Online' : 'Offline'}
                        />
                        <div className="flex flex-col">
                          <span className="font-bold tracking-wide text-white text-sm md:text-base flex items-center gap-1.5">
                            {item.displayName}
                            {isCurrent && (
                              <span className="text-[10px] uppercase font-mono-tech px-1.5 py-0.5 rounded bg-cyan-400 text-black font-extrabold">
                                YOU
                              </span>
                            )}
                          </span>
                          <span className="font-mono-tech text-xs text-slate-400">@{item.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-display font-black text-base md:text-lg text-yellow-400 text-glow-yellow">
                          {item.score.toLocaleString()}
                        </span>
                        <span className="font-mono-tech text-[10px] text-slate-400 uppercase font-semibold">PTS</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#162136] text-xs font-mono-tech text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>
                          {item.correctAnswers} / {item.questionsAnswered}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right hidden md:table-cell">
                      <div className="inline-flex items-center gap-1 font-mono-tech text-xs text-slate-400">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{(item.avgResponseTimeMs / 1000).toFixed(2)}s</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
