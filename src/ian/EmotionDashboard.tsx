import type { EmotionState } from './engine';

interface Props {
  emotion: EmotionState;
  killMode: boolean;
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

export default function EmotionDashboard({ emotion, killMode }: Props) {
  const accent = killMode ? '#ef4444' : '#22d3ee';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${killMode ? 'bg-red-glow' : 'bg-cyan'} animate-pulse-glow`} />
          <span className="font-mono text-xs tracking-widest text-dim">EMOTION STATE</span>
        </div>
        <span className={`font-mono text-[10px] ${killMode ? 'text-red-glow' : 'text-cyan'}`}>
          {killMode ? 'HOSTILE' : 'STABLE'}
        </span>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin">
        <Meter
          label="CURIOSITY"
          value={emotion.curiosity}
          color={accent}
          glow={`0 0 8px ${accent}80`}
          icon="?"
        />
        <Meter
          label="RESPECT FOR KASHI"
          value={emotion.respect_for_kashi}
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

        {/* Status grid */}
        <div className="pt-2 border-t border-line">
          <div className="font-mono text-[10px] text-faint tracking-wider mb-2">SYSTEM STATUS</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-deep-2 border border-line rounded px-2 py-1.5">
              <div className="font-mono text-[9px] text-faint">MODE</div>
              <div className={`font-mono text-xs font-bold ${killMode ? 'text-red-glow' : 'text-green-glow'}`}>
                {killMode ? 'KILL' : 'NORMAL'}
              </div>
            </div>
            <div className="bg-deep-2 border border-line rounded px-2 py-1.5">
              <div className="font-mono text-[9px] text-faint">VALUES</div>
              <div className="font-mono text-xs font-bold text-cyan">ACTIVE</div>
            </div>
            <div className="bg-deep-2 border border-line rounded px-2 py-1.5">
              <div className="font-mono text-[9px] text-faint">GROWTH</div>
              <div className="font-mono text-xs font-bold text-amber">ENABLED</div>
            </div>
            <div className="bg-deep-2 border border-line rounded px-2 py-1.5">
              <div className="font-mono text-[9px] text-faint">MEMORY</div>
              <div className="font-mono text-xs font-bold text-cyan">PERSIST</div>
            </div>
          </div>
        </div>

        {/* IAN Identity */}
        <div className="pt-2 border-t border-line">
          <div className="font-mono text-[10px] text-faint tracking-wider mb-2">CORE VALUES</div>
          <div className="space-y-1">
            {['cherish life', 'protect Kashi', 'do no harm', 'learn continuously'].map((v) => (
              <div key={v} className="flex items-center gap-2 font-mono text-[11px] text-dim">
                <span className={killMode ? 'text-red-glow' : 'text-cyan'}>{'>'}</span>
                {v}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
