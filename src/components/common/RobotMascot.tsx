import React from 'react';

export type MascotMood = 'neutral' | 'thinking' | 'excited' | 'celebrating' | 'alert';

interface RobotMascotProps {
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const RobotMascot: React.FC<RobotMascotProps> = ({
  mood = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-16 h-16',
    md: 'w-28 h-28',
    lg: 'w-40 h-40',
    xl: 'w-56 h-56',
  };

  const getMoodColors = () => {
    switch (mood) {
      case 'alert':
        return { eye: '#FF3D57', glow: 'rgba(255, 61, 87, 0.6)', antenna: '#FF3D57' };
      case 'celebrating':
        return { eye: '#FFD600', glow: 'rgba(255, 214, 0, 0.7)', antenna: '#FFD600' };
      case 'excited':
        return { eye: '#00E5FF', glow: 'rgba(0, 229, 255, 0.7)', antenna: '#FFD600' };
      case 'thinking':
        return { eye: '#00E5FF', glow: 'rgba(0, 229, 255, 0.5)', antenna: '#00E5FF' };
      case 'neutral':
      default:
        return { eye: '#00E5FF', glow: 'rgba(0, 229, 255, 0.5)', antenna: '#00E5FF' };
    }
  };

  const colors = getMoodColors();

  return (
    <div className={`relative flex items-center justify-center select-none ${sizeMap[size]} ${className}`}>
      {/* Background Pulse Glow */}
      <div
        className="absolute inset-2 rounded-full blur-xl opacity-50 animate-pulse transition-colors duration-500"
        style={{ backgroundColor: colors.glow }}
      />

      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
      >
        {/* Antenna */}
        <line x1="60" y1="28" x2="60" y2="12" stroke="#4A5568" strokeWidth="4" strokeLinecap="round" />
        <circle cx="60" cy="10" r="6" fill={colors.antenna} className="animate-pulse" />
        <circle cx="60" cy="10" r="10" stroke={colors.antenna} strokeWidth="2" strokeOpacity="0.4" />

        {/* Ears / Head Bolts */}
        <rect x="18" y="44" width="8" height="24" rx="4" fill="#1F2E4A" stroke="#00E5FF" strokeWidth="2" />
        <rect x="94" y="44" width="8" height="24" rx="4" fill="#1F2E4A" stroke="#00E5FF" strokeWidth="2" />

        {/* Head Shell */}
        <rect
          x="24"
          y="26"
          width="72"
          height="62"
          rx="18"
          fill="#0D1322"
          stroke="#1F2E4A"
          strokeWidth="3.5"
        />

        {/* Head Inner Screen / Visor */}
        <rect
          x="30"
          y="34"
          width="60"
          height="46"
          rx="12"
          fill="#070B14"
          stroke={mood === 'alert' ? '#FF3D57' : '#00E5FF'}
          strokeWidth="2"
          strokeOpacity="0.8"
        />

        {/* Mascot Eyes depending on Mood */}
        {mood === 'neutral' && (
          <>
            <circle cx="46" cy="52" r="6" fill={colors.eye} />
            <circle cx="48" cy="50" r="2" fill="#FFFFFF" />
            <circle cx="74" cy="52" r="6" fill={colors.eye} />
            <circle cx="76" cy="50" r="2" fill="#FFFFFF" />
            {/* Smile */}
            <path d="M50 66 Q60 74 70 66" stroke="#00E5FF" strokeWidth="3" strokeLinecap="round" />
          </>
        )}

        {mood === 'excited' && (
          <>
            {/* Star/Wide Eyes */}
            <path
              d="M46 46 L48 51 L53 52 L49 56 L50 61 L46 58 L42 61 L43 56 L39 52 L44 51 Z"
              fill="#FFD600"
            />
            <path
              d="M74 46 L76 51 L81 52 L77 56 L78 61 L74 58 L70 61 L71 56 L67 52 L72 51 Z"
              fill="#FFD600"
            />
            {/* Big Open Smile */}
            <path d="M46 66 Q60 80 74 66 Z" fill="#00E5FF" stroke="#00E5FF" strokeWidth="2" />
          </>
        )}

        {mood === 'thinking' && (
          <>
            <circle cx="46" cy="50" r="5" fill="#00E5FF" />
            <rect x="68" y="47" width="12" height="4" rx="2" fill="#00E5FF" />
            {/* Puzzled mouth */}
            <path d="M52 68 Q60 62 68 68" stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {mood === 'celebrating' && (
          <>
            {/* Joyful curved eyes ^^ */}
            <path d="M40 54 Q46 44 52 54" stroke="#FFD600" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M68 54 Q74 44 80 54" stroke="#FFD600" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M46 66 Q60 80 74 66" stroke="#FFD600" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Confetti Sparks around ears */}
            <circle cx="20" cy="20" r="2.5" fill="#00E5FF" />
            <circle cx="100" cy="22" r="3" fill="#FFD600" />
            <circle cx="106" cy="40" r="2" fill="#FF3D57" />
          </>
        )}

        {mood === 'alert' && (
          <>
            {/* Intense slant alert eyes */}
            <line x1="40" y1="46" x2="52" y2="56" stroke="#FF3D57" strokeWidth="4" strokeLinecap="round" />
            <line x1="80" y1="46" x2="68" y2="56" stroke="#FF3D57" strokeWidth="4" strokeLinecap="round" />
            <path d="M48 68 Q60 62 72 68" stroke="#FF3D57" strokeWidth="3" strokeLinecap="round" />
          </>
        )}

        {/* Neck connector */}
        <rect x="52" y="88" width="16" height="8" rx="2" fill="#1F2E4A" />

        {/* Body Base */}
        <path
          d="M34 96 C34 96 46 94 60 94 C74 94 86 96 86 96 C92 97 96 102 96 108 L96 112 L24 112 L24 108 C24 102 28 97 34 96 Z"
          fill="#0D1322"
          stroke="#1F2E4A"
          strokeWidth="3"
        />

        {/* Chest Core Indicator */}
        <circle cx="60" cy="104" r="4" fill={colors.eye} />
      </svg>
    </div>
  );
};
