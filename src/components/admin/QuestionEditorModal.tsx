import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, Clock, Zap } from 'lucide-react';
import { Question, QuestionOption } from '../../types';

interface QuestionEditorModalProps {
  isOpen: boolean;
  question: Question | null;
  roundId: string;
  onClose: () => void;
  onSave: (data: Partial<Question>) => Promise<void>;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  question,
  roundId,
  onClose,
  onSave,
}) => {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: 'opt_a', text: '' },
    { id: 'opt_b', text: '' },
    { id: 'opt_c', text: '' },
    { id: 'opt_d', text: '' },
  ]);
  const [correctOptionId, setCorrectOptionId] = useState('opt_a');
  const [duration, setDuration] = useState<number>(10);
  const [points, setPoints] = useState<number>(1000);
  const [explanation, setExplanation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (question) {
      setText(question.text || '');
      setOptions(
        question.options && question.options.length > 0
          ? question.options
          : [
              { id: 'opt_a', text: '' },
              { id: 'opt_b', text: '' },
              { id: 'opt_c', text: '' },
              { id: 'opt_d', text: '' },
            ]
      );
      setCorrectOptionId(question.correctOptionId || question.options[0]?.id || 'opt_a');
      setDuration(question.duration || 10);
      setPoints(question.points || 1000);
      setExplanation(question.explanation || '');
    } else {
      setText('');
      setOptions([
        { id: 'opt_a', text: '' },
        { id: 'opt_b', text: '' },
        { id: 'opt_c', text: '' },
        { id: 'opt_d', text: '' },
      ]);
      setCorrectOptionId('opt_a');
      setDuration(10);
      setPoints(1000);
      setExplanation('');
    }
    setError(null);
  }, [question, isOpen]);

  if (!isOpen) return null;

  const handleOptionChange = (idx: number, newText: string) => {
    const next = [...options];
    next[idx] = { ...next[idx], text: newText };
    setOptions(next);
  };

  const handleAddOption = () => {
    if (options.length >= 6) return;
    const newId = `opt_${Date.now()}`;
    setOptions([...options, { id: newId, text: '' }]);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    const removedId = options[idx].id;
    const next = options.filter((_, i) => i !== idx);
    setOptions(next);
    if (correctOptionId === removedId) {
      setCorrectOptionId(next[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Question text is required');
      return;
    }
    const emptyOption = options.some((opt) => !opt.text.trim());
    if (emptyOption) {
      setError('All options must have non-empty text');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave({
        roundId,
        text: text.trim(),
        options: options.map((opt) => ({ id: opt.id, text: opt.text.trim() })),
        correctOptionId,
        duration: Number(duration) || 10,
        points: Number(points) || 1000,
        explanation: explanation.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    } finally {
      setIsSaving(false);
    }
  };

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0D1322] border-2 border-cyan-500/50 rounded-2xl p-6 relative my-8 shadow-[0_0_40px_rgba(0,229,255,0.2)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display font-bold text-2xl text-white tracking-wide mb-6 flex items-center gap-2">
          <Zap className="w-6 h-6 text-cyan-400" />
          {question ? 'Edit Quiz Question' : 'Add New Technical MCQ Question'}
        </h3>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-mono-tech text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Question Text */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
              Question Statement *
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. In the OSI model, at which layer does TLS operate?"
              className="w-full p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-colors"
              required
            />
          </div>

          {/* Options List */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
                Options & Correct Answer Selection *
              </label>
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="flex items-center gap-1 font-mono-tech text-xs font-bold text-cyan-400 hover:text-cyan-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {options.map((opt, idx) => {
                const isSelectedCorrect = correctOptionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                      isSelectedCorrect
                        ? 'bg-emerald-950/30 border-emerald-500'
                        : 'bg-[#070B14] border-[#1F2E4A]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCorrectOptionId(opt.id)}
                      className={`flex items-center justify-center w-8 h-8 rounded-lg font-display font-black text-sm transition-all ${
                        isSelectedCorrect
                          ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                          : 'bg-[#162136] text-slate-400 hover:text-white'
                      }`}
                      title="Click to mark as correct answer"
                    >
                      {letters[idx]}
                    </button>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${letters[idx]} text...`}
                      className="flex-1 bg-transparent px-2 py-1 text-sm text-white placeholder-slate-600 outline-none"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setCorrectOptionId(opt.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono-tech font-bold transition-all ${
                        isSelectedCorrect
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {isSelectedCorrect ? '✓ CORRECT' : 'Set Correct'}
                    </button>

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Duration & Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono-tech text-xs uppercase font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Timer Duration (Seconds)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full p-2.5 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm outline-none font-mono-tech font-semibold"
              >
                <option value={5}>5 seconds (Lightning)</option>
                <option value={10}>10 seconds (Standard)</option>
                <option value={15}>15 seconds</option>
                <option value={20}>20 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds (Complex)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono-tech text-xs uppercase font-bold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                Base Points
              </label>
              <input
                type="number"
                min={100}
                max={10000}
                step={100}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full p-2.5 bg-[#070B14] border border-[#1F2E4A] focus:border-yellow-400 rounded-xl text-yellow-400 font-display font-black text-sm outline-none"
              />
            </div>
          </div>

          {/* Explanation */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono-tech text-xs uppercase font-bold text-slate-300">
              Explanation (Revealed after question)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why the answer is correct for the competitors..."
              className="w-full p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-colors"
            />
          </div>

          {/* Action buttons */}
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
              className="px-6 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black tracking-wide text-sm shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50"
            >
              {isSaving ? 'SAVING...' : 'SAVE QUESTION'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
