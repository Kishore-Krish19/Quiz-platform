import React from 'react';
import { BookOpen, Terminal, Network, Shield, Cpu, Database, CheckCircle2 } from 'lucide-react';

export const AdminDocPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-wide flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-purple-400" />
          Computer Lab, LAN & MongoDB Deployment Guide
        </h1>
        <p className="font-mono-tech text-xs text-slate-400">
          Step-by-step instructions for hosting GADGET CODE in college laboratories and competition arenas with local MongoDB.
        </p>
      </div>

      {/* Guide Card 1: MongoDB Database Configuration */}
      <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-3xl p-6 md:p-8 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-white">
              1. Local MongoDB Setup (Required for Competition)
            </h3>
            <span className="font-mono-tech text-xs text-slate-400">
              MongoDB + Mongoose is the primary database for player accounts, questions, answers, and scores.
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed font-medium">
          When running on the competition host server, ensure MongoDB is installed and running. Set your database connection in <code className="text-cyan-400 bg-[#070B14] px-2 py-0.5 rounded border border-[#1F2E4A]">.env</code>:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="p-4 rounded-xl bg-[#070B14] border border-[#1F2E4A] flex flex-col gap-2">
            <span className="font-mono-tech text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              Start Local MongoDB Service
            </span>
            <pre className="text-xs text-slate-300 font-mono-tech bg-slate-900 p-2.5 rounded overflow-x-auto">
              # Windows / Linux / macOS{'\n'}
              mongod --dbpath ./data/db{'\n'}
              # Or with Docker:{'\n'}
              docker run -d -p 27017:27017 --name mongodb mongo:latest
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-[#070B14] border border-[#1F2E4A] flex flex-col gap-2">
            <span className="font-mono-tech text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              Environment Variables (.env)
            </span>
            <pre className="text-xs text-slate-300 font-mono-tech bg-slate-900 p-2.5 rounded overflow-x-auto">
              PORT=3000{'\n'}
              MONGODB_URI=mongodb://127.0.0.1:27017/gadget_code{'\n'}
              NODE_ENV=production{'\n'}
              {'\n'}
              # production serves the built app, so build first:{'\n'}
              npm run build{'\n'}
              npm start
            </pre>
          </div>
        </div>
      </div>

      {/* Guide Card 2: LAN Host IP Setup */}
      <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-3xl p-6 md:p-8 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-white">
              2. Host Server LAN IP Configuration
            </h3>
            <span className="font-mono-tech text-xs text-slate-400">
              Run the server on the organizer/coordinator computer
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed font-medium">
          The GADGET CODE server binds to <code className="text-cyan-400 bg-[#070B14] px-2 py-0.5 rounded border border-[#1F2E4A]">0.0.0.0:3000</code>. Competitor computers on the same local subnet (Ethernet switch or Wi-Fi router) connect directly via the host's IP address.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="p-4 rounded-xl bg-[#070B14] border border-[#1F2E4A] flex flex-col gap-2">
            <span className="font-mono-tech text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              Windows (Command Prompt / PowerShell)
            </span>
            <pre className="text-xs text-slate-300 font-mono-tech bg-slate-900 p-2.5 rounded overflow-x-auto">
              ipconfig
            </pre>
            <span className="text-[11px] text-slate-400">
              Locate <strong>IPv4 Address</strong> (e.g. <span className="text-yellow-400 font-bold">192.168.1.50</span>)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#070B14] border border-[#1F2E4A] flex flex-col gap-2">
            <span className="font-mono-tech text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              Linux / macOS (Terminal)
            </span>
            <pre className="text-xs text-slate-300 font-mono-tech bg-slate-900 p-2.5 rounded overflow-x-auto">
              hostname -I  # or: ip a
            </pre>
            <span className="text-[11px] text-slate-400">
              Locate the LAN IP on eth0 or wlan0.
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-200 text-xs font-mono-tech">
          🌐 <strong>Competitor URL to distribute in lab:</strong> <span className="text-yellow-300 font-bold">http://192.168.x.x:3000</span>
        </div>
      </div>

      {/* Guide Card 3: 40+ Competitor Lab PC Provisioning */}
      <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-3xl p-6 md:p-8 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-white">
              3. Fast 40+ Competitor Account Provisioning
            </h3>
            <span className="font-mono-tech text-xs text-slate-400">
              Bulk generator writes directly to MongoDB for persistent competition rosters
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-slate-300">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Navigate to <strong>Players</strong> tab in this Admin Console.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Click <strong>+ ADD / BULK GENERATE</strong> and select <strong>Bulk Generator</strong>.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Set Count to 40 and Prefix to <code>player</code>. Each account gets its own generated password — print the slips from the sheet that appears (it is shown only once; <strong>ISSUE NEW PASSWORDS</strong> makes a fresh one).</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Assign PC #01 to login with <code>player01</code>, PC #02 with <code>player02</code>, etc.</span>
          </div>
        </div>
      </div>

      {/* Guide Card 4: Offline Audio & Zero External Dependencies */}
      <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-3xl p-6 md:p-8 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-white">
              4. Offline LAN & Real-Time Sync Architecture
            </h3>
            <span className="font-mono-tech text-xs text-slate-400">
              Self-contained without internet access requirement
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          The entire arcade sound system uses native <strong>Web Audio API oscillators</strong> synthesized in real time on each browser client. No MP3 audio files or internet CDNs are needed. Socket.IO keeps all 40+ competitor screens in exact millisecond lockstep with authoritative server clock validation.
        </p>
      </div>
    </div>
  );
};
