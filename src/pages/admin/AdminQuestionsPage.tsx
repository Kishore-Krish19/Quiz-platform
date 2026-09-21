import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Zap,
  CheckCircle2,
  Layers,
  Search,
} from 'lucide-react';
import { api } from '../../services/api';
import { Question, Round } from '../../types';
import { QuestionEditorModal } from '../../components/admin/QuestionEditorModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminQuestionsPage: React.FC = () => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const roundsRes = await api.getRounds();
      setRounds(roundsRes.rounds);

      const activeRound = roundsRes.rounds[0];
      const targetRoundId = selectedRoundId || activeRound?.id || '';
      setSelectedRoundId(targetRoundId);

      if (targetRoundId) {
        const qRes = await api.getQuestions(targetRoundId);
        setQuestions(qRes.questions);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoundChange = async (roundId: string) => {
    setSelectedRoundId(roundId);
    try {
      setIsLoading(true);
      const qRes = await api.getQuestions(roundId);
      setQuestions(qRes.questions);
    } catch (err) {
      console.error('Failed to load questions for round:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuestion = async (data: Partial<Question>) => {
    if (editingQuestion) {
      await api.updateQuestion(editingQuestion.id, data);
    } else {
      await api.createQuestion(selectedRoundId, data);
    }
    if (selectedRoundId) {
      const qRes = await api.getQuestions(selectedRoundId);
      setQuestions(qRes.questions);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteTargetId) return;
    try {
      await api.deleteQuestion(deleteTargetId);
      setDeleteTargetId(null);
      if (selectedRoundId) {
        const qRes = await api.getQuestions(selectedRoundId);
        setQuestions(qRes.questions);
      }
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  const filteredQuestions = questions.filter((q) =>
    q.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-wide flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-cyan-400" />
            Technical Question Bank
          </h1>
          <p className="font-mono-tech text-xs text-slate-400">
            Author and inspect competitive multiple-choice questions per round.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingQuestion(null);
            setIsEditorOpen(true);
          }}
          disabled={!selectedRoundId}
          className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black text-sm tracking-wide shadow-[0_0_20px_rgba(0,229,255,0.4)] flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ADD QUESTION</span>
        </button>
      </div>

      {/* Round Selector Bar & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#0D1322] border border-[#1F2E4A] rounded-2xl p-4">
        <div className="sm:col-span-1 flex flex-col gap-1">
          <label className="font-mono-tech text-[10px] uppercase font-bold text-slate-400">
            Select Round
          </label>
          <select
            value={selectedRoundId}
            onChange={(e) => handleRoundChange(e.target.value)}
            className="p-2.5 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm font-semibold outline-none"
          >
            {rounds.map((r, idx) => (
              <option key={r.id} value={r.id}>
                Round {r.roundNumber || idx + 1}: {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="font-mono-tech text-[10px] uppercase font-bold text-slate-400">
            Filter Questions
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search question text or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Question List */}
      {isLoading ? (
        <LoadingSpinner label="Loading questions..." />
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-[#0D1322] border-2 border-dashed border-[#1F2E4A] rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <HelpCircle className="w-12 h-12 text-slate-600" />
          <h3 className="font-display font-bold text-xl text-slate-300">No Questions Found</h3>
          <p className="text-xs text-slate-500 font-mono-tech max-w-sm">
            Create your first MCQ question for this competition round using the button above.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredQuestions.map((q, idx) => {
            const correctOpt = q.options.find((o) => o.id === q.correctOptionId);

            return (
              <div
                key={q.id}
                className="bg-[#0D1322] border border-[#1F2E4A] hover:border-slate-600 rounded-2xl p-5 flex flex-col gap-4 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-display font-black text-sm shrink-0">
                      Q{q.order || idx + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-bold text-white leading-snug">{q.text}</p>
                      <div className="flex items-center gap-3 font-mono-tech text-xs text-slate-400">
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Clock className="w-3.5 h-3.5" />
                          {q.duration}s
                        </span>
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Zap className="w-3.5 h-3.5" />
                          {q.points} PTS
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingQuestion(q);
                        setIsEditorOpen(true);
                      }}
                      className="p-2 rounded-lg bg-[#162136] hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Edit question"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(q.id)}
                      className="p-2 rounded-lg bg-[#162136] hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Options Grid Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#1F2E4A]/60">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = opt.id === q.correctOptionId;
                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 font-bold'
                          : 'bg-[#070B14] border-[#1F2E4A] text-slate-400'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${isCorrect ? 'bg-emerald-400 text-black' : 'bg-[#162136] text-slate-400'
                              }`}
                          >
                            {letters[optIdx]}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                        {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <p className="text-[11px] font-mono-tech text-slate-500 bg-[#070B14] p-2 rounded-lg border border-[#162136]">
                    <strong className="text-cyan-400">Explanation:</strong> {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Question Editor Modal */}
      <QuestionEditorModal
        isOpen={isEditorOpen}
        question={editingQuestion}
        roundId={selectedRoundId}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveQuestion}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Question?"
        message="Are you sure you want to delete this question? Any submitted answers for this question will also be removed."
        confirmLabel="DELETE QUESTION"
        variant="danger"
        onConfirm={handleDeleteQuestion}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
