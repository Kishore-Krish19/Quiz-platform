import React, { useState } from 'react';
import { Gamepad2, Lock, User as UserIcon, ArrowLeft, Sparkles } from 'lucide-react';
import { GadgetLogo } from '../components/common/GadgetLogo';
import { RobotMascot } from '../components/common/RobotMascot';
import { ConnectionIndicator } from '../components/common/ConnectionIndicator';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';
import { enterAppFullscreen } from '../utils/fullscreen';

interface PlayerLoginPageProps {
  onBack: () => void;
}

export const PlayerLoginPage: React.FC<PlayerLoginPageProps> = ({ onBack }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your player username and password');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter a display name — this is what appears on the leaderboard');
      return;
    }

    // Full screen is only allowed in direct response to the player's click or key press,
    // so it is requested now, while this submit still is one: the login reply can arrive
    // too late under a sign-in rush. The arena then opens already full screen.
    void enterAppFullscreen();

    try {
      setIsLoading(true);
      setError(null);
      const res = await api.login(username.trim(), password, 'PLAYER', displayName.trim());
      login(res.token, res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] bg-tech-grid bg-radial-vignette flex flex-col justify-between p-4 md:p-8 select-none">
      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0D1322] border border-[#1F2E4A] hover:border-yellow-400 text-slate-300 hover:text-white font-mono-tech text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>PORTAL SELECTION</span>
        </button>
        <ConnectionIndicator />
      </header>

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto my-auto flex flex-col items-center py-6">
        <div className="mb-4">
          <RobotMascot mood="excited" size="md" />
        </div>

        <div className="w-full bg-[#0D1322] border-2 border-yellow-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_35px_rgba(255,214,0,0.2)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-400">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-2xl text-white tracking-wide">
                COMPETITOR LOGIN
              </h3>
              <span className="font-mono-tech text-xs text-yellow-400 uppercase font-semibold">
                ENTER THE QUIZ ARENA
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-mono-tech text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono-tech text-xs uppercase font-bold text-slate-300 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-yellow-400" />
                Player Login ID / Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. player01"
                className="w-full p-3.5 bg-[#070B14] border border-[#1F2E4A] focus:border-yellow-400 rounded-xl text-white font-mono-tech text-sm outline-none transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono-tech text-xs uppercase font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-yellow-400" />
                Player Access Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full p-3.5 bg-[#070B14] border border-[#1F2E4A] focus:border-yellow-400 rounded-xl text-white font-mono-tech text-sm outline-none transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono-tech text-xs uppercase font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Team name shown on the leaderboard..."
                maxLength={40}
                className="w-full p-3.5 bg-[#070B14] border border-[#1F2E4A] focus:border-yellow-400 rounded-xl text-white font-mono-tech text-sm outline-none transition-colors"
                required
              />
              <p className="font-mono-tech text-[11px] text-slate-500">
                This is the name competitors and the leaderboard will see. One account can
                be signed in on one machine at a time.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-display font-black text-base tracking-wider transition-all shadow-[0_0_20px_rgba(255,214,0,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'JOINING ARENA...' : 'ENTER LIVE QUIZ ARENA'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#1F2E4A] text-center">
            <p className="font-mono-tech text-[11px] text-slate-400">
              Use the username and password on the slip the event organisers gave your team.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center text-slate-500 font-mono-tech text-xs">
        STAY SHARP • THINK FAST • SPEED EARNS BONUS POINTS
      </footer>
    </div>
  );
};
