import React from 'react';
import { ShieldCheck, Gamepad2, Sparkles, Terminal, ArrowRight } from 'lucide-react';
import { GadgetLogo } from '../components/common/GadgetLogo';
import { RobotMascot } from '../components/common/RobotMascot';
import { ConnectionIndicator } from '../components/common/ConnectionIndicator';

interface LandingPageProps {
  onSelectRole: (role: 'admin' | 'player') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-[#070B14] bg-tech-grid bg-radial-vignette flex flex-col justify-between p-4 md:p-8 select-none">
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <GadgetLogo size="md" />
        <ConnectionIndicator />
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl w-full mx-auto my-auto flex flex-col items-center text-center py-8">
        {/* Robot Mascot Hero */}
        <div className="mb-6 relative">
          <RobotMascot mood="excited" size="lg" />
        </div>

        {/* Competition Title */}
        <h1 className="font-display font-black text-4xl md:text-6xl text-white tracking-wider mb-3 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
          READY. THINK. <span className="text-cyan-400 text-glow-cyan">ANSWER.</span> <span className="text-yellow-400 text-glow-yellow">WIN.</span>
        </h1>

        <p className="font-mono-tech text-sm md:text-base text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Authoritative real-time technical quiz competition platform built for computer lab LANs and speed-critical hackathons.
        </p>

        {/* Dual Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Player Portal Card */}
          <button
            onClick={() => onSelectRole('player')}
            className="group relative bg-[#0D1322] hover:bg-[#111A2B] border-2 border-yellow-500/40 hover:border-yellow-400 rounded-3xl p-6 md:p-8 flex flex-col items-center text-center transition-all duration-300 shadow-[0_0_25px_rgba(255,214,0,0.15)] hover:shadow-[0_0_35px_rgba(255,214,0,0.35)] hover:-translate-y-1 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/15 border border-yellow-500/40 flex items-center justify-center text-yellow-400 mb-4 group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-8 h-8" />
            </div>

            <span className="font-mono-tech text-xs uppercase font-bold text-yellow-400 tracking-widest mb-1">
              COMPETITOR ARENA
            </span>
            <h2 className="font-display font-black text-2xl text-white tracking-wide mb-2">
              PLAYER LOGIN
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Enter your assigned player credentials to join the synchronized live quiz arena.
            </p>

            <div className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-display font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,214,0,0.4)]">
              <span>ENTER ARENA</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Admin Portal Card */}
          <button
            onClick={() => onSelectRole('admin')}
            className="group relative bg-[#0D1322] hover:bg-[#111A2B] border-2 border-cyan-500/40 hover:border-cyan-400 rounded-3xl p-6 md:p-8 flex flex-col items-center text-center transition-all duration-300 shadow-[0_0_25px_rgba(0,229,255,0.15)] hover:shadow-[0_0_35px_rgba(0,229,255,0.35)] hover:-translate-y-1 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <span className="font-mono-tech text-xs uppercase font-bold text-cyan-400 tracking-widest mb-1">
              COMMAND CENTER
            </span>
            <h2 className="font-display font-black text-2xl text-white tracking-wide mb-2">
              ADMIN CONTROL
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Manage rounds, broadcast questions, trigger timers, and export live competition leaderboards.
            </p>

            <div className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.4)]">
              <span>ACCESS CONSOLE</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 font-mono-tech text-xs pt-4 border-t border-[#1F2E4A]/50">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Local LAN Ethernet & Lab Ready • Authoritative Server Timers</span>
        </div>
        <div>
          <span>GADGET CODE © 2026</span>
        </div>
      </footer>
    </div>
  );
};
