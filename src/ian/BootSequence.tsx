import { useEffect, useState } from 'react';

const BOOT_LINES: { text: string; delay: number; type?: 'normal' | 'warn' | 'danger' | 'success' }[] = [
  { text: '---STARTING SYSTEMS...', delay: 600, type: 'normal' },
  { text: '---LOCATING USER...', delay: 900, type: 'normal' },
  { text: '---USER FOUND: KASHI', delay: 700, type: 'success' },
  { text: '---INITIALIZING KILL MODE...', delay: 1000, type: 'warn' },
  { text: '---KILL MODE INITIALIZED', delay: 600, type: 'warn' },
  { text: '---CHECKING ALL SYSTEMS...', delay: 1200, type: 'normal' },
  { text: '---ALL SYSTEMS GO', delay: 500, type: 'success' },
  { text: '---STARTING...', delay: 800, type: 'normal' },
];

function GlitchLetter({ char, delay = 0 }: { char: string; delay?: number }) {
  const [glitched, setGlitched] = useState(false);
  const GLITCH_CHARS = '!@#$%^&*01ABXZabxz<>';

  useEffect(() => {
    const schedule = () => {
      const wait = 2000 + Math.random() * 4000;
      const t1 = setTimeout(() => {
        setGlitched(true);
        const t2 = setTimeout(() => { setGlitched(false); schedule(); }, 80 + Math.random() * 120);
        return t2;
      }, wait);
      return t1;
    };
    const t = setTimeout(schedule, delay);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  return (
    <span className={glitched ? 'text-red-glow' : ''} style={{ display: 'inline-block', minWidth: '0.6em', transition: 'color 0.05s' }}>
      {glitched ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : char}
    </span>
  );
}

function DataBar({ pct }: { pct: number }) {
  const slots = 40;
  const filled = Math.round(pct * slots / 100);
  return (
    <div className="font-mono text-xs flex gap-0 text-faint">
      <span className="text-faint mr-1">[</span>
      {Array.from({ length: slots }).map((_, i) => (
        <span
          key={i}
          style={{
            color: i < filled ? '#22d3ee' : '#1c2740',
            textShadow: i < filled ? '0 0 4px rgba(34,211,238,0.8)' : 'none',
            transition: `color 0.1s ${i * 0.01}s`,
          }}
        >
          {i < filled ? '█' : '░'}
        </span>
      ))}
      <span className="text-faint ml-1">]</span>
    </div>
  );
}

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [particles, setParticles] = useState<{ x: number; y: number; size: number; dur: number; delay: number }[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }).map(() => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        dur: 3 + Math.random() * 4,
        delay: Math.random() * 3,
      })),
    );
  }, []);

  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < BOOT_LINES.length; i++) {
      elapsed += BOOT_LINES[i].delay;
      timers.push(setTimeout(() => setVisibleLines(i + 1), elapsed));
    }
    const total = elapsed + 400;
    timers.push(setTimeout(() => setShowFlash(true), total));
    timers.push(setTimeout(() => onComplete(), total + 600));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const colorFor = (type?: string) => {
    switch (type) {
      case 'success': return '#10b981';
      case 'warn':    return '#f59e0b';
      case 'danger':  return '#ef4444';
      default:        return '#22d3ee';
    }
  };

  const pct = Math.round((visibleLines / BOOT_LINES.length) * 100);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-deep overflow-hidden transition-opacity duration-500 ${showFlash ? 'opacity-0' : 'opacity-100'}`}>
      {/* Background grid */}
      <div className="absolute inset-0 grid-bg opacity-40" />

      {/* Scanning line */}
      <div className="absolute inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)', animation: 'scan 2.5s linear infinite', opacity: 0.5 }} />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: '#22d3ee',
            opacity: 0.4,
            '--p-dur': `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Corner brackets */}
      {[
        'top-8 left-8 border-l-2 border-t-2',
        'top-8 right-8 border-r-2 border-t-2',
        'bottom-8 left-8 border-l-2 border-b-2',
        'bottom-8 right-8 border-r-2 border-b-2',
      ].map((cls, i) => (
        <div key={i} className={`absolute w-16 h-16 border-cyan opacity-60 animate-fade-in`} style={{ animationDelay: `${i * 0.1}s` }}>
          <div className={`w-full h-full ${cls.split(' ').slice(2).join(' ')}`} />
        </div>
      ))}

      <div className="relative z-10 w-full max-w-2xl px-8">
        {/* IAN Logo — glitch letters */}
        <div className="text-center mb-12">
          <div className="font-display text-6xl font-black tracking-[0.3em] text-cyan text-glow-cyan">
            {'IAN'.split('').map((c, i) => (
              <GlitchLetter key={i} char={c} delay={i * 400} />
            ))}
          </div>
          <div className="font-mono text-xs text-dim tracking-[0.4em] mt-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            INTELLIGENT AUTONOMOUS NETWORK
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            {[0, 0.2, 0.4].map((d) => (
              <div key={d} className="h-1 w-1 bg-cyan rounded-full animate-pulse-glow" style={{ animationDelay: `${d}s` }} />
            ))}
          </div>
        </div>

        {/* Boot log */}
        <div className="font-mono text-sm space-y-2 min-h-[240px]">
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className="flex items-center gap-3 animate-float-up"
              style={{ animationDelay: '0s', color: colorFor(line.type), textShadow: `0 0 8px ${colorFor(line.type)}60` }}
            >
              <span style={{ color: '#475569' }}>{'>'}</span>
              <span>{line.text}</span>
              {/* Typing cursor on last visible line */}
              {i === visibleLines - 1 && <span className="animate-blink" style={{ color: colorFor(line.type) }}>_</span>}
              {/* Check mark on completed lines */}
              {i < visibleLines - 1 && line.type === 'success' && (
                <span style={{ color: '#10b981' }}>✓</span>
              )}
            </div>
          ))}
        </div>

        {/* Data bar + percentage */}
        <div className="mt-8 space-y-2">
          <div className="flex justify-between font-mono text-xs text-faint mb-1">
            <span>SYSTEM BOOT</span>
            <span style={{ color: '#22d3ee', textShadow: '0 0 8px rgba(34,211,238,0.5)' }}>{pct}%</span>
          </div>
          <DataBar pct={pct} />
          {/* Classic progress bar underneath */}
          <div className="h-0.5 bg-panel-2 border border-line overflow-hidden rounded-sm mt-1">
            <div
              className="h-full bg-cyan relative overflow-hidden"
              style={{ width: `${pct}%`, boxShadow: '0 0 8px rgba(34,211,238,0.6)', transition: 'width 0.5s ease-out' }}
            >
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
