import { useMemo } from 'react';
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

// Deterministic pseudo-random based on string hash for stable positions
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export default function BrainMap({ neurons, killMode, accentColor, accentDim }: Props) {
  const positioned = useMemo<PositionedNeuron[]>(() => {
    const cx = 200;
    const cy = 200;
    return neurons.map((n, i) => {
      const angle = (i / Math.max(neurons.length, 1)) * Math.PI * 2;
      const radius = 60 + (hash(n.topic) % 80);
      return {
        ...n,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        radius: 6 + (n.connections.length * 1.5),
      };
    });
  }, [neurons]);

  const topicIndex = useMemo(() => {
    const map = new Map<string, PositionedNeuron>();
    positioned.forEach((p) => map.set(p.topic, p));
    return map;
  }, [positioned]);

  const accent = killMode ? '#ef4444' : (accentColor || '#22d3ee');
  const accentD = killMode ? '#7f1d1d' : (accentDim || '#0e7490');

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${killMode ? 'bg-red-glow' : 'bg-cyan'} animate-pulse-glow`} />
          <span className="font-mono text-xs tracking-widest text-dim">CONCEPT BRAIN MAP</span>
        </div>
        <span className="font-mono text-xs text-faint">{neurons.length} NEURONS</span>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <svg viewBox="0 0 400 400" className="w-full h-full">
          {/* Background rings */}
          <circle cx="200" cy="200" r="180" fill="none" stroke={accentD} strokeWidth="0.5" opacity="0.2" />
          <circle cx="200" cy="200" r="140" fill="none" stroke={accentD} strokeWidth="0.5" opacity="0.15" />
          <circle cx="200" cy="200" r="100" fill="none" stroke={accentD} strokeWidth="0.5" opacity="0.1" />

          {/* Rotating radar sweep */}
          <g className="animate-radar" style={{ transformOrigin: '200px 200px' }}>
            <line x1="200" y1="200" x2="200" y2="20" stroke={accent} strokeWidth="1" opacity="0.3" />
          </g>

          {/* Connections */}
          {positioned.map((n) =>
            n.connections.map((connTopic) => {
              const target = topicIndex.get(connTopic);
              if (!target) return null;
              return (
                <line
                  key={`${n.topic}-${connTopic}`}
                  x1={n.x}
                  y1={n.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={accent}
                  strokeWidth="0.8"
                  opacity="0.25"
                />
              );
            }),
          )}

          {/* Neurons */}
          {positioned.map((n) => (
            <g key={n.topic}>
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius + 4}
                fill="none"
                stroke={accent}
                strokeWidth="0.5"
                opacity="0.3"
                className="animate-pulse-glow"
              />
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius}
                fill={accent}
                opacity="0.8"
              />
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius * 0.4}
                fill="#fff"
                opacity="0.9"
              />
              <text
                x={n.x}
                y={n.y + n.radius + 12}
                textAnchor="middle"
                fill={killMode ? '#fca5a5' : '#94a3b8'}
                fontSize="6"
                fontFamily="JetBrains Mono, monospace"
              >
                {n.topic.length > 18 ? n.topic.slice(0, 16) + '..' : n.topic}
              </text>
            </g>
          ))}

          {/* Center core */}
          <circle cx="200" cy="200" r="8" fill="none" stroke={accent} strokeWidth="1" opacity="0.5" />
          <circle cx="200" cy="200" r="3" fill={accent} className="animate-pulse-glow" />
        </svg>
      </div>

      <div className="border-t border-line px-4 py-2">
        <div className="font-mono text-[10px] text-faint tracking-wider">
          CORE: IAN.SYNAPSE.NETWORK v1.0
        </div>
      </div>
    </div>
  );
}
