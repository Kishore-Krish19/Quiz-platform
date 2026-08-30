import React from 'react';

interface GadgetLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const GadgetLogo: React.FC<GadgetLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: { title: 'text-lg', subtitle: 'text-[9px]', icon: 'w-5 h-5', badge: 'text-[9px] px-1.5 py-0.5' },
    md: { title: 'text-2xl', subtitle: 'text-xs', icon: 'w-7 h-7', badge: 'text-[10px] px-2 py-0.5' },
    lg: { title: 'text-4xl', subtitle: 'text-sm', icon: 'w-10 h-10', badge: 'text-xs px-2.5 py-1' },
    xl: { title: 'text-5xl md:text-6xl', subtitle: 'text-base', icon: 'w-14 h-14', badge: 'text-sm px-3 py-1' },
  };

  const current = sizeClasses[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Cartoon Tech Icon */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-xl animate-pulse" />
        <div className="relative bg-[#0D1322] border-2 border-cyan-400 p-2 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.4)]">
          <svg
            className={`${current.icon} text-cyan-400`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Robot Head / Microchip Body */}
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M12 2v3" />
            <circle cx="12" cy="2" r="1" fill="#FFD600" />
            <path d="M9 10h.01" strokeWidth="3" stroke="#00E5FF" />
            <path d="M15 10h.01" strokeWidth="3" stroke="#00E5FF" />
            <path d="M8 15h8" stroke="#FFD600" />
          </svg>
        </div>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`font-display font-black tracking-wider text-white ${current.title} drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]`}>
            GADGET <span className="text-cyan-400 text-glow-cyan">CODE</span>
          </span>
          <span className={`font-mono-tech font-bold uppercase rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 ${current.badge}`}>
            v1.0
          </span>
        </div>
        {showSubtitle && (
          <span className={`font-mono-tech tracking-widest uppercase font-semibold text-cyan-300/80 ${current.subtitle} flex items-center gap-1.5`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            TECHNICAL QUIZ PLATFORM
          </span>
        )}
      </div>
    </div>
  );
};
