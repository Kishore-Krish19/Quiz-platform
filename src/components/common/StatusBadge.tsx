import React from 'react';
import { QuizStatus, RoundStatus } from '../../types';

interface StatusBadgeProps {
  status: QuizStatus | RoundStatus | 'ONLINE' | 'OFFLINE' | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const getStyle = () => {
    switch (status) {
      case 'QUESTION_ACTIVE':
      case 'ACTIVE':
      case 'ONLINE':
        return 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.25)]';

      case 'READY':
      case 'WAITING':
        return 'bg-yellow-500/15 border-yellow-400/50 text-yellow-300';

      case 'ROUND_COMPLETED':
      case 'COMPLETED':
        return 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300';

      case 'QUESTION_ENDED':
      case 'OFFLINE':
        return 'bg-red-500/15 border-red-400/50 text-red-300';

      case 'DRAFT':
      case 'IDLE':
      default:
        return 'bg-slate-700/30 border-slate-600/50 text-slate-300';
    }
  };

  const formatText = (text: string) => {
    return text.replace(/_/g, ' ');
  };

  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono-tech font-bold uppercase tracking-wider rounded-md border ${sizeClass} ${getStyle()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {formatText(status)}
    </span>
  );
};
