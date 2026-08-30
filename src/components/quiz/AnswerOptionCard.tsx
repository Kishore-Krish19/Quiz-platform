import React from 'react';
import { Check, X, Lock } from 'lucide-react';
import { QuestionOption } from '../../types';

interface AnswerOptionCardProps {
  option: QuestionOption;
  index: number;
  isSelected: boolean;
  isLocked: boolean;
  isDisabled: boolean;
  revealState?: 'correct' | 'incorrect' | 'neutral' | null;
  onSelect: (optionId: string) => void;
}

export const AnswerOptionCard: React.FC<AnswerOptionCardProps> = ({
  option,
  index,
  isSelected,
  isLocked,
  isDisabled,
  revealState = null,
  onSelect,
}) => {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const letter = letters[index] || String(index + 1);
  const hotkeyNumber = index + 1;

  // Determine card appearance styles
  let containerStyle =
    'bg-[#0D1322] border-2 border-[#1F2E4A] hover:border-cyan-400 hover:bg-[#111A2B] text-slate-200 cursor-pointer shadow-lg';
  let badgeStyle = 'bg-[#1F2E4A] text-slate-300 border border-slate-600';
  let glowEffect = '';

  if (revealState === 'correct') {
    containerStyle =
      'bg-emerald-950/40 border-2 border-emerald-400 text-emerald-100 shadow-[0_0_25px_rgba(52,211,153,0.35)]';
    badgeStyle = 'bg-emerald-500 text-black border-emerald-400 font-bold';
    glowEffect = 'shadow-[0_0_15px_rgba(52,211,153,0.5)]';
  } else if (revealState === 'incorrect') {
    containerStyle =
      'bg-red-950/40 border-2 border-red-500 text-red-100 shadow-[0_0_25px_rgba(239,68,68,0.35)]';
    badgeStyle = 'bg-red-500 text-white border-red-400 font-bold';
  } else if (isSelected) {
    containerStyle =
      'bg-cyan-950/40 border-2 border-cyan-400 text-cyan-50 shadow-[0_0_25px_rgba(0,229,255,0.4)] scale-[1.01]';
    badgeStyle = 'bg-cyan-400 text-black border-cyan-300 font-bold';
  } else if (isDisabled || isLocked) {
    containerStyle = 'bg-[#0A0E18] border-2 border-[#162136] text-slate-400 cursor-not-allowed opacity-80';
    badgeStyle = 'bg-[#162136] text-slate-500 border-slate-700';
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (!isDisabled && !isLocked) {
          onSelect(option.id);
        }
      }}
      disabled={isDisabled || isLocked}
      className={`group relative w-full text-left p-4 md:p-5 rounded-2xl transition-all duration-200 flex items-center justify-between gap-4 ${containerStyle} ${glowEffect}`}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Letter Badge / Hotkey Indicator */}
        <div
          className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl font-display font-black text-lg md:text-xl transition-transform duration-200 group-hover:scale-105 ${badgeStyle}`}
        >
          {letter}
        </div>

        {/* Option Text */}
        <span className="font-semibold text-base md:text-lg leading-snug flex-1">
          {option.text}
        </span>
      </div>

      {/* Right Action / Status Icons */}
      <div className="flex items-center gap-2">
        {revealState === 'correct' && (
          <div className="p-1.5 rounded-lg bg-emerald-400 text-black animate-bounce">
            <Check className="w-5 h-5 stroke-[3]" />
          </div>
        )}

        {revealState === 'incorrect' && (
          <div className="p-1.5 rounded-lg bg-red-500 text-white">
            <X className="w-5 h-5 stroke-[3]" />
          </div>
        )}

        {isLocked && !revealState && isSelected && (
          <div className="flex items-center gap-1 text-cyan-400 font-mono-tech text-xs font-bold px-2 py-1 rounded bg-cyan-950 border border-cyan-500/40">
            <Lock className="w-3.5 h-3.5" />
            <span>LOCKED</span>
          </div>
        )}

        {/* Keyboard hint badge (visible on desktop) */}
        {!isDisabled && !isLocked && !revealState && (
          <span className="hidden md:inline-block font-mono-tech text-[10px] uppercase font-bold text-slate-500 group-hover:text-cyan-400 px-2 py-1 rounded bg-slate-900 border border-slate-800 transition-colors">
            Key [{hotkeyNumber}]
          </span>
        )}
      </div>
    </button>
  );
};
