import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading...',
  size = 'md',
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 select-none ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-cyan-500/30 blur-lg rounded-full animate-ping" />
        <Loader2 className={`${iconSizes[size]} text-cyan-400 animate-spin relative z-10`} />
      </div>
      {label && <p className="font-mono-tech text-xs tracking-wider text-cyan-300/80 uppercase font-semibold">{label}</p>}
    </div>
  );
};
