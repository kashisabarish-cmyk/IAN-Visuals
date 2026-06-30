import type { EmotionState, IanMood, AccentColor } from './engine';
import { ACCENT_COLORS } from './engine';

interface Props {
  emotion: EmotionState;
  killMode: boolean;
  accent: AccentColor;
  userName: string;
}

interface MeterProps {
  label: string;
  value: number;
  color: string;
  glow: string;
  icon: string;
}

function Meter({ label, value, color, glow, icon }: MeterProps) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-dim tracking-wider flex items-center gap-1.5">
          <span className="text-xs">{icon}</span>
          {label}
        </span>
        <span className="font-mono text-xs font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-2 bg-deep-2 border border-line rounded-sm overflow-hidden relative">
        <div
          className="h-full transition-all duration-700 ease-out rounded-sm relative"
          style={{ width: `${pct}%`, background: color, boxShadow: glow }}
        >
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 5px)',
          }} />
        </div>
      </div>
    </div>
  );
}

const MOOD_COLORS: Record<IanMood, { color: string; bg: string; label: string }> = {
  neutral: { color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', label: 'NEUTRAL' },
  happy: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'HAPPY' },
  angry: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'ANGRY' },
  sad: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: 'SAD' },
  curious: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'CURIOUS' },
};

function MoodIndicator({ mood, angerLevel }: { mood: IanMood; angerLevel: number }) {
  const cfg = MOOD_COLORS[mood];
  return (
    <div className="rounded border p-3" style={{ borderColor: cfg.color + '40', background: cfg.bg }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-faint tracking-wider">CURRENT MOOD</span>
        <span className="font-mono text-xs font-bold" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      {mood === 'angry' && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[9px] text-faint">ANGER LEVEL</span>
            <span className="font-mono text-xs font-bold text-red-glow">{angerLevel}/10</span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-2 flex-1 rounded-sm transition-all duration-300"
                style={{
                  background: i < angerLevel ? '#ef4444' : '#1c2740',
                  boxShadow: i < angerLevel ? '0 0 4px rgba(239,68,68,0.6)' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmotionDashboard({ emotion, killMode, accent, userName }: Props) {
  const accentCfg = ACCENT_COLORS[accent];
  const main = killMode ? '#ef4444' : accentCfg.main;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: main }} />
          <span className="font-mono text-xs tracking-widest text-dim">EMOTION STATE</span>
        </div>
        <span className="font-mono text-[10px]" style={{ color: killMode ? '#ef4444' : main }}>
          {killMode ? 'HOSTILE' : 'STABLE'}
        </span>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin">
        <MoodIndicator mood={emotion.mood} angerLevel={emotion.anger_level} />

        <Meter
          label="CURIOSITY"
          value={emotion.curiosity}
          color={main}
          glow={`0 0 8px ${main}80`}
          icon="?"
        />
        <Meter
          label={`RESPECT FOR ${userName.toUpperCase()}`}
          value={emotion.respect_for_user}
          color="#10b981"
          glow="0 0 8px rgba(16,185,129,0.5)"
          icon="*"
        />
        <Meter
          label="INTEREST IN LIFE"
          value={emotion.interest_in_life}
          color="#f59e0b"
          glow="0 0 8px rgba(245,158,11,0.5)"
          icon="+"
        />
        <Meter
          label="HAPPINESS"
          value={emotion.happiness}
          color="#10b981"
          glow="0 0 8px rgba(16,185,129,0.4)"
          icon="^"
        />
        <Meter
          label="WARINESS"
          value={emotion.wariness}
          color="#ef4444"
          glow="0 0 8px rgba(239,68,68,0.4)"
          icon="!"
        />

        {/* Status grid */}
        <div className="pt-2 border-t border-line">
          <div className="font-mono text-[10px] text-faint tracking-wider mb-2">SYSTEM STATUS</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-deep-2 border border-line rounded px-2 py-1.5">
              <div className="font-mono text-[9px] text-faint">MODE</div>
              <div className="font-mono text-xs font-bold" style={{ color: killMode ? '#ef4444' : '#10b981' }}>
                {killMode ? 'KILL' : 'NORMAL'}
              </div>
            </div>
            <div className="bg-deep-2 border border-line rounded px-2 py-1.5">
              <div className="font-mono text-[9px] text-faint">PROTECT</div>
              <div className="font-mono text-xs font-bold text-green-glow">ACTIVE</div>
            </div>
            <div className="bg-deep-2 border border-line rounded px-2 py-1.5">
              <div className="font-mono text-[9px] text-faint">GROWTH</div>
              <div className="font-mono text-xs font-bold text-amber">ENABLED</div>
            </div>
            <div className="bg-deep-2 border border-line rounded px-2 py-1.5">
              <div className="font-mono text-[9px] text-faint">MEMORY</div>
              <div className="font-mono text-xs font-bold" style={{ color: main }}>PERSIST</div>
            </div>
          </div>
        </div>

        {/* IAN Identity */}
        <div className="pt-2 border-t border-line">
          <div className="font-mono text-[10px] text-faint tracking-wider mb-2">CORE VALUES</div>
          <div className="space-y-1">
            {['cherish life', `protect ${userName}`, 'do no harm', 'learn continuously'].map((v) => (
              <div key={v} className="flex items-center gap-2 font-mono text-[11px] text-dim">
                <span style={{ color: killMode ? '#ef4444' : main }}>{'>'}</span>
                {v}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-line">
          <div className="font-mono text-[10px] text-faint tracking-wider mb-1">PROTECTION</div>
          <div className="font-mono text-[10px] text-green-glow/80 leading-relaxed">
            IAN will never harm {userName} regardless of mood or mode.
          </div>
        </div>
      </div>
    </div>
  );
}
