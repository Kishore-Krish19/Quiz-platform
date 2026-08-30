import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'cyan' | 'yellow' | 'red' | 'emerald';
  badge?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'cyan',
  badge,
  className = '',
}) => {
  const variantStyles = {
    cyan: {
      border: 'border-cyan-500/30 hover:border-cyan-400',
      iconBg: 'bg-cyan-500/15 text-cyan-400',
      glow: 'shadow-[0_0_15px_rgba(0,229,255,0.15)]',
      textGlow: 'text-cyan-300 text-glow-cyan',
    },
    yellow: {
      border: 'border-yellow-500/30 hover:border-yellow-400',
      iconBg: 'bg-yellow-500/15 text-yellow-400',
      glow: 'shadow-[0_0_15px_rgba(255,214,0,0.15)]',
      textGlow: 'text-yellow-400 text-glow-yellow',
    },
    red: {
      border: 'border-red-500/30 hover:border-red-400',
      iconBg: 'bg-red-500/15 text-red-400',
      glow: 'shadow-[0_0_15px_rgba(255,61,87,0.15)]',
      textGlow: 'text-red-400 text-glow-red',
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-400',
      iconBg: 'bg-emerald-500/15 text-emerald-400',
      glow: 'shadow-[0_0_15px_rgba(52,211,153,0.15)]',
      textGlow: 'text-emerald-400',
    },
  };

  const current = variantStyles[variant];

  return (
    <div
      className={`relative bg-[#0D1322] border-2 ${current.border} ${current.glow} rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between select-none ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-mono-tech text-xs uppercase font-bold text-slate-400 tracking-wider">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${current.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-display font-black text-3xl md:text-4xl ${current.textGlow}`}>
          {value}
        </span>
        {badge && (
          <span className="font-mono-tech text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="font-mono-tech text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};
