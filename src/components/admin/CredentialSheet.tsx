import React, { useState } from 'react';
import { KeyRound, Copy, Check, Download, Printer, AlertTriangle } from 'lucide-react';
import { IssuedCredential } from '../../types';

interface CredentialSheetProps {
  credentials: IssuedCredential[];
  onDone: () => void;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// Quoted, and a leading = + - @ neutralised: spreadsheets treat those as formulas.
function csvField(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Shows passwords the server has just generated. Only their hashes are stored, so this is
 * the one chance to copy, download or print them — the sheet says so.
 */
export const CredentialSheet: React.FC<CredentialSheetProps> = ({ credentials, onDone }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Tab-separated, so it pastes straight into a spreadsheet as columns.
    const rows = credentials.map((c) => `${c.username}\t${c.displayName}\t${c.password}`);
    await navigator.clipboard.writeText(['Username\tDisplay Name\tPassword', ...rows].join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const rows = credentials.map((c) => [c.username, c.displayName, c.password].map(csvField).join(','));
    const blob = new Blob([['Username,Display Name,Password', ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gadget_code_player_passwords_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // One slip per team, to cut out and hand over at the lab machines.
  const handlePrint = () => {
    const slips = credentials
      .map(
        (c) => `<div class="slip">
          <div class="label">GADGET CODE — Player sign-in</div>
          <div class="row"><span>Username</span><strong>${escapeHtml(c.username)}</strong></div>
          <div class="row"><span>Password</span><strong class="mono">${escapeHtml(c.password)}</strong></div>
          <div class="url">${escapeHtml(window.location.origin)}</div>
        </div>`
      )
      .join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Player passwords</title><style>
      body { font-family: system-ui, sans-serif; margin: 16px; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .slip { border: 1px dashed #333; border-radius: 6px; padding: 10px 12px; break-inside: avoid; }
      .label { font-size: 11px; color: #555; margin-bottom: 6px; }
      .row { display: flex; justify-content: space-between; font-size: 14px; margin: 3px 0; }
      .row span { color: #555; }
      .mono { font-family: ui-monospace, monospace; font-size: 16px; letter-spacing: 1px; }
      .url { font-size: 11px; color: #777; margin-top: 6px; }
    </style></head><body><div class="grid">${slips}</div></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/40 text-yellow-200 text-xs font-medium flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-400" />
        <span>
          These passwords are shown only now — the server keeps nothing it could show again. Copy, download or
          print them before closing. Each team gets its own; hand them out individually.
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-xl border border-[#1F2E4A]">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 bg-[#111A2B]">
            <tr className="text-[11px] font-mono-tech uppercase font-bold text-slate-400 tracking-wider">
              <th className="py-2 px-3">Username</th>
              <th className="py-2 px-3">Display Name</th>
              <th className="py-2 px-3">Password</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#162136]">
            {credentials.map((c) => (
              <tr key={c.playerId}>
                <td className="py-1.5 px-3 font-mono-tech font-bold text-white">{c.username}</td>
                <td className="py-1.5 px-3 text-slate-300">{c.displayName}</td>
                <td className="py-1.5 px-3 font-mono-tech font-bold text-yellow-300 tracking-wider select-all">
                  {c.password}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono-tech text-xs font-bold"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'COPIED' : 'COPY TABLE'}</span>
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono-tech text-xs font-bold"
        >
          <Download className="w-4 h-4" />
          <span>DOWNLOAD CSV</span>
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono-tech text-xs font-bold"
        >
          <Printer className="w-4 h-4" />
          <span>PRINT SLIPS</span>
        </button>
        <button
          type="button"
          onClick={onDone}
          className="ml-auto flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm"
        >
          <KeyRound className="w-4 h-4" />
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};
