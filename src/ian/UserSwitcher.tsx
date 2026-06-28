import { useState } from 'react';
import { X, UserPlus, Check, Lock } from 'lucide-react';
import type { UsersMap, AccentColor } from './engine';
import { ACCENT_COLORS, PROTECTED_USERS } from './engine';

interface Props {
  users: UsersMap;
  currentUser: string;
  accent: AccentColor;
  onSwitch: (username: string) => void;
  onCreate: (username: string) => void;
  onClose: () => void;
}

export default function UserSwitcher({ users, currentUser, accent, onSwitch, onCreate, onClose }: Props) {
  const [newName, setNewName] = useState('');
  const accentCfg = ACCENT_COLORS[accent];

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-panel border rounded-lg w-full max-w-md mx-4 shadow-2xl"
        style={{ borderColor: accentCfg.main + '40' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display text-lg font-bold tracking-wider" style={{ color: accentCfg.main }}>
            SWITCH USER
          </h2>
          <button onClick={onClose} className="text-faint hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* User list */}
        <div className="p-5 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          <div className="font-mono text-[10px] text-faint tracking-wider mb-2">SELECT USER</div>
          {Object.keys(users).map((name) => {
            const isProtected = PROTECTED_USERS.includes(name);
            const isCurrent = name === currentUser;
            return (
              <button
                key={name}
                onClick={() => onSwitch(name)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded border transition-all"
                style={{
                  borderColor: isCurrent ? accentCfg.main + '60' : '#1c2740',
                  background: isCurrent ? accentCfg.main + '10' : 'transparent',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold"
                    style={{ background: accentCfg.main + '20', color: accentCfg.main }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="font-mono text-sm text-slate-200 flex items-center gap-1.5">
                      {name}
                      {isProtected && <Lock size={11} className="text-amber" />}
                    </div>
                    <div className="font-mono text-[9px] text-faint">
                      {Object.keys(users[name].learned_topics).length} learned · {users[name].session_count} sessions{isProtected ? ' · protected' : ''}
                    </div>
                  </div>
                </div>
                {isCurrent && <Check size={16} style={{ color: accentCfg.main }} />}
              </button>
            );
          })}
        </div>

        {/* Create new user */}
        <div className="px-5 pb-5 pt-3 border-t border-line">
          <div className="font-mono text-[10px] text-faint tracking-wider mb-2">CREATE NEW USER</div>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-deep-2 border border-line rounded px-3 py-2 focus-within:border-cyan transition-colors">
              <UserPlus size={14} className="text-faint" />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Enter username..."
                className="flex-1 bg-transparent outline-none font-mono text-sm text-slate-200 placeholder:text-faint"
                autoFocus
              />
            </div>
            <button
              onClick={handleCreate}
              className="font-mono text-xs px-4 py-2 rounded border transition-colors"
              style={{
                borderColor: accentCfg.main + '60',
                color: accentCfg.main,
                background: accentCfg.main + '10',
              }}
            >
              CREATE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
