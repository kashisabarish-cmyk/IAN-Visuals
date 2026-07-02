import { useEffect, useRef, useState } from 'react';
import type { Neuron } from './engine';

interface Props {
  neurons: Neuron[];
  killMode: boolean;
  accentColor: string;
  accentDim: string;
  accentGlow: string;
}

interface NodePosition {
  x: number;
  y: number;
  neuron: Neuron;
}

export default function BrainMap({ neurons, killMode, accentColor, accentDim, accentGlow }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<NodePosition[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!containerRef.current || neurons.length === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width - 60;
    const height = rect.height - 60;
    const centerX = width / 2;
    const centerY = height / 2;

    const newPositions: NodePosition[] = neurons.map((neuron, i) => {
      const angle = (i / neurons.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.35;
      const jitterX = (Math.random() - 0.5) * 40;
      const jitterY = (Math.random() - 0.5) * 40;

      return {
        x: centerX + Math.cos(angle) * radius + jitterX + 30,
        y: centerY + Math.sin(angle) * radius + jitterY + 30,
        neuron,
      };
    });

    setPositions(newPositions);
  }, [neurons]);

  const getConnectionPath = (from: NodePosition, to: NodePosition) => {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const ctrl1X = from.x + (midX - from.x) * 0.5;
    const ctrl1Y = from.y + (midY - from.y) * 0.5 - 20;
    return `M ${from.x} ${from.y} Q ${ctrl1X} ${ctrl1Y} ${to.x} ${to.y}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-y-0 w-1/3 animate-shimmer" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}08, transparent)` }} />
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: accentColor }} />
          <span className="font-mono text-xs tracking-widest text-dim">BRAIN MAP</span>
        </div>
        <span className="font-mono text-[10px] text-faint relative z-10">
          {neurons.length} NEURONS
        </span>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {mounted && positions.length > 0 && (
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.9 }}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="nodeGradient">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.8" />
                <stop offset="100%" stopColor={accentDim} stopOpacity="0.4" />
              </radialGradient>
            </defs>

            {positions.map((pos) => {
              const connections = pos.neuron.connections
                .map((c) => positions.find((p) => p.neuron.topic === c))
                .filter(Boolean) as NodePosition[];

              return connections.map((target) => (
                <path
                  key={`${pos.neuron.topic}-${target.neuron.topic}`}
                  d={getConnectionPath(pos, target)}
                  fill="none"
                  stroke={killMode ? '#ef4444' : accentColor}
                  strokeWidth="1"
                  strokeOpacity="0.25"
                  className="animate-conn-pulse"
                  filter="url(#glow)"
                />
              ));
            })}

            {positions.map((pos) => {
              const isHovered = hovered === pos.neuron.topic;
              const baseRadius = 8;
              const radius = isHovered ? baseRadius * 1.3 : baseRadius;

              return (
                <g key={pos.neuron.topic}>
                  {isHovered && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radius + 8}
                      fill={killMode ? '#ef4444' : accentColor}
                      opacity="0.15"
                      className="animate-core-pulse"
                    />
                  )}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius}
                    fill={`url(#nodeGradient)`}
                    stroke={killMode ? '#ef4444' : accentColor}
                    strokeWidth={isHovered ? 2 : 1}
                    style={{
                      filter: `drop-shadow(0 0 ${isHovered ? 8 : 4}px ${killMode ? 'rgba(239,68,68,0.6)' : accentGlow})`,
                      transition: 'all 0.2s ease-out',
                    }}
                    className="cursor-pointer"
                    onMouseEnter={() => setHovered(pos.neuron.topic)}
                    onMouseLeave={() => setHovered(null)}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + radius + 14}
                    textAnchor="middle"
                    fill={isHovered ? accentColor : accentDim}
                    fontSize="8"
                    fontFamily="JetBrains Mono, monospace"
                    style={{
                      opacity: isHovered ? 1 : 0.6,
                      transition: 'all 0.2s ease-out',
                    }}
                  >
                    {pos.neuron.topic.slice(0, 12)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {positions.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="font-mono text-xs text-faint">No neurons yet</div>
              <div className="font-mono text-[10px] text-faint mt-1">Teach IAN something new</div>
            </div>
          </div>
        )}
      </div>

      {hovered && (
        <div className="absolute bottom-4 left-4 right-4 bg-panel border border-line rounded p-3 animate-scale-in" style={{ boxShadow: `0 0 16px ${accentGlow}` }}>
          {() => {
            const neuron = neurons.find((n) => n.topic === hovered);
            if (!neuron) return null;
            return (
              <>
                <div className="font-mono text-xs font-bold mb-1" style={{ color: accentColor }}>
                  {neuron.topic}
                </div>
                <div className="font-mono text-[11px] text-dim leading-relaxed">
                  {neuron.explanation}
                </div>
                <div className="font-mono text-[9px] text-faint mt-2">
                  Connections: {neuron.connections.length > 0 ? neuron.connections.join(', ') : 'none'}
                </div>
              </>
            );
          }}
        </div>
      )}
    </div>
  );
}
