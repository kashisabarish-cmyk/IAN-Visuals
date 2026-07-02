import { useEffect, useRef, useState, useCallback } from 'react';
import type { Neuron } from './engine';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Filter, Search, X } from 'lucide-react';

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
  vx: number;
  vy: number;
  neuron: Neuron;
}

type LayoutMode = 'radial' | 'force' | 'cluster';
type FilterMode = 'all' | 'connected' | 'isolated';

export default function BrainMap({ neurons, killMode, accentColor, accentDim, accentGlow }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const [positions, setPositions] = useState<NodePosition[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [selectedNeuron, setSelectedNeuron] = useState<Neuron | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Initialize positions
  useEffect(() => {
    if (!containerRef.current || neurons.length === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newPositions: NodePosition[] = neurons.map((neuron, i) => {
      const angle = (i / neurons.length) * Math.PI * 2;
      const radius = Math.min(rect.width, rect.height) * 0.3;
      return {
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        neuron,
      };
    });

    setPositions(newPositions);
  }, [neurons]);

  // Force-directed layout simulation
  useEffect(() => {
    if (layoutMode !== 'force' || positions.length === 0) return;

    const simulate = () => {
      setPositions((prev) => {
        const next = prev.map((p) => ({ ...p, vx: 0, vy: 0 }));
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return prev;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Apply forces
        for (let i = 0; i < next.length; i++) {
          const node = next[i];

          // Center gravity
          node.vx += (centerX - node.x) * 0.0005 * simulationSpeed;
          node.vy += (centerY - node.y) * 0.0005 * simulationSpeed;

          // Repulsion between nodes
          for (let j = 0; j < next.length; j++) {
            if (i === j) continue;
            const other = next[j];
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 800 / (dist * dist);
            node.vx += (dx / dist) * force * 0.05 * simulationSpeed;
            node.vy += (dy / dist) * force * 0.05 * simulationSpeed;
          }

          // Attraction along connections
          for (const conn of node.neuron.connections) {
            const other = next.find((n) => n.neuron.topic === conn);
            if (other) {
              const dx = other.x - node.x;
              const dy = other.y - node.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              node.vx += (dx / dist) * 0.02 * simulationSpeed;
              node.vy += (dy / dist) * 0.02 * simulationSpeed;
            }
          }

          // Apply velocity with damping
          node.x += node.vx * 0.5;
          node.y += node.vy * 0.5;
          node.x = Math.max(30, Math.min(rect.width - 30, node.x));
          node.y = Math.max(30, Math.min(rect.height - 30, node.y));
        }

        return next;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [layoutMode, simulationSpeed, positions.length]);

  // Radial layout
  useEffect(() => {
    if (layoutMode !== 'radial' || positions.length === 0) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(rect.width, rect.height) * 0.35;

    setPositions((prev) =>
      prev.map((p, i) => {
        const angle = (i / prev.length) * Math.PI * 2 - Math.PI / 2;
        return {
          ...p,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        };
      })
    );
  }, [layoutMode]);

  // Cluster layout by connections
  useEffect(() => {
    if (layoutMode !== 'cluster' || positions.length === 0) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Group neurons by connection count
    const groups: Neuron[][] = [[], [], []];
    positions.forEach((p) => {
      const connCount = p.neuron.connections.length;
      if (connCount >= 3) groups[0].push(p.neuron);
      else if (connCount >= 1) groups[1].push(p.neuron);
      else groups[2].push(p.neuron);
    });

    const newPositions = positions.map((p) => {
      let groupIndex = 2;
      const connCount = p.neuron.connections.length;
      if (connCount >= 3) groupIndex = 0;
      else if (connCount >= 1) groupIndex = 1;

      const group = groups[groupIndex];
      const idx = group.indexOf(p.neuron);
      const groupRadius = 60 + groupIndex * 80;
      const angle = (idx / group.length) * Math.PI * 2;

      return {
        ...p,
        x: centerX + Math.cos(angle) * groupRadius,
        y: centerY + Math.sin(angle) * groupRadius,
        vx: 0,
        vy: 0,
      };
    });

    setPositions(newPositions);
  }, [layoutMode]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.3, Math.min(3, z + delta)));
  };

  const filteredPositions = positions.filter((pos) => {
    const matchesSearch = searchQuery === '' || pos.neuron.topic.includes(searchQuery.toLowerCase()) || pos.neuron.explanation.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterMode === 'connected') return matchesSearch && pos.neuron.connections.length > 0;
    if (filterMode === 'isolated') return matchesSearch && pos.neuron.connections.length === 0;
    return matchesSearch;
  });

  const getConnectionPath = (from: NodePosition, to: NodePosition) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const cx = from.x + dx * 0.5;
    const cy = from.y + dy * 0.5 - 30;
    return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
  };

  const getNeuronSize = (neuron: Neuron) => {
    const base = 10;
    const connectionBonus = neuron.connections.length * 2;
    return Math.min(base + connectionBonus, 20);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-y-0 w-1/3 animate-shimmer" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}08, transparent)` }} />
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: accentColor }} />
          <span className="font-mono text-xs tracking-widest text-dim">BRAIN MAP</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: accentColor + '15', color: accentColor }}>
            {layoutMode.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <span className="font-mono text-[10px] text-faint">{filteredPositions.length} VISIBLE</span>
          <button onClick={() => setShowControls(!showControls)} className="p-1 hover:bg-panel-2 rounded transition-colors">
            <Filter size={12} style={{ color: showControls ? accentColor : '#64748b' }} />
          </button>
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="border-b border-line px-4 py-2 bg-panel/50 space-y-2 animate-fade-in">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search neurons..."
                className="w-full bg-deep-2 border border-line rounded px-3 py-1 pl-7 font-mono text-xs text-slate-200 outline-none focus:border-cyan-dim transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X size={12} className="text-faint hover:text-dim" />
                </button>
              )}
            </div>
          </div>

          {/* Layout & Filter Controls */}
          <div className="flex items-center gap-4 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="text-faint">LAYOUT:</span>
              {(['radial', 'force', 'cluster'] as LayoutMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLayoutMode(mode)}
                  className="px-2 py-0.5 rounded font-mono transition-all"
                  style={{
                    background: layoutMode === mode ? accentColor + '30' : 'transparent',
                    color: layoutMode === mode ? accentColor : '#64748b',
                  }}
                >
                  {mode[0].toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-faint">FILTER:</span>
              {(['all', 'connected', 'isolated'] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className="px-2 py-0.5 rounded font-mono transition-all"
                  style={{
                    background: filterMode === mode ? accentColor + '30' : 'transparent',
                    color: filterMode === mode ? accentColor : '#64748b',
                  }}
                >
                  {mode === 'all' ? 'A' : mode === 'connected' ? 'C' : 'I'}
                </button>
              ))}
            </div>

            {layoutMode === 'force' && (
              <div className="flex items-center gap-1">
                <span className="text-faint">SPEED:</span>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={simulationSpeed}
                  onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                  className="w-16 accent-cyan"
                />
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button onClick={handleZoomOut} className="p-1 hover:bg-panel-2 rounded transition-colors" title="Zoom out">
              <ZoomOut size={14} className="text-dim" />
            </button>
            <span className="font-mono text-[10px] text-faint w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-1 hover:bg-panel-2 rounded transition-colors" title="Zoom in">
              <ZoomIn size={14} className="text-dim" />
            </button>
            <button onClick={handleReset} className="p-1 hover:bg-panel-2 rounded transition-colors" title="Reset view">
              <RotateCcw size={14} className="text-dim" />
            </button>
          </div>
        </div>
      )}

      {/* Main visualization */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {mounted && filteredPositions.length > 0 && (
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <svg className="w-full h-full" style={{ minWidth: '100%', minHeight: '100%' }}>
              <defs>
                <filter id="glow-brain">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="nodeGradient-brain">
                  <stop offset="0%" stopColor={killMode ? '#ef4444' : accentColor} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={accentDim} stopOpacity="0.4" />
                </radialGradient>
                <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={killMode ? '#ef4444' : accentColor} stopOpacity="0.1" />
                  <stop offset="50%" stopColor={killMode ? '#ef4444' : accentColor} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={killMode ? '#ef4444' : accentColor} stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Connections */}
              {filteredPositions.map((pos) => {
                const connections = pos.neuron.connections
                  .map((c) => filteredPositions.find((p) => p.neuron.topic === c))
                  .filter(Boolean) as NodePosition[];

                return connections.map((target) => {
                  const isHighlighted = hovered === pos.neuron.topic || hovered === target.neuron.topic || selectedNeuron?.topic === pos.neuron.topic || selectedNeuron?.topic === target.neuron.topic;

                  return (
                    <path
                      key={`${pos.neuron.topic}-${target.neuron.topic}`}
                      d={getConnectionPath(pos, target)}
                      fill="none"
                      stroke={isHighlighted ? (killMode ? '#ef4444' : accentColor) : 'url(#connectionGradient)'}
                      strokeWidth={isHighlighted ? 2 : 1}
                      strokeOpacity={isHighlighted ? 0.8 : 0.3}
                      className={isHighlighted ? '' : 'animate-conn-pulse'}
                      filter={isHighlighted ? 'url(#glow-brain)' : undefined}
                      style={{ transition: 'all 0.2s ease-out' }}
                    />
                  );
                });
              })}

              {/* Nodes */}
              {filteredPositions.map((pos) => {
                const isHovered = hovered === pos.neuron.topic;
                const isSelected = selectedNeuron?.topic === pos.neuron.topic;
                const isHighlighted = isHovered || isSelected;
                const matchesSearch = searchQuery !== '' && (pos.neuron.topic.includes(searchQuery.toLowerCase()) || pos.neuron.explanation.toLowerCase().includes(searchQuery.toLowerCase()));
                const baseRadius = getNeuronSize(pos.neuron);
                const radius = isHighlighted ? baseRadius * 1.4 : matchesSearch ? baseRadius * 1.2 : baseRadius;

                return (
                  <g key={pos.neuron.topic} style={{ cursor: 'pointer' }}>
                    {/* Outer glow ring for highlighted nodes */}
                    {(isHighlighted || matchesSearch) && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={radius + 12}
                        fill="none"
                        stroke={killMode ? '#ef4444' : accentColor}
                        strokeWidth="1"
                        strokeOpacity="0.3"
                        className="animate-core-pulse"
                      />
                    )}

                    {/* Selection ring */}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={radius + 6}
                        fill="none"
                        stroke={killMode ? '#ef4444' : accentColor}
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        className="animate-spin-slow"
                        style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                      />
                    )}

                    {/* Main node */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radius}
                      fill={`url(#nodeGradient-brain)`}
                      stroke={killMode ? '#ef4444' : accentColor}
                      strokeWidth={isHighlighted ? 2 : 1}
                      style={{
                        filter: `drop-shadow(0 0 ${isHighlighted ? 10 : 4}px ${killMode ? 'rgba(239,68,68,0.7)' : accentGlow})`,
                        transition: 'all 0.2s ease-out',
                      }}
                      onMouseEnter={() => setHovered(pos.neuron.topic)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => setSelectedNeuron(isSelected ? null : pos.neuron)}
                    />

                    {/* Connection count indicator */}
                    {pos.neuron.connections.length > 0 && (
                      <circle
                        cx={pos.x + radius * 0.7}
                        cy={pos.y - radius * 0.7}
                        r={4}
                        fill={pos.neuron.connections.length >= 3 ? '#10b981' : '#f59e0b'}
                        stroke="#0d1320"
                        strokeWidth="1"
                      />
                    )}

                    {/* Label */}
                    <text
                      x={pos.x}
                      y={pos.y + radius + 16}
                      textAnchor="middle"
                      fill={isHighlighted ? accentColor : accentDim}
                      fontSize={isHighlighted ? '9' : '7'}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight={isHighlighted ? 'bold' : 'normal'}
                      style={{
                        opacity: isHighlighted ? 1 : matchesSearch ? 0.9 : 0.5,
                        transition: 'all 0.2s ease-out',
                        textShadow: isHighlighted ? `0 0 6px ${accentGlow}` : 'none',
                        cursor: 'pointer',
                      } as React.CSSProperties}
                      onMouseEnter={() => setHovered(pos.neuron.topic)}
                      onClick={() => setSelectedNeuron(isSelected ? null : pos.neuron)}
                    >
                      {pos.neuron.topic.length > 15 ? pos.neuron.topic.slice(0, 13) + '...' : pos.neuron.topic}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {filteredPositions.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="font-mono text-xs text-faint">{searchQuery ? 'No matching neurons' : 'No neurons yet'}</div>
              <div className="font-mono text-[10px] text-faint mt-1">{searchQuery ? 'Try a different search' : 'Teach IAN something new'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Neuron detail panel */}
      {selectedNeuron && (
        <div className="border-t border-line bg-panel/90 backdrop-blur p-4 animate-slide-up">
          <div className="flex items-start justify-between mb-2">
            <div className="font-mono text-sm font-bold" style={{ color: killMode ? '#ef4444' : accentColor, textShadow: `0 0 8px ${accentGlow}` }}>
              {selectedNeuron.topic}
            </div>
            <button onClick={() => setSelectedNeuron(null)} className="text-faint hover:text-dim transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="font-mono text-xs text-slate-300 leading-relaxed mb-3">{selectedNeuron.explanation}</div>
          <div className="grid grid-cols-2 gap-4 text-[10px]">
            <div>
              <span className="text-faint">CONNECTIONS: </span>
              <span className="text-dim">{selectedNeuron.connections.length}</span>
              {selectedNeuron.connections.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedNeuron.connections.slice(0, 5).map((c) => (
                    <span key={c} className="px-1.5 py-0.5 rounded bg-panel-2 text-dim">
                      {c}
                    </span>
                  ))}
                  {selectedNeuron.connections.length > 5 && (
                    <span className="text-faint">+{selectedNeuron.connections.length - 5} more</span>
                  )}
                </div>
              )}
            </div>
            <div>
              <span className="text-faint">CREATED: </span>
              <span className="text-dim">{new Date(selectedNeuron.created).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-faint">KEYWORDS: </span>
              <span className="text-dim">{selectedNeuron.keywords?.slice(0, 5).join(', ') || 'none'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && !selectedNeuron && (
        <div
          className="absolute bottom-4 left-4 bg-panel/95 border border-line rounded px-3 py-2 animate-scale-in pointer-events-none z-10"
          style={{ boxShadow: `0 0 12px ${accentGlow}` }}
        >
          {(() => {
            const neuron = neurons.find((n) => n.topic === hovered);
            if (!neuron) return null;
            return (
              <>
                <div className="font-mono text-xs font-bold" style={{ color: accentColor }}>
                  {neuron.topic}
                </div>
                <div className="font-mono text-[10px] text-dim mt-0.5 max-w-xs truncate">
                  {neuron.explanation}
                </div>
                <div className="font-mono text-[9px] text-faint mt-1">
                  {neuron.connections.length} connections · Click for details
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
