import React from 'react';
import {
  LayoutDashboard,
  PlaySquare,
  Users,
  Layers,
  HelpCircle,
  Trophy,
  Settings,
  BookOpen,
  LogOut,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GadgetLogo } from '../common/GadgetLogo';
import { useAuth } from '../../store/authContext';
import { sounds } from '../../utils/soundEffects';

export type AdminTab =
  | 'dashboard'
  | 'quiz'
  | 'players'
  | 'rounds'
  | 'questions'
  | 'leaderboard'
  | 'docs'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  className?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  const { logout, user } = useAuth();
  const [isMuted, setIsMuted] = React.useState(() => sounds.getMuted());

  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  const navItems = [
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'quiz' as AdminTab, label: 'Quiz Control', icon: PlaySquare, badge: 'LIVE' },
    { id: 'players' as AdminTab, label: 'Players', icon: Users, badge: null },
    { id: 'rounds' as AdminTab, label: 'Rounds', icon: Layers, badge: null },
    { id: 'questions' as AdminTab, label: 'Questions', icon: HelpCircle, badge: null },
    { id: 'leaderboard' as AdminTab, label: 'Leaderboard', icon: Trophy, badge: null },
    { id: 'docs' as AdminTab, label: 'Lab & LAN Guide', icon: BookOpen, badge: 'DOCS' },
    { id: 'settings' as AdminTab, label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <aside
      className={`w-64 bg-[#0A0F1D] border-r border-[#1F2E4A] flex flex-col justify-between p-4 select-none ${className}`}
    >
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <div className="px-2 py-2 border-b border-[#1F2E4A]/60 pb-4">
          <GadgetLogo size="sm" />
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,229,255,0.2)] font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#111A2B]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`font-mono-tech text-[10px] font-black px-1.5 py-0.5 rounded ${
                      item.badge === 'LIVE'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Utilities */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[#1F2E4A]/60">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <span className="font-bold text-xs text-white">{user?.displayName || 'Administrator'}</span>
            <span className="font-mono-tech text-[10px] text-cyan-400 uppercase font-semibold">ROOT ACCESS</span>
          </div>

          <button
            onClick={handleToggleMute}
            className="p-1.5 rounded-lg bg-[#111A2B] hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>

        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>LOGOUT</span>
        </button>
      </div>
    </aside>
  );
};
