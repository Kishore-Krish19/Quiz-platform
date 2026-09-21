import React, { useState } from 'react';
import {
  Settings,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Play,
  CheckCircle2,
  Cpu,
  KeyRound,
} from 'lucide-react';
import { sounds } from '../../utils/soundEffects';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useSocket } from '../../store/socketContext';
import { useAuth } from '../../store/authContext';
import { api } from '../../services/api';

const MIN_ADMIN_PASSWORD_LENGTH = 10;

const AdminAccountCard: React.FC = () => {
  const { user, login } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
      setError(`The new password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new password and its confirmation do not match.');
      return;
    }
    try {
      setIsSaving(true);
      const res = await api.changeAdminPassword(currentPassword, newPassword);
      // The old token is now void everywhere; carry on with the one issued for this screen.
      login(res.token, res.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to change the password');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'p-3 bg-[#070B14] border border-[#1F2E4A] focus:border-cyan-400 rounded-xl text-white text-sm outline-none font-mono-tech';

  return (
    <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-3xl p-6 md:p-8 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
          <KeyRound className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-display font-bold text-xl text-white">Admin Account</h3>
          <span className="font-mono-tech text-xs text-slate-400">
            Signed in as @{user?.username}. Changing the password signs out every other admin screen.
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-mono-tech text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono-tech flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Password changed. Other admin screens must sign in again with the new password.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder={`New password (${MIN_ADMIN_PASSWORD_LENGTH}+ chars)`}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
          required
        />
        <p className="sm:col-span-2 text-[11px] text-slate-500 font-medium leading-relaxed self-center">
          Forgotten it? Put a new value in ADMIN_PASSWORD in .env and restart the server — a changed value
          resets the "admin" account's password.
        </p>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-display font-black text-xs tracking-wide disabled:opacity-50"
        >
          {isSaving ? 'SAVING...' : 'CHANGE PASSWORD'}
        </button>
      </form>
    </div>
  );
};

export const AdminSettingsPage: React.FC = () => {
  const { quizState, resetRound } = useSocket();
  const [isMuted, setIsMuted] = useState(() => sounds.getMuted());
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const toggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  const handleTestSound = (type: 'beep' | 'tick' | 'correct' | 'incorrect' | 'victory' | 'start') => {
    switch (type) {
      case 'beep':
        sounds.playTimerBeep(true);
        break;
      case 'tick':
        sounds.playTimerTick();
        break;
      case 'correct':
        sounds.playAnswerResult(true);
        break;
      case 'incorrect':
        sounds.playAnswerResult(false);
        break;
      case 'victory':
        sounds.playVictoryFanfare();
        break;
      case 'start':
        sounds.playRoundStart();
        break;
    }
  };

  const handleResetCurrentRound = () => {
    if (quizState?.activeRoundId) {
      resetRound(quizState.activeRoundId);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-wide flex items-center gap-2">
          <Settings className="w-7 h-7 text-cyan-400" />
          System Settings & Sound Diagnostics
        </h1>
        <p className="font-mono-tech text-xs text-slate-400">
          Change the admin password, configure client sound synthesis, test audio cues, and manage global reset states.
        </p>
      </div>

      <AdminAccountCard />

      {/* Sound Settings Card */}
      <div className="bg-[#0D1322] border border-[#1F2E4A] rounded-3xl p-6 md:p-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-white">Arcade Sound Engine</h3>
              <span className="font-mono-tech text-xs text-slate-400">
                Web Audio API synthesizer (Zero audio downloads)
              </span>
            </div>
          </div>

          <button
            onClick={toggleMute}
            className={`px-4 py-2 rounded-xl font-mono-tech text-xs font-bold transition-all border ${
              isMuted
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
            }`}
          >
            {isMuted ? 'SOUND: MUTED' : 'SOUND: ENABLED'}
          </button>
        </div>

        {/* Audio Test Pad */}
        <div className="pt-4 border-t border-[#1F2E4A]">
          <span className="font-mono-tech text-xs uppercase font-bold text-slate-400 block mb-3">
            Test Sound FX Synthesizer:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleTestSound('start')}
              className="p-3 rounded-xl bg-[#111A2B] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-[#1F2E4A] font-mono-tech text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Round Start</span>
            </button>

            <button
              onClick={() => handleTestSound('beep')}
              className="p-3 rounded-xl bg-[#111A2B] hover:bg-yellow-500/20 text-slate-300 hover:text-yellow-300 border border-[#1F2E4A] font-mono-tech text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Timer Critical Beep</span>
            </button>

            <button
              onClick={() => handleTestSound('correct')}
              className="p-3 rounded-xl bg-[#111A2B] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-[#1F2E4A] font-mono-tech text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Correct Chime</span>
            </button>

            <button
              onClick={() => handleTestSound('incorrect')}
              className="p-3 rounded-xl bg-[#111A2B] hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-[#1F2E4A] font-mono-tech text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Incorrect Buzzer</span>
            </button>

            <button
              onClick={() => handleTestSound('victory')}
              className="p-3 rounded-xl bg-[#111A2B] hover:bg-yellow-500/20 text-slate-300 hover:text-yellow-300 border border-[#1F2E4A] font-mono-tech text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Victory Fanfare</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset Round Data */}
      <div className="bg-[#0D1322] border-2 border-red-500/30 rounded-3xl p-6 md:p-8 flex flex-col gap-4">
        <div className="flex items-center gap-3 text-red-400">
          <ShieldAlert className="w-6 h-6" />
          <h3 className="font-display font-bold text-xl text-white">Danger Zone</h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed font-medium">
          Resetting current round progress clears all submitted player answer logs and returns the authoritative state machine to WAITING state.
        </p>

        {resetSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono-tech flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Active round progress has been successfully reset!</span>
          </div>
        )}

        <button
          onClick={() => setIsResetConfirmOpen(true)}
          className="self-start px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-mono-tech text-xs font-bold transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>RESET ACTIVE ROUND PROGRESS</span>
        </button>
      </div>

      {/* Reset Confirm Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Reset Active Round Progress?"
        message="Are you sure you want to wipe all player scores for this round? This cannot be undone."
        confirmLabel="RESET SCORES"
        variant="danger"
        onConfirm={handleResetCurrentRound}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
