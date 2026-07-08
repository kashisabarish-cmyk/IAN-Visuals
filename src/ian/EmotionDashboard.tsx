import { useEffect, useRef, useState } from 'react';
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
  index: number;
}

function AnimatedCounter({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef({ from: 0, to: 0, start: 0 });

  useEffect(() => {
    const target = Math.round(value * 100);
    startRef.current = { from: displayed, to: target, start: performance.now() };
    const animate = (now: number) => {
      const elapsed = now - startRef.current.start;
      const dur = 900;
      const t = Math.min(elapsed / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(startRef.current.from + (startRef.current.to - startRef.current.from) * ease);
      setDisplayed(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]); // eslint-disable-line

  return <>{displayed}</>;
}

function Meter({ label, value, color, glow, icon, index }: MeterProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * 80);
    return () => clearTimeout(t);
  }, [index]);

  const pct = Math.round(value * 100);

  return (
    <div className="space-y-1.5 animate-slide-right" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-dim tracking-wider flex items-center gap-1.5">
          <span className="text-xs">{icon}</span>
          {label}
        </span>
        <span className="font-mono text-xs font-bold tabular-nums" style={{ color, textShadow: `0 0 6px ${glow}` }}>
          <AnimatedCounter value={value} />%
        </span>
      </div>
      <div className="h-2 bg-deep-2 border border-line rounded-sm overflow-hidden relative">
        {/* shimmer on the fill */}
        <div
          className="h-full rounded-sm relative overflow-hidden transition-all ease-out"
          style={{
            width: mounted ? `${pct}%` : '0%',
            background: color,
            boxShadow: glow,
            transitionDuration: '900ms',
          }}
        >
          <div className="absolute inset-0 animate-shimmer" style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)`, backgroundSize: '200% auto' }} />
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 5px)' }} />
        </div>
        {/* Leading edge glow dot */}
        {mounted && pct > 2 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 rounded-full animate-pulse-glow"
            style={{ left: `calc(${pct}% - 1px)`, background: color, boxShadow: `0 0 6px ${glow}` }}
          />
        )}
      </div>
    </div>
  );
}

const MOOD_COLORS: Record<IanMood, { color: string; bg: string; label: string; pulse: string }> = {
  neutral: { color: '#22d3ee', bg: 'rgba(34,211,238,0.07)',  label: 'NEUTRAL',  pulse: 'rgba(34,211,238,0.15)' },
  happy:   { color: '#10b981', bg: 'rgba(16,185,129,0.07)',  label: 'HAPPY',    pulse: 'rgba(16,185,129,0.2)' },
  angry:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'ANGRY',    pulse: 'rgba(239,68,68,0.25)' },
  sad:     { color: '#818cf8', bg: 'rgba(129,140,248,0.07)', label: 'SAD',      pulse: 'rgba(129,140,248,0.15)' },
  curious: { color: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  label: 'CURIOUS',  pulse: 'rgba(245,158,11,0.2)' },
};

function MoodIndicator({ mood, angerLevel }: { mood: IanMood; angerLevel: number }) {
  const cfg = MOOD_COLORS[mood];
  const [auraSize, setAuraSize] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAuraSize(mood === 'angry' ? angerLevel * 4 : 8), 100);
    return () => clearTimeout(t);
  }, [mood, angerLevel]);

  return (
    <div
      className="rounded border p-3 relative overflow-hidden animate-scale-in"
      style={{ borderColor: cfg.color + '40', background: cfg.bg, transition: 'all 0.5s ease' }}
    >
      {/* Animated aura background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${cfg.pulse} 0%, transparent 70%)`,
          transform: `scale(${1 + auraSize * 0.02})`,
          transition: 'transform 0.8s ease, background 0.5s ease',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] text-faint tracking-wider">CURRENT MOOD</span>
          <span className={`font-mono text-xs font-bold ${mood === 'angry' ? 'animate-glitch' : ''}`} style={{ color: cfg.color, textShadow: `0 0 8px ${cfg.color}80` }}>
            {cfg.label}
          </span>
        </div>

        {/* Mood wave bars */}
        <div className="flex items-end gap-0.5 h-5 mb-1">
          {Array.from({ length: 20 }).map((_, i) => {
            const height = 20 + Math.sin(i * 0.8 + Date.now() * 0.001) * 15 + (mood === 'angry' ? Math.random() * 20 : 0);
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all"
                style={{
                  height: `${Math.max(10, Math.min(100, height))}%`,
                  background: cfg.color,
                  opacity: 0.3 + (i / 20) * 0.5,
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            );
          })}
        </div>

        {mood === 'angry' && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] text-faint">ANGER LEVEL</span>
              <span className={`font-mono text-xs font-bold text-red-glow ${angerLevel >= 7 ? 'animate-anger' : ''}`}>{angerLevel}/10</span>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 flex-1 rounded-sm transition-all duration-300"
                  style={{
                    background: i < angerLevel ? '#ef4444' : '#1c2740',
                    boxShadow: i < angerLevel ? (i >= 7 ? '0 0 8px rgba(239,68,68,0.9)' : '0 0 4px rgba(239,68,68,0.6)') : 'none',
                    animation: i < angerLevel && angerLevel >= 7 ? `anger-flicker ${0.4 + i * 0.05}s ease-in-out infinite` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmotionDashboard({ emotion, killMode, accent, userName }: Props) {
  const accentCfg = ACCENT_COLORS[accent];
  const main = killMode ? '#ef4444' : accentCfg.main;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-y-0 w-1/3 animate-shimmer" style={{ background: `linear-gradient(90deg, transparent, ${main}08, transparent)` }} />
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: main }} />
          <span className="font-mono text-xs tracking-widest text-dim">EMOTION STATE</span>
        </div>
        <span className={`font-mono text-[10px] relative z-10 ${killMode ? 'animate-anger' : 'animate-status-blink'}`} style={{ color: killMode ? '#ef4444' : '#10b981' }}>
          {killMode ? 'HOSTILE' : 'STABLE'}
        </span>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin">
        <MoodIndicator mood={emotion.mood} angerLevel={emotion.anger_level} />

        <Meter label="CURIOSITY"         value={emotion.curiosity}          color={main}      glow={`0 0 8px ${main}80`}                    icon="?" index={0} />
        <Meter label={`RESPECT FOR ${userName.toUpperCase()}`} value={emotion.respect_for_kashi}  color="#10b981"   glow="0 0 8px rgba(16,185,129,0.5)"            icon="★" index={1} />
        <Meter label="INTEREST IN LIFE"  value={emotion.interest_in_life}   color="#f59e0b"   glow="0 0 8px rgba(245,158,11,0.5)"            icon="◈" index={2} />
        <Meter label="HAPPINESS"         value={emotion.happiness}          color="#10b981"   glow="0 0 8px rgba(16,185,129,0.4)"            icon="▲" index={3} />
        <Meter label="WARINESS"          value={emotion.wariness}           color="#ef4444"   glow="0 0 8px rgba(239,68,68,0.4)"             icon="!" index={4} />

        {/* System status grid */}
        <div className="pt-2 border-t border-line">
          <div className="font-mono text-[10px] text-faint tracking-wider mb-2">SYSTEM STATUS</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'MODE',    value: killMode ? 'KILL' : 'NORMAL',  color: killMode ? '#ef4444' : '#10b981' },
              { label: 'PROTECT', value: 'ACTIVE',                      color: '#10b981' },
              { label: 'GROWTH',  value: 'ENABLED',                     color: '#f59e0b' },
              { label: 'MEMORY',  value: 'PERSIST',                     color: main },
            ].map((s, i) => (
              <div
                key={s.label}
                className="bg-deep-2 border border-line rounded px-2 py-1.5 animate-float-up hover:border-bright transition-all"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="font-mono text-[9px] text-faint">{s.label}</div>
                <div className={`font-mono text-xs font-bold ${s.label === 'MODE' && killMode ? 'animate-anger' : ''}`} style={{ color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Core values */}
        <div className="pt-2 border-t border-line">
          <div className="font-mono text-[10px] text-faint tracking-wider mb-2">CORE VALUES</div>
          <div className="space-y-1">
            {[`cherish life`, `protect ${userName}`, 'do no harm', 'learn continuously'].map((v, i) => (
              <div key={v} className="flex items-center gap-2 font-mono text-[11px] text-dim animate-slide-right" style={{ animationDelay: `${i * 0.06}s` }}>
                <span className="animate-pulse-glow" style={{ color: killMode ? '#ef4444' : main, animationDelay: `${i * 0.4}s` }}>{'>'}</span>
                {v}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-line">
          <div className="font-mono text-[10px] text-faint tracking-wider mb-1">PROTECTION</div>
          <div className="font-mono text-[10px] text-green-glow/80 leading-relaxed animate-fade-in">
            IAN will never harm {userName} regardless of mood or mode.
          </div>
        </div>
      </div>
    </div>
  );
}
