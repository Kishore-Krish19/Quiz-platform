import React, { useState } from 'react';
import { ShieldCheck, Lock, User as UserIcon, ArrowLeft } from 'lucide-react';
import { GadgetLogo } from '../components/common/GadgetLogo';
import { RobotMascot } from '../components/common/RobotMascot';
import { ConnectionIndicator } from '../components/common/ConnectionIndicator';
import { api } from '../services/api';
import { useAuth } from '../store/authContext';

interface AdminLoginPageProps {
  onBack: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onBack }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide admin username and password');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await api.login(username.trim(), password, 'ADMIN');
      login(res.token, res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] bg-tech-grid bg-radial-vignette flex flex-col justify-between p-4 md:p-8 select-none">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0D1322] border border-[#1F2E4A] hover:border-cyan-400 text-slate-300 hover:text-white font-mono-tech text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>PORTAL SELECTION</span>
        </button>
        <ConnectionIndicator />
      </header>

      {/* Main Content Layout */}
      <main className="max-w-5xl w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-6">
        {/* Left Branding & Mascot */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-4">
          <GadgetLogo size="lg" />
          <div className="my-2">
            <RobotMascot mood="neutral" size="lg" />
          </div>
          <h2 className="font-display font-black text-3xl md:text-4xl text-white tracking-wide">
            CONTROL THE <span className="text-cyan-400 text-glow-cyan">COMPETITION.</span>
          </h2>
          <p className="font-mono-tech text-slate-400 text-sm max-w-md leading-relaxed">
            Centralized administrator console for activating questions, syncing sub-second timers, scoring, and exporting rankings.
          </p>
        </div>

        {/* Right Login Card */}
        <div className="bg-[#0D1322] border-2 border-cyan-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_30px_rgba(0,229,255,0.2)] relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-2xl text-white tracking-wide">
                ADMIN CONSOLE LOGIN
              </h3>
              <span className="font-mono-tech text-xs text-cyan-400 uppercase font-semibold">
                ROOT / ORGANIZER ACCESS
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
                <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                Administrator Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full p-3.5 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white font-mono-tech text-sm outline-none transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-mono-tech text-xs uppercase font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  Admin Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="font-mono-tech text-[11px] text-slate-400 hover:text-cyan-400"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full p-3.5 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white font-mono-tech text-sm outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black text-base tracking-wider transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'AUTHENTICATING...' : 'ENTER COMMAND CENTER'}
            </button>
          </form>
        </div>
      </main>

      <footer className="text-center text-slate-500 font-mono-tech text-xs">
        GADGET CODE QUIZ SYSTEM • AUTHORITATIVE LAN BACKEND
      </footer>
    </div>
  );
};
