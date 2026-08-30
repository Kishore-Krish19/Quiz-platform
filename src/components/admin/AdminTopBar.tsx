import React from 'react';
import { ConnectionIndicator } from '../common/ConnectionIndicator';
import { StatusBadge } from '../common/StatusBadge';
import { FullscreenToggle } from '../common/FullscreenToggle';
import { useSocket } from '../../store/socketContext';
import { PlaySquare, Globe } from 'lucide-react';

interface AdminTopBarProps {
  title?: string;
  className?: string;
}

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  title = 'Command Center',
  className = '',
}) => {
  const { quizState } = useSocket();

  return (
    <header
      className={`h-16 border-b border-[#1F2E4A] bg-[#0A0F1D]/90 backdrop-blur-md px-6 flex items-center justify-between gap-4 select-none ${className}`}
    >
      {/* Title & Active Round Info */}
      <div className="flex items-center gap-4">
        <h2 className="font-display font-bold text-lg md:text-xl text-white tracking-wide flex items-center gap-2">
          {title}
        </h2>

        {quizState?.activeRoundName && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#111A2B] border border-[#1F2E4A] text-xs">
            <PlaySquare className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-slate-200">{quizState.activeRoundName}</span>
            <StatusBadge status={quizState.status} size="sm" />
          </div>
        )}
      </div>

      {/* Right Status Controls */}
      <div className="flex items-center gap-3">
        <ConnectionIndicator />
        <FullscreenToggle />
      </div>
    </header>
  );
};
