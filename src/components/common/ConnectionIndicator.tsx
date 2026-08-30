import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSocket } from '../../store/socketContext';

interface ConnectionIndicatorProps {
  className?: string;
  showText?: boolean;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  className = '',
  showText = true,
}) => {
  const { isConnected, isConnecting } = useSocket();

  if (isConnecting) {
    return (
      <div
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono-tech text-xs select-none ${className}`}
        title="Attempting to establish WebSocket synchronization"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        {showText && <span>RECONNECTING...</span>}
      </div>
    );
  }

  if (isConnected) {
    return (
      <div
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-mono-tech text-xs select-none shadow-[0_0_10px_rgba(0,229,255,0.2)] ${className}`}
        title="Real-time LAN WebSocket connected"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
        </span>
        <Wifi className="w-3.5 h-3.5 text-cyan-400" />
        {showText && <span>LAN LIVE</span>}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/40 text-red-400 font-mono-tech text-xs select-none ${className}`}
      title="Disconnected from quiz server"
    >
      <WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
      {showText && <span>OFFLINE</span>}
    </div>
  );
};
