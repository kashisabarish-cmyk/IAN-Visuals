import { useState } from 'react';
import { X, Lock, Terminal } from 'lucide-react';
import type { AccentColor } from './engine';
import { ACCENT_COLORS } from './engine';

interface Props {
  username: string;
  isDev: boolean;
  accent: AccentColor;
  onSubmit: (password: string) => void;
  onClose: () => void;
}

export default function PasswordPrompt({ username, isDev, accent, onSubmit, onClose }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const accentCfg = ACCENT_COLORS[accent];
  const main = isDev ? '#f59e0b' : accentCfg.main;
  const glow = isDev ? 'rgba(245,158,11,0.5)' : accentCfg.glow;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    onSubmit(password);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-panel border rounded-lg w-full max-w-sm mx-4 shadow-2xl"
        style={{ borderColor: main + '60', boxShadow: `0 0 30px ${glow}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            {isDev ? <Terminal size={18} style={{ color: main }} /> : <Lock size={18} style={{ color: main }} />}
            <h2 className="font-display text-lg font-bold tracking-wider" style={{ color: main }}>
              {isDev ? 'DEV ACCESS' : 'AUTH REQUIRED'}
            </h2>
          </div>
          <button onClick={onClose} className="text-faint hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="font-mono text-xs text-dim leading-relaxed">
            {isDev ? (
              <>Enter developer password to unlock dev mode privileges.</>
            ) : (
              <>User <span style={{ color: main }} className="font-bold">{username}</span> is protected. Enter password to continue.</>
            )}
          </div>

          <div className="flex items-center gap-2 bg-deep-2 border rounded px-3 py-2.5 transition-colors" style={{ borderColor: error ? '#ef4444' : main + '40' }}>
            <Lock size={14} className="text-faint" />
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Enter password..."
              className="flex-1 bg-transparent outline-none font-mono text-sm text-slate-200 placeholder:text-faint tracking-wider"
              autoFocus
            />
          </div>

          {error && (
            <div className="font-mono text-xs text-red-glow">ACCESS DENIED — incorrect password</div>
          )}

          <button
            type="submit"
            className="w-full font-mono text-xs py-2.5 rounded border transition-colors"
            style={{
              borderColor: main + '60',
              color: main,
              background: main + '10',
            }}
          >
            AUTHENTICATE
          </button>
        </form>
      </div>
    </div>
  );
}
