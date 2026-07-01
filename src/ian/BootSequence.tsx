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

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < BOOT_LINES.length; i++) {
      elapsed += BOOT_LINES[i].delay;
      timers.push(
        setTimeout(() => setVisibleLines(i + 1), elapsed),
      );
    }
    const total = elapsed + 400;
    timers.push(setTimeout(() => setShowFlash(true), total));
    timers.push(setTimeout(() => onComplete(), total + 600));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const colorFor = (type?: string) => {
    switch (type) {
      case 'success': return 'text-green-glow text-glow-cyan';
      case 'warn': return 'text-amber text-glow-amber';
      case 'danger': return 'text-red-glow text-glow-red';
      default: return 'text-cyan text-glow-cyan';
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-deep transition-opacity duration-500 ${showFlash ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-0 scanline" />

      {/* Corner brackets */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-cyan opacity-60" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-cyan opacity-60" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-cyan opacity-60" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-cyan opacity-60" />

      <div className="relative z-10 w-full max-w-2xl px-8">
        {/* IAN Logo */}
        <div className="text-center mb-12">
          <div className="font-display text-6xl font-black tracking-[0.3em] text-cyan text-glow-cyan animate-flicker">
            IAN
          </div>
          <div className="font-mono text-xs text-dim tracking-[0.4em] mt-2">
            INTELLIGENT AUTONOMOUS NETWORK
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-1 w-1 bg-cyan rounded-full animate-pulse-glow" />
            <div className="h-1 w-1 bg-cyan rounded-full animate-pulse-glow" style={{ animationDelay: '0.2s' }} />
            <div className="h-1 w-1 bg-cyan rounded-full animate-pulse-glow" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>

        {/* Boot log */}
        <div className="font-mono text-sm space-y-2 min-h-[240px]">
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div key={i} className={`flex items-center gap-3 animate-float-up ${colorFor(line.type)}`}>
              <span className="text-faint">{'>'}</span>
              <span>{line.text}</span>
              {i === visibleLines - 1 && <span className="animate-blink">_</span>}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-8">
          <div className="flex justify-between font-mono text-xs text-faint mb-2">
            <span>SYSTEM BOOT</span>
            <span>{Math.round((visibleLines / BOOT_LINES.length) * 100)}%</span>
          </div>
          <div className="h-1 bg-panel-2 border border-line overflow-hidden rounded-sm">
            <div
              className="h-full bg-cyan glow-cyan transition-all duration-500"
              style={{ width: `${(visibleLines / BOOT_LINES.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
