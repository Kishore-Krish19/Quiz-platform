import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Play,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { Round } from '../../types';
import { RoundEditorModal } from '../../components/admin/RoundEditorModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useSocket } from '../../store/socketContext';

export const AdminRoundsPage: React.FC = () => {
  const { quizState, selectRound } = useSocket();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadRounds = async () => {
    try {
      setIsLoading(true);
      const res = await api.getRounds();
      setRounds(res.rounds);
    } catch (err) {
      console.error('Failed to load rounds:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRounds();
  }, []);

  const handleSaveRound = async (data: Partial<Round>) => {
    if (editingRound) {
      await api.updateRound(editingRound.id, data);
    } else {
      await api.createRound(data);
    }
    loadRounds();
  };

  const handleDeleteRound = async () => {
    if (!deleteTargetId) return;
    try {
      await api.deleteRound(deleteTargetId);
      setDeleteTargetId(null);
      loadRounds();
    } catch (err) {
      console.error('Failed to delete round:', err);
    }
  };

  const handleActivateRound = (roundId: string) => {
    selectRound(roundId);
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-wide flex items-center gap-2">
            <Layers className="w-7 h-7 text-cyan-400" />
            Competition Rounds Architecture
          </h1>
          <p className="font-mono-tech text-xs text-slate-400">
            Configure round sequences, default timers, and dynamic speed scoring rules.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingRound(null);
            setIsEditorOpen(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black text-sm tracking-wide shadow-[0_0_20px_rgba(0,229,255,0.4)] flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ CREATE NEW ROUND</span>
        </button>
      </div>

      {/* Rounds Grid */}
      {isLoading ? (
        <LoadingSpinner label="Loading competition rounds..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rounds.map((round) => {
            const isCurrentlyActive = quizState?.activeRoundId === round.id;

            return (
              <div
                key={round.id}
                className={`bg-[#0D1322] border-2 rounded-3xl p-6 flex flex-col justify-between gap-5 transition-all duration-200 ${
                  isCurrentlyActive
                    ? 'border-cyan-400 shadow-[0_0_25px_rgba(0,229,255,0.25)]'
                    : 'border-[#1F2E4A] hover:border-slate-600'
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tech text-xs font-extrabold uppercase px-2.5 py-0.5 rounded bg-[#162136] text-cyan-300">
                      ROUND #{round.order}
                    </span>

                    {isCurrentlyActive && (
                      <span className="font-mono-tech text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                        ACTIVE IN ENGINE
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-xl text-white tracking-wide">
                    {round.name}
                  </h3>

                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    {round.description || 'Standard technical multiple choice question round.'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-[#1F2E4A] font-mono-tech text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase">Questions</span>
                      <span className="font-bold text-white">{round.totalQuestions || 0} MCQs</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase">Default Timer</span>
                      <span className="font-bold text-cyan-400">{round.defaultDuration}s</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase">Scoring</span>
                      <span className="font-bold text-yellow-400">
                        {round.scoringConfig?.type === 'SPEED_BASED' ? 'Speed' : 'Fixed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 pt-4 border-t border-[#1F2E4A]">
                  <button
                    onClick={() => handleActivateRound(round.id)}
                    className={`flex-1 py-2.5 rounded-xl font-display font-black text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      isCurrentlyActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                        : 'bg-[#162136] hover:bg-cyan-400 hover:text-black text-slate-200'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isCurrentlyActive ? 'ACTIVE ROUND' : 'SET AS ACTIVE'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingRound(round);
                      setIsEditorOpen(true);
                    }}
                    className="p-2.5 rounded-xl bg-[#162136] hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Edit round"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeleteTargetId(round.id)}
                    className="p-2.5 rounded-xl bg-[#162136] hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete round"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      <RoundEditorModal
        isOpen={isEditorOpen}
        round={editingRound}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveRound}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Competition Round?"
        message="Deleting this round will also remove all associated questions and answers. Are you sure?"
        confirmLabel="DELETE ROUND"
        variant="danger"
        onConfirm={handleDeleteRound}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
