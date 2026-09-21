import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export const FullscreenToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <button
      data-fullscreen-toggle
      onClick={toggleFullscreen}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D1322] border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 font-mono-tech text-xs transition-all ${className}`}
      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode'}
    >
      {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">{isFullscreen ? 'EXIT FULL' : 'FULLSCREEN'}</span>
    </button>
  );
};
