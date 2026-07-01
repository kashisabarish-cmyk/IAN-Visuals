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

export default function BrainMap({ neurons, killMode, accentColor, accentDim, accentGlow }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredNeuron, setHoveredNeuron] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const accent = killMode ? '#ef4444' : (accentColor || '#22d3ee');
  const accentD = killMode ? '#7f1d1d' : (accentDim || '#0e7490');
  const glow = killMode ? 'rgba(239,68,68,0.4)' : (accentGlow || 'rgba(34,211,238,0.4)');

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
      };
    });
  }, [neurons]);

  const topicIndex = useMemo(() => {
    const map = new Map<string, PositionedNeuron>();
    positioned.forEach((p) => map.set(p.topic, p));
    return map;
  }, [positioned]);

  // Reset pan/zoom when collapsed
  useEffect(() => {
    if (!expanded) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [expanded]);

  // Escape key to close
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Mouse drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!expanded) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [expanded, pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  }, [isDragging]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  // Touch drag handlers
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
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    setPan({ x: touchStart.current.panX + dx, y: touchStart.current.panY + dy });
  }, []);

  const onTouchEnd = useCallback(() => {
    touchStart.current = null;
  }, []);

  // Wheel zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!expanded) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(4, Math.max(0.3, z * delta)));
  }, [expanded]);

  const resetView = () => { setPan({ x: 0, y: 0 }); setZoom(1); };

  const svgContent = (isExpanded: boolean) => {
    const labelSize = isExpanded ? 10 : 6;
    const ringOpacity = isExpanded ? 0.25 : 0.2;

    return (
      <>
        {/* Background rings */}
        {[300, 240, 180, 120, 60].map((r, i) => (
          <circle key={r} cx={CENTER} cy={CENTER} r={r} fill="none" stroke={accentD} strokeWidth="0.5" opacity={ringOpacity - i * 0.02} />
        ))}

        {/* Radar sweep */}
        <g className="animate-radar" style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
          <line x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER - 300} stroke={accent} strokeWidth="1" opacity="0.25" />
        </g>

        {/* Connections */}
        {positioned.map((n) =>
          n.connections.map((connTopic) => {
            const target = topicIndex.get(connTopic);
            if (!target) return null;
            const isHighlighted = hoveredNeuron === n.topic || hoveredNeuron === connTopic;
            return (
              <line
                key={`${n.topic}-${connTopic}`}
                x1={n.x} y1={n.y}
                x2={target.x} y2={target.y}
                stroke={accent}
                strokeWidth={isHighlighted ? 1.5 : 0.8}
                opacity={isHighlighted ? 0.7 : 0.2}
                style={{ transition: 'opacity 0.2s, stroke-width 0.2s' }}
              />
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

          return (
            <g
              key={n.topic}
              style={{ cursor: isExpanded ? 'pointer' : 'default', opacity: dim ? 0.3 : 1, transition: 'opacity 0.2s' }}
              onMouseEnter={() => isExpanded && setHoveredNeuron(n.topic)}
              onMouseLeave={() => isExpanded && setHoveredNeuron(null)}
            >
              {/* Outer glow ring */}
              <circle
                cx={n.x} cy={n.y}
                r={n.radius + (isHovered ? 8 : 5)}
                fill="none"
                stroke={accent}
                strokeWidth="0.5"
                opacity={isHovered ? 0.5 : 0.2}
                style={{ transition: 'r 0.2s, opacity 0.2s' }}
              />
              {/* Main dot */}
              <circle
                cx={n.x} cy={n.y}
                r={n.radius}
                fill={accent}
                opacity={isHovered ? 1 : 0.75}
                style={{ filter: isHovered ? `drop-shadow(0 0 6px ${glow})` : 'none', transition: 'opacity 0.2s' }}
              />
              {/* Inner bright core */}
              <circle
                cx={n.x} cy={n.y}
                r={n.radius * 0.35}
                fill="#fff"
                opacity="0.9"
              />

              {/* Label */}
              <text
                x={n.x}
                y={n.y + n.radius + labelSize + 3}
                textAnchor="middle"
                fill={isHovered ? accent : (killMode ? '#fca5a5' : '#94a3b8')}
                fontSize={isHovered && isExpanded ? labelSize + 2 : labelSize}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={isHovered ? 'bold' : 'normal'}
                style={{ transition: 'fill 0.2s, font-size 0.2s' }}
              >
                {n.topic.length > (isExpanded ? 24 : 16) ? n.topic.slice(0, isExpanded ? 22 : 14) + '..' : n.topic}
              </text>

              {/* Hover tooltip in expanded mode */}
              {isExpanded && isHovered && (
                <g>
                  <rect
                    x={n.x - 90} y={n.y - n.radius - 50}
                    width={180} height={38}
                    rx={4}
                    fill="#0f172a"
                    stroke={accent}
                    strokeWidth="0.8"
                    opacity="0.95"
                  />
                  <text
                    x={n.x} y={n.y - n.radius - 36}
                    textAnchor="middle"
                    fill={accent}
                    fontSize="8"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    {n.topic}
                  </text>
                  <text
                    x={n.x} y={n.y - n.radius - 22}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="7"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {n.explanation.length > 40 ? n.explanation.slice(0, 38) + '...' : n.explanation}
                  </text>
                  <text
                    x={n.x} y={n.y - n.radius - 10}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="6.5"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {n.connections.length} connection{n.connections.length !== 1 ? 's' : ''}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Center core */}
        <circle cx={CENTER} cy={CENTER} r="12" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.6" />
        <circle cx={CENTER} cy={CENTER} r="5" fill={accent} className="animate-pulse-glow" />
        <text
          x={CENTER} y={CENTER + 22}
          textAnchor="middle"
          fill={accent}
          fontSize={isExpanded ? 9 : 6}
          fontFamily="JetBrains Mono, monospace"
          opacity="0.7"
        >
          IAN.CORE
        </text>
      </>
    );
  };

  // Collapsed panel (sidebar)
  const collapsedPanel = (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full animate-pulse-glow`}
            style={{ background: killMode ? '#ef4444' : accent }}
          />
          <span className="font-mono text-xs tracking-widest text-dim">CONCEPT BRAIN MAP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-faint">{neurons.length} NEURONS</span>
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
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="w-full h-full"
        >
          {svgContent(false)}
        </svg>
        {/* Hover overlay hint */}
        <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div
            className="font-mono text-[9px] tracking-widest px-2 py-1 rounded border"
            style={{ background: '#0f172a', borderColor: accent + '60', color: accent }}
          >
            CLICK TO EXPAND
          </div>
        </div>
      </div>

      <div className="border-t border-line px-4 py-2">
        <div className="font-mono text-[10px] text-faint tracking-wider">
          CORE: IAN.SYNAPSE.NETWORK v1.0
        </div>
      </div>
    </div>
  );

  // Expanded full-screen overlay
  const expandedOverlay = expanded ? (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#020817' }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: accent + '30', background: '#0a1628' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: accent }} />
          <span className="font-mono text-sm tracking-widest" style={{ color: accent }}>
            IAN CONCEPT BRAIN MAP
          </span>
          <span className="font-mono text-xs text-faint">— {neurons.length} NEURONS ACTIVE</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            onClick={() => setZoom((z) => Math.min(4, z * 1.2))}
            className="p-1.5 rounded border transition-all hover:bg-white/10"
            style={{ borderColor: accent + '40' }}
            title="Zoom in"
          >
            <ZoomIn size={14} style={{ color: accent }} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z * 0.85))}
            className="p-1.5 rounded border transition-all hover:bg-white/10"
            style={{ borderColor: accent + '40' }}
            title="Zoom out"
          >
            <ZoomOut size={14} style={{ color: accent }} />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 rounded border transition-all hover:bg-white/10"
            style={{ borderColor: accent + '40' }}
            title="Reset view"
          >
            <RotateCcw size={14} style={{ color: accent }} />
          </button>
          <div className="w-px h-5 mx-1" style={{ background: accent + '30' }} />
          <button
            onClick={() => setExpanded(false)}
            className="p-1.5 rounded border transition-all hover:bg-red-500/20"
            style={{ borderColor: accent + '40' }}
            title="Close (Esc)"
          >
            <X size={14} style={{ color: accent }} />
          </button>
        </div>
      </div>

      {/* Map canvas */}
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
        {/* Grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${accent}10 1px, transparent 1px), linear-gradient(90deg, ${accent}10 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: `${pan.x % 40}px ${pan.y % 40}px`,
          }}
        />

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

        {/* Zoom indicator */}
        <div
          className="absolute bottom-4 left-4 font-mono text-xs px-2 py-1 rounded border"
          style={{ background: '#0a1628', borderColor: accent + '40', color: accent + 'aa' }}
        >
          {Math.round(zoom * 100)}%
        </div>

        {/* Instructions hint */}
        <div
          className="absolute bottom-4 right-4 font-mono text-[10px] px-2 py-1 rounded border"
          style={{ background: '#0a1628', borderColor: accent + '30', color: '#475569' }}
        >
          DRAG TO PAN · SCROLL TO ZOOM · ESC TO CLOSE
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-6 py-2 border-t font-mono text-[10px] text-faint tracking-wider"
        style={{ borderColor: accent + '20', background: '#0a1628' }}
      >
        CORE: IAN.SYNAPSE.NETWORK v1.0 — HOVER NEURONS FOR DETAILS
      </div>
    </div>
  ) : null;

  return (
    <>
      {collapsedPanel}
      {expandedOverlay}
    </>
  );
}
