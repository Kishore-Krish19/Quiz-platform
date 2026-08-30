import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getBorderColor = () => {
    switch (variant) {
      case 'danger':
        return 'border-red-500/60 shadow-[0_0_30px_rgba(255,61,87,0.3)]';
      case 'warning':
        return 'border-yellow-500/60 shadow-[0_0_30px_rgba(255,214,0,0.3)]';
      case 'info':
      default:
        return 'border-cyan-500/60 shadow-[0_0_30px_rgba(0,229,255,0.3)]';
    }
  };

  const getConfirmBtnStyle = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(255,61,87,0.4)]';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600 text-black shadow-[0_0_15px_rgba(255,214,0,0.4)]';
      case 'info':
      default:
        return 'bg-cyan-500 hover:bg-cyan-600 text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-md bg-[#0D1322] border-2 ${getBorderColor()} rounded-2xl p-6 relative overflow-hidden`}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2.5 rounded-xl ${
              variant === 'danger'
                ? 'bg-red-500/20 text-red-400'
                : variant === 'warning'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-cyan-500/20 text-cyan-400'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-xl text-white tracking-wide">{title}</h3>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed mb-6 font-medium">{message}</p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all border border-slate-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl font-bold text-sm tracking-wide transition-all ${getConfirmBtnStyle()}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
