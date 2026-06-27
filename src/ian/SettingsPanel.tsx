import { X, Palette } from 'lucide-react';
import type { AccentColor } from './engine';
import { ACCENT_COLORS } from './engine';

interface Props {
  accent: AccentColor;
  onAccentChange: (color: AccentColor) => void;
  onClose: () => void;
}

export default function SettingsPanel({ accent, onAccentChange, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-panel border rounded-lg w-full max-w-sm mx-4 shadow-2xl"
        style={{ borderColor: ACCENT_COLORS[accent].main + '40' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <Palette size={18} style={{ color: ACCENT_COLORS[accent].main }} />
            <h2 className="font-display text-lg font-bold tracking-wider" style={{ color: ACCENT_COLORS[accent].main }}>
              SETTINGS
            </h2>
          </div>
          <button onClick={onClose} className="text-faint hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Accent color picker */}
        <div className="p-5">
          <div className="font-mono text-[10px] text-faint tracking-wider mb-3">ACCENT COLOR</div>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((key) => {
              const cfg = ACCENT_COLORS[key];
              const isActive = key === accent;
              return (
                <button
                  key={key}
                  onClick={() => onAccentChange(key)}
                  className="flex flex-col items-center gap-2 p-3 rounded border transition-all"
                  style={{
                    borderColor: isActive ? cfg.main : '#1c2740',
                    background: isActive ? cfg.main + '15' : 'transparent',
                    boxShadow: isActive ? `0 0 12px ${cfg.glow}` : 'none',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{
                      background: cfg.main,
                      boxShadow: `0 0 10px ${cfg.glow}`,
                    }}
                  />
                  <span className="font-mono text-[10px] tracking-wider" style={{ color: isActive ? cfg.main : '#94a3b8' }}>
                    {cfg.name.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-line">
            <div className="font-mono text-[10px] text-faint tracking-wider mb-2">PREVIEW</div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: ACCENT_COLORS[accent].main }} />
              <span className="font-mono text-sm" style={{ color: ACCENT_COLORS[accent].main, textShadow: `0 0 8px ${ACCENT_COLORS[accent].glow}` }}>
                IAN ONLINE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
