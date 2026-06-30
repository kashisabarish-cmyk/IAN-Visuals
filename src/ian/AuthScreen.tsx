import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AccentColor } from './engine';
import { ACCENT_COLORS } from './engine';

interface Props {
  accent: AccentColor;
  onAuthed: () => void;
}

export default function AuthScreen({ accent, onAuthed }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const accentCfg = ACCENT_COLORS[accent];
  const main = accentCfg.main;
  const glow = accentCfg.glow;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          const name = displayName.trim() || email.split('@')[0];
          await supabase.from('ian_profiles').upsert({
            user_id: data.user.id,
            display_name: name,
          });
        }
        onAuthed();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        onAuthed();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-0 scanline" />

      {/* Corner brackets */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 opacity-60" style={{ borderColor: main }} />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 opacity-60" style={{ borderColor: main }} />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 opacity-60" style={{ borderColor: main }} />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 opacity-60" style={{ borderColor: main }} />

      <div className="relative z-10 w-full max-w-md px-8">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="font-display text-5xl font-black tracking-[0.3em] animate-flicker" style={{ color: main, textShadow: `0 0 20px ${glow}` }}>
            IAN
          </div>
          <div className="font-mono text-xs text-dim tracking-[0.4em] mt-2">
            INTELLIGENT AUTONOMOUS NETWORK
          </div>
        </div>

        {/* Auth card */}
        <div className="bg-panel border rounded-lg shadow-2xl" style={{ borderColor: main + '40' }}>
          {/* Tabs */}
          <div className="flex border-b border-line">
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className="flex-1 font-mono text-xs py-3 tracking-wider transition-colors"
              style={{
                color: mode === 'signin' ? main : '#475569',
                borderBottom: mode === 'signin' ? `2px solid ${main}` : 'none',
              }}
            >
              SIGN IN
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className="flex-1 font-mono text-xs py-3 tracking-wider transition-colors"
              style={{
                color: mode === 'signup' ? main : '#475569',
                borderBottom: mode === 'signup' ? `2px solid ${main}` : 'none',
              }}
            >
              SIGN UP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="font-mono text-[10px] text-faint tracking-wider block mb-1.5">DISPLAY NAME</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should IAN address you?"
                  className="w-full bg-deep-2 border border-line rounded px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-bright transition-colors placeholder:text-faint"
                />
              </div>
            )}

            <div>
              <label className="font-mono text-[10px] text-faint tracking-wider block mb-1.5">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full bg-deep-2 border border-line rounded px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-bright transition-colors placeholder:text-faint"
                autoFocus
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-faint tracking-wider block mb-1.5">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-deep-2 border border-line rounded px-3 py-2.5 font-mono text-sm text-slate-200 outline-none focus:border-bright transition-colors placeholder:text-faint"
              />
            </div>

            {error && (
              <div className="font-mono text-xs text-red-glow border border-red-glow/30 bg-red-glow/5 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full font-mono text-sm py-2.5 rounded border transition-all disabled:opacity-50"
              style={{
                borderColor: main + '60',
                color: main,
                background: main + '10',
                boxShadow: loading ? 'none' : `0 0 12px ${glow}`,
              }}
            >
              {loading ? 'AUTHENTICATING...' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 font-mono text-[10px] text-faint tracking-wider">
          {mode === 'signin' ? 'New to IAN? Click SIGN UP to create an account.' : 'Already have an account? Click SIGN IN.'}
        </div>
      </div>
    </div>
  );
}
