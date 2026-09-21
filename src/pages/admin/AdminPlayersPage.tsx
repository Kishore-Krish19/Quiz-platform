import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Trash2,
  Edit2,
  KeyRound,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';
import { AddPlayerModal } from '../../components/admin/AddPlayerModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminPlayersPage: React.FC = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editPlayer, setEditPlayer] = useState<any | null>(null);
  const [resetPassId, setResetPassId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('quiz123');

  const loadPlayers = async () => {
    try {
      setIsLoading(true);
      const res = await api.getPlayers();
      setPlayers(res.players);
    } catch (err) {
      console.error('Failed to load players:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await api.deletePlayer(deleteTargetId);
      setDeleteTargetId(null);
      loadPlayers();
    } catch (err) {
      console.error('Delete player failed:', err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassId || !newPassword) return;
    try {
      await api.updatePlayer(resetPassId, { password: newPassword });
      setResetPassId(null);
      setNewPassword('quiz123');
      loadPlayers();
    } catch (err) {
      console.error('Password reset failed:', err);
    }
  };

  const handleForceSignOut = async (player: any) => {
    try {
      await api.forceSignOutPlayer(player.id);
      loadPlayers();
    } catch (err) {
      console.error('Force sign-out failed:', err);
    }
  };

  const handleToggleActive = async (player: any) => {
    try {
      await api.updatePlayer(player.id, { isActive: !player.isActive });
      loadPlayers();
    } catch (err) {
      console.error('Toggle status failed:', err);
    }
  };

  const filtered = players.filter((p) => {
    const matchesSearch =
      p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'online') return p.isConnected;
    if (statusFilter === 'offline') return !p.isConnected;
    return true;
  });

  const onlineCount = players.filter((p) => p.isConnected).length;

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-wide flex items-center gap-2">
            <Users className="w-7 h-7 text-cyan-400" />
            Competitor Roster Management
          </h1>
          <p className="font-mono-tech text-xs text-slate-400">
            {players.length} Total Registered Competitors • {onlineCount} Live on Ethernet LAN
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black text-sm tracking-wide shadow-[0_0_20px_rgba(0,229,255,0.4)] flex items-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>ADD / BULK GENERATE</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0D1322] border border-[#1F2E4A] rounded-2xl p-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by username or display name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto font-mono-tech text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-cyan-500 text-black border-cyan-400 font-extrabold'
                : 'bg-[#111A2B] text-slate-400 border-[#1F2E4A] hover:text-white'
            }`}
          >
            ALL ({players.length})
          </button>
          <button
            onClick={() => setStatusFilter('online')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              statusFilter === 'online'
                ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold'
                : 'bg-[#111A2B] text-slate-400 border-[#1F2E4A] hover:text-white'
            }`}
          >
            ONLINE ({onlineCount})
          </button>
          <button
            onClick={() => setStatusFilter('offline')}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              statusFilter === 'offline'
                ? 'bg-slate-600 text-white border-slate-500 font-extrabold'
                : 'bg-[#111A2B] text-slate-400 border-[#1F2E4A] hover:text-white'
            }`}
          >
            OFFLINE ({players.length - onlineCount})
          </button>
        </div>
      </div>

      {/* Players Table */}
      {isLoading ? (
        <LoadingSpinner label="Loading competitor roster..." />
      ) : (
        <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1F2E4A] bg-[#111A2B] text-[11px] font-mono-tech uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">Connection</th>
                  <th className="py-3.5 px-4">Username</th>
                  <th className="py-3.5 px-4">Display / Team Name</th>
                  <th className="py-3.5 px-4 text-right">Total Score</th>
                  <th className="py-3.5 px-4 text-center">Answered</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162136] text-sm font-medium text-slate-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500 font-mono-tech text-xs">
                      No matching competitors found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((player) => (
                    <tr key={player.id} className="hover:bg-[#111A2B]/70 transition-colors">
                      {/* Connection status */}
                      <td className="py-3 px-4">
                        {player.isConnected ? (
                          <div className="flex items-center gap-1.5 font-mono-tech text-xs text-cyan-400">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                            <span>ONLINE</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 font-mono-tech text-xs text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-slate-600" />
                            <span>OFFLINE</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono-tech font-bold text-white">
                        @{player.username}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-100">
                        {player.displayName}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-display font-black text-yellow-400 text-base">
                          {player.score.toLocaleString()}
                        </span>
                        <span className="font-mono-tech text-[10px] text-slate-500 uppercase ml-1">PTS</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-mono-tech text-xs text-emerald-400 font-bold px-2 py-0.5 rounded bg-[#162136]">
                          {player.correctAnswers} / {player.questionsAnswered}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(player)}
                          className={`font-mono-tech text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border transition-colors ${
                            player.isActive
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          {player.isActive ? 'ACTIVE' : 'DISABLED'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setResetPassId(player.id);
                              setNewPassword('quiz123');
                            }}
                            className="p-1.5 rounded-lg bg-[#162136] hover:bg-yellow-500/20 text-slate-400 hover:text-yellow-300 transition-colors"
                            title="Reset password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleForceSignOut(player)}
                            disabled={!player.isConnected}
                            className="p-1.5 rounded-lg bg-[#162136] hover:bg-orange-500/20 text-slate-400 hover:text-orange-300 transition-colors disabled:opacity-30 disabled:hover:bg-[#162136] disabled:hover:text-slate-400"
                            title={
                              player.isConnected
                                ? 'Force sign-out — frees this account so it can log in elsewhere'
                                : 'Not signed in anywhere'
                            }
                          >
                            <WifiOff className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(player.id)}
                            className="p-1.5 rounded-lg bg-[#162136] hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete player"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Bulk Generator Modal */}
      <AddPlayerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadPlayers}
      />

      {/* Reset Password Modal */}
      {resetPassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0D1322] border-2 border-yellow-500/50 rounded-2xl p-6 relative">
            <h3 className="font-display font-bold text-xl text-white mb-4 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-yellow-400" />
              Reset Player Password
            </h3>

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
                  New Password
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-yellow-400 rounded-xl text-white text-sm outline-none font-mono-tech font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setResetPassId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-yellow-400 text-black font-display font-bold text-xs"
                >
                  SET PASSWORD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Remove Competitor?"
        message="Are you sure you want to remove this player? Their answer records will be permanently deleted from the database."
        confirmLabel="REMOVE PLAYER"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
