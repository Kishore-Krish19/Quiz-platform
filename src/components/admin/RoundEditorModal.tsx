import React, { useState, useEffect } from 'react';
import { X, Layers, Zap } from 'lucide-react';
import { Round, ScoringType } from '../../types';

interface RoundEditorModalProps {
  isOpen: boolean;
  round: Round | null;
  onClose: () => void;
  onSave: (data: Partial<Round>) => Promise<void>;
}

export const RoundEditorModal: React.FC<RoundEditorModalProps> = ({
  isOpen,
  round,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultDuration, setDefaultDuration] = useState(10);
  const [scoringType, setScoringType] = useState<ScoringType>('SPEED_BASED');
  const [basePoints, setBasePoints] = useState(1000);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (round) {
      setName(round.name || '');
      setDescription(round.description || '');
      setDefaultDuration(round.defaultDuration || 10);
      setScoringType(round.scoringConfig?.type || 'SPEED_BASED');
      setBasePoints(round.scoringConfig?.basePoints || 1000);
    } else {
      setName('');
      setDescription('');
      setDefaultDuration(10);
      setScoringType('SPEED_BASED');
      setBasePoints(1000);
    }
    setError(null);
  }, [round, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Round name is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave({
        name: name.trim(),
        description: description.trim(),
        defaultDuration: Number(defaultDuration) || 10,
        scoringConfig: {
          type: scoringType,
          basePoints: Number(basePoints) || 1000,
          minPoints: 100,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save round');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#0D1322] border-2 border-cyan-500/50 rounded-2xl p-6 relative shadow-[0_0_40px_rgba(0,229,255,0.2)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Layers className="w-6 h-6 text-cyan-400" />
          <h3 className="font-display font-bold text-2xl text-white tracking-wide">
            {round ? 'Edit Round Configuration' : 'Create Competition Round'}
          </h3>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-mono-tech text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
              Round Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Round 2 — Coding Diagnostics"
              className="p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the themes or requirements for this round..."
              className="p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
                Default Timer (Sec)
              </label>
              <select
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                className="p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm outline-none font-mono-tech"
              >
                <option value={5}>5s (Speed)</option>
                <option value={10}>10s (Standard)</option>
                <option value={15}>15s</option>
                <option value={20}>20s</option>
                <option value={30}>30s</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
                Scoring Engine
              </label>
              <select
                value={scoringType}
                onChange={(e) => setScoringType(e.target.value as ScoringType)}
                className="p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm outline-none font-mono-tech"
              >
                <option value="SPEED_BASED">Speed-Based (Dynamic)</option>
                <option value="FIXED">Fixed Points</option>
                <option value="CUSTOM">Custom Ratio</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono-tech text-xs uppercase font-bold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              Base Max Points per Question
            </label>
            <input
              type="number"
              min={100}
              max={10000}
              step={100}
              value={basePoints}
              onChange={(e) => setBasePoints(Number(e.target.value))}
              className="p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-yellow-400 rounded-xl text-yellow-400 font-display font-black text-sm outline-none"
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
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black text-sm shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50"
            >
              {isSaving ? 'SAVING...' : 'SAVE ROUND'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
