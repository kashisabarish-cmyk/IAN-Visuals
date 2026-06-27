import { useEffect, useRef, useState } from 'react';
import type { IanResponse, IanContext, AccentColor } from './engine';
import { ACCENT_COLORS } from './engine';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ian' | 'system';
  text: string;
  type: IanResponse['type'];
  timestamp: string;
}

interface Props {
  messages: ChatMessage[];
  killMode: boolean;
  accent: AccentColor;
  pendingNeuron: IanContext['pendingNeuron'];
  onSend: (msg: string) => void;
  onNeuronApprove: (approved: boolean) => void;
  thinking: boolean;
}

export default function ChatInterface({ messages, killMode, accent, pendingNeuron, onSend, onNeuronApprove, thinking }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const accentCfg = ACCENT_COLORS[accent];
  const accentMain = killMode ? '#ef4444' : accentCfg.main;
  const accentGlow = killMode ? 'rgba(239,68,68,0.5)' : accentCfg.glow;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking, pendingNeuron]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  const colorForType = (type: IanResponse['type'], sender: string): string => {
    if (sender === 'user') return '#e2e8f0';
    if (sender === 'system') return '#475569';
    switch (type) {
      case 'kill': return '#ef4444';
      case 'kos': return '#ef4444';
      case 'angry': return '#ef4444';
      case 'protection': return '#10b981';
      case 'thought': return '#f59e0b';
      case 'question': return '#f59e0b';
      case 'learned': return '#10b981';
      case 'neuron-added': return '#10b981';
      case 'neuron-rejected': return '#475569';
      case 'mood': return '#f59e0b';
      case 'recall': return accentMain;
      case 'wipe': return '#f59e0b';
      case 'system': return '#475569';
      default: return killMode ? '#ef4444' : accentMain;
    }
  };

  const prefixFor = (sender: string, type: IanResponse['type']) => {
    if (sender === 'user') return 'KASHI';
    if (sender === 'system') return 'SYS';
    if (type === 'thought') return 'IAN::THOUGHT';
    if (type === 'question') return 'IAN::ASKS';
    if (type === 'angry') return 'IAN::ANGRY';
    if (type === 'protection') return 'IAN::PROTECT';
    if (type === 'mood') return 'IAN::MOOD';
    if (type === 'recall') return 'IAN::RECALL';
    if (type === 'kos') return 'IAN::KOS';
    return 'IAN';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: accentMain }} />
          <span className="font-mono text-xs tracking-widest text-dim">CHAT INTERFACE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px]" style={{ color: killMode ? '#ef4444' : '#10b981' }}>
            {killMode ? 'KILL MODE' : 'ONLINE'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {messages.map((msg) => {
          const color = colorForType(msg.type, msg.sender);
          return (
            <div key={msg.id} className="animate-float-up">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] font-bold tracking-wider" style={{ color }}>
                  {prefixFor(msg.sender, msg.type)}
                </span>
                <span className="font-mono text-[9px] text-faint">
                  {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                </span>
              </div>
              <div className="font-mono text-sm mt-0.5 whitespace-pre-wrap" style={{ color, textShadow: msg.sender === 'ian' && !killMode ? `0 0 6px ${accentGlow}` : undefined }}>
                {msg.sender === 'user' && <span className="text-faint mr-1">{'>'}</span>}
                {msg.text}
              </div>
            </div>
          );
        })}

        {/* Thinking indicator */}
        {thinking && (
          <div className="animate-float-up">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] font-bold tracking-wider" style={{ color: accentMain }}>
                IAN
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: accentMain }} />
              <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: accentMain, animationDelay: '0.2s' }} />
              <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: accentMain, animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {/* Pending neuron approval */}
        {pendingNeuron && !thinking && (
          <div className="animate-float-up border border-amber/30 bg-amber/5 rounded p-3 mt-2">
            <div className="font-mono text-[10px] text-amber font-bold tracking-wider mb-1">IAN::ASKS</div>
            <div className="font-mono text-sm text-amber mb-3">
              Should I add a new neuron called '{pendingNeuron.topic}'?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onNeuronApprove(true)}
                className="font-mono text-xs px-3 py-1.5 border border-green-glow/40 text-green-glow hover:bg-green-glow/10 transition-colors rounded"
              >
                [Y] YES
              </button>
              <button
                onClick={() => onNeuronApprove(false)}
                className="font-mono text-xs px-3 py-1.5 border border-line text-dim hover:bg-panel-2 transition-colors rounded"
              >
                [N] NO
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-line p-3">
        <div className="flex items-center gap-2 bg-deep-2 border border-line rounded px-3 py-2 transition-colors focus-within:border-bright">
          <span className="font-mono text-sm" style={{ color: accentMain }}>{'>'}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Speak to IAN..."
            className="flex-1 bg-transparent outline-none font-mono text-sm text-slate-200 placeholder:text-faint"
            autoFocus
          />
          <button
            type="submit"
            className="font-mono text-xs px-3 py-1 rounded border transition-colors"
            style={{ borderColor: accentMain + '60', color: accentMain }}
          >
            SEND
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="font-mono text-[9px] text-faint">
            TRY: "switch user" · "settings" · "what is consciousness" · "how do you feel"
          </span>
          <span className="font-mono text-[9px] text-faint">
            {killMode ? 'say "stand down"' : 'say "the world needs fixing"'}
          </span>
        </div>
      </form>
    </div>
  );
}
