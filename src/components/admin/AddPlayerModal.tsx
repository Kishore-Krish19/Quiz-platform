import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { api } from '../../services/api';
import { IssuedCredential } from '../../types';
import { CredentialSheet } from './CredentialSheet';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  // Bulk mode
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkPrefix, setBulkPrefix] = useState('player');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSummary, setCreatedSummary] = useState<{ message: string; credentials: IssuedCredential[] } | null>(
    null
  );

  if (!isOpen) return null;

  const handleClose = () => {
    // The generated passwords must not linger in memory once the sheet is dismissed.
    setCreatedSummary(null);
    onClose();
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      await api.createPlayer({
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
        password,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create player');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.bulkCreatePlayers(bulkCount, bulkPrefix);
      setCreatedSummary({ message: res.message, credentials: res.credentials });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to bulk create players');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg max-h-full overflow-y-auto bg-[#0D1322] border-2 border-cyan-500/50 rounded-2xl p-6 relative shadow-[0_0_40px_rgba(0,229,255,0.2)]">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-6 h-6 text-cyan-400" />
          <h3 className="font-display font-bold text-2xl text-white tracking-wide">
            Add Competition Competitors
          </h3>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-[#070B14] p-1 border border-[#1F2E4A] mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('single');
              setCreatedSummary(null);
            }}
            className={`flex-1 py-2 rounded-lg font-mono-tech text-xs font-bold transition-all ${
              mode === 'single'
                ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Single Player
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('bulk');
              setCreatedSummary(null);
            }}
            className={`flex-1 py-2 rounded-lg font-mono-tech text-xs font-bold transition-all ${
              mode === 'bulk'
                ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bulk Generator (40+ Lab PCs)
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-mono-tech text-xs">
            {error}
          </div>
        )}

        {createdSummary ? (
          <div className="flex flex-col gap-3">
            <h4 className="font-display font-bold text-lg text-emerald-400">{createdSummary.message}</h4>
            {createdSummary.credentials.length > 0 ? (
              <CredentialSheet credentials={createdSummary.credentials} onDone={handleClose} />
            ) : (
              <p className="text-sm text-slate-400">
                Every username in that range already exists, so nothing was created.
              </p>
            )}
          </div>
        ) : mode === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
                Username (Login ID) *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. player11"
                className="p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
                Display Name / Team Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Quantum Knights (Lab 11)"
                className="p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#1F2E4A]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black text-sm shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50"
              >
                {isLoading ? 'CREATING...' : 'CREATE PLAYER'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBulkSubmit} className="flex flex-col gap-4">
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Quickly generate 10–50 player accounts for computer-lab competitions (e.g. player01 to player40). Each
              account gets its own generated password, shown once on a printable sheet.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
                  Number of Players
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Number(e.target.value))}
                  className="p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm font-bold outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
                  Username Prefix
                </label>
                <input
                  type="text"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  placeholder="player"
                  className="p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#1F2E4A]">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-display font-black text-sm shadow-[0_0_20px_rgba(255,214,0,0.4)] disabled:opacity-50"
              >
                {isLoading ? 'GENERATING...' : `GENERATE ${bulkCount} PLAYERS`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
