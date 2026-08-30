import React, { useEffect, useState, useRef } from 'react';
import { sounds } from '../../utils/soundEffects';

interface QuizTimerProps {
  startTime: number | null;
  endTime: number | null;
  duration: number; // in seconds
  isActive: boolean;
  onTimeExpire?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const QuizTimer: React.FC<QuizTimerProps> = ({
  startTime,
  endTime,
  duration,
  isActive,
  onTimeExpire,
  size = 'md',
  className = '',
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (!endTime || !isActive) return duration * 1000;
    return Math.max(0, endTime - Date.now());
  });

  const lastBeepSecond = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || !endTime) {
      setRemainingMs(duration * 1000);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, endTime - now);
      setRemainingMs(left);

      const secondsLeft = Math.ceil(left / 1000);

      // Play audio cue for the last 3 seconds
      if (secondsLeft <= 3 && secondsLeft > 0 && secondsLeft !== lastBeepSecond.current) {
        lastBeepSecond.current = secondsLeft;
        sounds.playTimerBeep(true);
      }

      if (left <= 0) {
        clearInterval(interval);
        if (onTimeExpire) {
          onTimeExpire();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, endTime, duration, onTimeExpire]);

  const totalDurationMs = (duration || 10) * 1000;
  const progressRatio = Math.max(0, Math.min(1, remainingMs / totalDurationMs));
  const secondsDisplay = Math.ceil(remainingMs / 1000);
  const formattedSeconds = String(secondsDisplay).padStart(2, '0');

  // Color urgency calculation
  const isCritical = secondsDisplay <= 3 && isActive;
  const isWarning = secondsDisplay <= Math.max(4, Math.floor(duration * 0.4)) && !isCritical;

  let strokeColor = '#00E5FF'; // Cyan
  let glowClass = 'drop-shadow-[0_0_12px_rgba(0,229,255,0.6)]';
  let textClass = 'text-cyan-400 text-glow-cyan';

  if (isCritical) {
    strokeColor = '#FF3D57'; // Red
    glowClass = 'drop-shadow-[0_0_18px_rgba(255,61,87,0.8)]';
    textClass = 'text-red-400 text-glow-red animate-pulse';
  } else if (isWarning) {
    strokeColor = '#FFD600'; // Yellow
    glowClass = 'drop-shadow-[0_0_12px_rgba(255,214,0,0.6)]';
    textClass = 'text-yellow-400 text-glow-yellow';
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const containerSizes = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32 md:w-36 md:h-36',
    lg: 'w-44 h-44 md:w-48 md:h-48',
  };

  return (
    <div className={`relative flex items-center justify-center select-none ${containerSizes[size]} ${className}`}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="#111A2B"
          strokeWidth="7"
        />
        {/* Animated Progress Ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-100 ${glowClass}`}
        />
      </svg>

      {/* Center Digital Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {secondsDisplay === 0 && !isActive ? (
          <span className="font-display font-black text-xs md:text-sm text-red-400 tracking-wider">
            TIME'S UP
          </span>
        ) : (
          <>
            <span
              className={`font-display font-black ${
                size === 'sm' ? 'text-2xl' : size === 'md' ? 'text-4xl md:text-5xl' : 'text-6xl'
              } ${textClass}`}
            >
              {formattedSeconds}
            </span>
            <span className="font-mono-tech text-[10px] md:text-xs uppercase font-bold text-slate-400 tracking-widest -mt-1">
              SEC
            </span>
          </>
        )}
      </div>
    </div>
  );
};
