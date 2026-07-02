import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { X, Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { Neuron } from './engine';

interface Props {
  neurons: Neuron[];
  killMode: boolean;
  accentColor?: string;
  accentDim?: string;
  accentGlow?: string;
}

interface PositionedNeuron extends Neuron {
  x: number;
  y: number;
  radius: number;
  animDelay: number;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const SVG_SIZE = 800;
const CENTER = SVG_SIZE / 2;

// Orbiting particle dots rendered in SVG
function OrbitingParticles({ accent, glow, killMode }: { accent: string; glow: string; killMode: boolean }) {
  const particles = useMemo(() => [
    { r: 60, dur: 6, offset: 0, size: 2.5 },
    { r: 90, dur: 9, offset: 120, size: 2 },
    { r: 130, dur: 13, offset: 60, size: 1.8 },
    { r: 175, dur: 17, offset: 200, size: 2.2 },
    { r: 220, dur: 22, offset: 300, size: 1.5 },
    { r: 270, dur: 26, offset: 80, size: 2 },
  ], []);

  return (
    <>
      {particles.map((p, i) => {
        const id = `orbit-particle-${i}`;
        return (
          <g key={i}>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`${p.offset} ${CENTER} ${CENTER}`}
              to={`${p.offset + 360} ${CENTER} ${CENTER}`}
              dur={`${p.dur}s`}
              repeatCount="indefinite"
            />
            <circle
              cx={CENTER + p.r}
              cy={CENTER}
              r={p.size}
              fill={killMode ? '#ef4444' : accent}
              opacity="0.7"
              style={{ filter: `drop-shadow(0 0 ${p.size + 1}px ${glow})` }}
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`${p.offset} ${CENTER} ${CENTER}`}
                to={`${p.offset + 360} ${CENTER} ${CENTER}`}
                dur={`${p.dur}s`}
                repeatCount="indefinite"
              />
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur={`${p.dur * 0.5}s`} repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}
    </>
  );
}

export default function BrainMap({ neurons, killMode, accentColor, accentDim, accentGlow }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredNeuron, setHoveredNeuron] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);

  const accent = killMode ? '#ef4444' : (accentColor || '#22d3ee');
  const accentD = killMode ? '#7f1d1d' : (accentDim || '#0e7490');
  const glow = killMode ? 'rgba(239,68,68,0.5)' : (accentGlow || 'rgba(34,211,238,0.5)');

  // Animate breathing via requestAnimationFrame
  useEffect(() => {
    const loop = (t: number) => {
      timeRef.current = t;
      setTick(Math.floor(t / 100)); // update ~10x/sec for breathe
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const breathe = Math.sin(timeRef.current / 800) * 0.5 + 0.5; // 0–1

  const positioned = useMemo<PositionedNeuron[]>(() => {
    return neurons.map((n, i) => {
      const angle = (i / Math.max(neurons.length, 1)) * Math.PI * 2;
      const ringIndex = Math.floor(i / 8);
      const baseRadius = 120 + ringIndex * 100 + (hash(n.topic) % 60);
      return {
        ...n,
        x: CENTER + Math.cos(angle) * baseRadius,
        y: CENTER + Math.sin(angle) * baseRadius,
        radius: 8 + Math.min(n.connections.length * 2, 14),
        animDelay: (hash(n.topic) % 2000) / 1000,
      };
    });
  }, [neurons]);

  const topicIndex = useMemo(() => {
    const map = new Map<string, PositionedNeuron>();
    positioned.forEach((p) => map.set(p.topic, p));
    return map;
  }, [positioned]);

  useEffect(() => {
    if (!expanded) { setPan({ x: 0, y: 0 }); setZoom(1); }
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!expanded) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [expanded, pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    setPan({ x: dragStart.current.panX + (e.clientX - dragStart.current.x), y: dragStart.current.panY + (e.clientY - dragStart.current.y) });
  }, [isDragging]);

  const onMouseUp = useCallback(() => { setIsDragging(false); dragStart.current = null; }, []);

  const touchStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!expanded) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, panX: pan.x, panY: pan.y };
  }, [expanded, pan]);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    e.preventDefault();
    const t = e.touches[0];
    setPan({ x: touchStart.current.panX + (t.clientX - touchStart.current.x), y: touchStart.current.panY + (t.clientY - touchStart.current.y) });
  }, []);
  const onTouchEnd = useCallback(() => { touchStart.current = null; }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!expanded) return;
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(0.3, z * (e.deltaY > 0 ? 0.9 : 1.1))));
  }, [expanded]);

  const resetView = () => { setPan({ x: 0, y: 0 }); setZoom(1); };

  const svgContent = (isExpanded: boolean) => {
    const labelSize = isExpanded ? 10 : 6;

    return (
      <>
        {/* Animated background rings — expanding pulse */}
        {[300, 240, 180, 120, 60].map((r, i) => (
          <g key={r}>
            <circle cx={CENTER} cy={CENTER} r={r} fill="none" stroke={accentD} strokeWidth="0.5" opacity={0.22 - i * 0.02} />
            {/* Pulse ring on every other */}
            {i % 2 === 0 && (
              <circle cx={CENTER} cy={CENTER} r={r} fill="none" stroke={accent} strokeWidth="0.5" opacity="0">
                <animate attributeName="r" from={r} to={r + 30} dur={`${4 + i}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.25" to="0" dur={`${4 + i}s`} repeatCount="indefinite" />
              </circle>
            )}
          </g>
        ))}

        {/* Radar sweep */}
        <g style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
          <line x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER - 300} stroke={accent} strokeWidth="1" opacity="0.3">
            <animateTransform attributeName="transform" type="rotate" from={`0 ${CENTER} ${CENTER}`} to={`360 ${CENTER} ${CENTER}`} dur="4s" repeatCount="indefinite" />
          </line>
          {/* Fade trail behind radar */}
          <path d={`M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - 300}`} stroke={accent} strokeWidth="40" strokeOpacity="0.04" fill="none">
            <animateTransform attributeName="transform" type="rotate" from={`0 ${CENTER} ${CENTER}`} to={`360 ${CENTER} ${CENTER}`} dur="4s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Orbiting particles */}
        <OrbitingParticles accent={accent} glow={glow} killMode={killMode} />

        {/* Connections */}
        {positioned.map((n) =>
          n.connections.map((connTopic) => {
            const target = topicIndex.get(connTopic);
            if (!target) return null;
            const isHighlighted = hoveredNeuron === n.topic || hoveredNeuron === connTopic;
            const connDelay = ((hash(n.topic + connTopic)) % 3000) / 1000;
            return (
              <line
                key={`${n.topic}-${connTopic}`}
                x1={n.x} y1={n.y}
                x2={target.x} y2={target.y}
                stroke={accent}
                strokeWidth={isHighlighted ? 2 : 0.8}
                opacity={isHighlighted ? 0.8 : 0.18}
                style={{ transition: 'opacity 0.25s, stroke-width 0.25s' }}
              >
                {!isHighlighted && (
                  <>
                    <animate attributeName="stroke-opacity" values="0.12;0.4;0.12" dur={`${2.5 + (hash(n.topic) % 20) * 0.1}s`} begin={`${connDelay}s`} repeatCount="indefinite" />
                    <animate attributeName="stroke-width" values="0.8;1.6;0.8" dur={`${2.5 + (hash(n.topic) % 20) * 0.1}s`} begin={`${connDelay}s`} repeatCount="indefinite" />
                  </>
                )}
              </line>
            );
          }),
        )}

        {/* Neurons */}
        {positioned.map((n) => {
          const isHovered = hoveredNeuron === n.topic;
          const isConnected = hoveredNeuron !== null && (
            n.connections.includes(hoveredNeuron) ||
            (topicIndex.get(hoveredNeuron)?.connections.includes(n.topic) ?? false)
          );
          const dim = hoveredNeuron !== null && !isHovered && !isConnected;
          const breathAmt = Math.sin(timeRef.current / 1000 + n.animDelay * Math.PI * 2) * 0.5 + 0.5;
          const liveR = n.radius + breathAmt * 1.5;

          return (
            <g
              key={n.topic}
              style={{ cursor: isExpanded ? 'pointer' : 'default', opacity: dim ? 0.25 : 1, transition: 'opacity 0.25s' }}
              onMouseEnter={() => isExpanded && setHoveredNeuron(n.topic)}
              onMouseLeave={() => isExpanded && setHoveredNeuron(null)}
            >
              {/* Halo expand ring on hover */}
              {isHovered && (
                <circle cx={n.x} cy={n.y} r={liveR + 4} fill="none" stroke={accent} strokeWidth="1.5" opacity="0">
                  <animate attributeName="r" from={liveR + 4} to={liveR + 22} dur="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="0.8s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Outer ambient glow ring — always animated */}
              <circle
                cx={n.x} cy={n.y}
                r={liveR + (isHovered ? 10 : 5)}
                fill="none"
                stroke={accent}
                strokeWidth="0.5"
                opacity={isHovered ? 0.55 : 0.2}
                style={{ transition: 'r 0.3s, opacity 0.3s' }}
              />

              {/* Main neuron body — breathing */}
              <circle
                cx={n.x} cy={n.y}
                r={liveR}
                fill={accent}
                opacity={isHovered ? 1 : 0.75 + breathAmt * 0.15}
                style={{ filter: `drop-shadow(0 0 ${isHovered ? 8 : 4}px ${glow})`, transition: 'opacity 0.25s' }}
              />

              {/* Inner bright core */}
              <circle
                cx={n.x} cy={n.y}
                r={liveR * 0.32}
                fill="#fff"
                opacity={0.85 + breathAmt * 0.1}
              />

              {/* Ticker-style count badge for highly connected neurons */}
              {n.connections.length >= 3 && !isHovered && (
                <text
                  x={n.x + liveR - 2}
                  y={n.y - liveR + 4}
                  textAnchor="middle"
                  fill={accent}
                  fontSize="5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                  opacity="0.9"
                >
                  {n.connections.length}
                </text>
              )}

              {/* Label */}
              <text
                x={n.x}
                y={n.y + liveR + labelSize + 3}
                textAnchor="middle"
                fill={isHovered ? accent : (killMode ? '#fca5a5' : '#94a3b8')}
                fontSize={isHovered && isExpanded ? labelSize + 2 : labelSize}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={isHovered ? 'bold' : 'normal'}
                style={{ transition: 'fill 0.2s' }}
              >
                {n.topic.length > (isExpanded ? 24 : 14)
                  ? n.topic.slice(0, isExpanded ? 22 : 12) + '..'
                  : n.topic}
              </text>

              {/* Hover tooltip */}
              {isExpanded && isHovered && (
                <g style={{ animation: 'float-up 0.2s ease-out both' }}>
                  <rect
                    x={n.x - 95} y={n.y - liveR - 58}
                    width={190} height={46}
                    rx={5}
                    fill="#080f1e"
                    stroke={accent}
                    strokeWidth="1"
                    opacity="0.97"
                  />
                  <text x={n.x} y={n.y - liveR - 43} textAnchor="middle" fill={accent} fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                    {n.topic}
                  </text>
                  <text x={n.x} y={n.y - liveR - 28} textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="JetBrains Mono, monospace">
                    {n.explanation.length > 44 ? n.explanation.slice(0, 42) + '…' : n.explanation}
                  </text>
                  <text x={n.x} y={n.y - liveR - 14} textAnchor="middle" fill="#475569" fontSize="6.5" fontFamily="JetBrains Mono, monospace">
                    {n.connections.length} link{n.connections.length !== 1 ? 's' : ''} · added {n.created?.slice(0, 10) || '—'}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Center core — animated */}
        <circle cx={CENTER} cy={CENTER} r="18" fill="none" stroke={accent} strokeWidth="1" opacity="0.3">
          <animate attributeName="r" values="18;22;18" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={CENTER} cy={CENTER} r="10" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.5">
          <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle
          cx={CENTER} cy={CENTER} r={5 + breathe * 2}
          fill={accent}
          style={{ filter: `drop-shadow(0 0 ${6 + breathe * 6}px ${glow})` }}
        />
        <text
          x={CENTER} y={CENTER + 26}
          textAnchor="middle"
          fill={accent}
          fontSize={isExpanded ? 9 : 6}
          fontFamily="JetBrains Mono, monospace"
          opacity="0.7"
        >
          IAN.CORE
        </text>

        {/* Neuron count readout in corner */}
        <text
          x={SVG_SIZE - 10} y={SVG_SIZE - 10}
          textAnchor="end"
          fill={accentD}
          fontSize="7"
          fontFamily="JetBrains Mono, monospace"
          opacity="0.6"
        >
          {neurons.length} NEURONS · {positioned.reduce((acc, n) => acc + n.connections.length, 0) / 2 | 0} LINKS
        </text>
      </>
    );
  };

  // ── Collapsed panel ──
  const collapsedPanel = (
    <div className="relative w-full h-full flex flex-col data-stream-container">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: killMode ? '#ef4444' : accent }} />
          <span className="font-mono text-xs tracking-widest text-dim">CONCEPT BRAIN MAP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-faint animate-status-blink">{neurons.length} NEURONS</span>
          <button
            onClick={() => setExpanded(true)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title="Expand map"
          >
            <Maximize2 size={12} style={{ color: accent }} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 relative overflow-hidden cursor-pointer group"
        onClick={() => setExpanded(true)}
        title="Click to expand brain map"
      >
        <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="w-full h-full">
          {svgContent(false)}
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <div
            className="font-mono text-[9px] tracking-widest px-3 py-1.5 rounded border animate-scale-in"
            style={{ background: '#080f1e', borderColor: accent + '70', color: accent, boxShadow: `0 0 12px ${glow}` }}
          >
            CLICK TO EXPAND
          </div>
        </div>
      </div>

      <div className="border-t border-line px-4 py-2 relative z-10">
        <div className="font-mono text-[10px] text-faint tracking-wider">
          CORE: IAN.SYNAPSE.NETWORK v1.0
        </div>
      </div>
    </div>
  );

  // ── Expanded overlay ──
  const expandedOverlay = expanded ? (
    <div
      className="fixed inset-0 z-50 flex flex-col animate-fade-in"
      style={{ background: '#030712' }}
    >
      {/* Top scanline sweep */}
      <div className="absolute inset-x-0 top-0 h-0.5 pointer-events-none z-20" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, animation: 'scan 3s linear infinite', opacity: 0.4 }} />

      <div
        className="flex items-center justify-between px-6 py-3 border-b z-10 relative"
        style={{ borderColor: accent + '30', background: '#080f1e' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: accent }} />
          <span className="font-mono text-sm tracking-widest animate-glitch" style={{ color: accent }}>
            IAN CONCEPT BRAIN MAP
          </span>
          <span className="font-mono text-xs text-faint animate-status-blink">
            {neurons.length} NEURONS ACTIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.min(4, z * 1.2))} className="p-1.5 rounded border transition-all hover:bg-white/10 hover:scale-110" style={{ borderColor: accent + '40' }} title="Zoom in">
            <ZoomIn size={14} style={{ color: accent }} />
          </button>
          <button onClick={() => setZoom((z) => Math.max(0.3, z * 0.85))} className="p-1.5 rounded border transition-all hover:bg-white/10 hover:scale-110" style={{ borderColor: accent + '40' }} title="Zoom out">
            <ZoomOut size={14} style={{ color: accent }} />
          </button>
          <button onClick={resetView} className="p-1.5 rounded border transition-all hover:bg-white/10 hover:scale-110" style={{ borderColor: accent + '40' }} title="Reset view">
            <RotateCcw size={14} style={{ color: accent }} />
          </button>
          <div className="w-px h-5 mx-1" style={{ background: accent + '30' }} />
          <button onClick={() => setExpanded(false)} className="p-1.5 rounded border transition-all hover:bg-red-500/20 hover:scale-110" style={{ borderColor: accent + '40' }} title="Close (Esc)">
            <X size={14} style={{ color: accent }} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 relative overflow-hidden"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
      >
        {/* Animated grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${accent}08 1px, transparent 1px), linear-gradient(90deg, ${accent}08 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: `${pan.x % 40}px ${pan.y % 40}px`,
          }}
        />
        {/* Corner brackets */}
        {[['top-4 left-4', 'border-l border-t'], ['top-4 right-4', 'border-r border-t'], ['bottom-4 left-4', 'border-l border-b'], ['bottom-4 right-4', 'border-r border-b']].map(([pos, borders], i) => (
          <div key={i} className={`absolute w-12 h-12 ${pos} ${borders} animate-fade-in`} style={{ borderColor: accent + '30', animationDelay: `${i * 0.1}s` }} />
        ))}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="absolute"
          style={{
            width: SVG_SIZE * zoom,
            height: SVG_SIZE * zoom,
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {svgContent(true)}
        </svg>

        <div className="absolute bottom-4 left-4 font-mono text-xs px-2 py-1 rounded border animate-fade-in" style={{ background: '#080f1e', borderColor: accent + '40', color: accent + 'aa' }}>
          {Math.round(zoom * 100)}%
        </div>
        <div className="absolute bottom-4 right-4 font-mono text-[10px] px-2 py-1 rounded border animate-fade-in" style={{ background: '#080f1e', borderColor: accent + '30', color: '#475569' }}>
          DRAG TO PAN · SCROLL TO ZOOM · ESC TO CLOSE
        </div>
      </div>

      <div className="px-6 py-2 border-t font-mono text-[10px] text-faint tracking-wider" style={{ borderColor: accent + '20', background: '#080f1e' }}>
        CORE: IAN.SYNAPSE.NETWORK v1.0 — HOVER NEURONS FOR DETAILS
      </div>
    </div>
  ) : null;

  return (
    <>
      {!expanded && collapsedPanel}
      {expandedOverlay}
    </>
  );
}
