import { useEffect, useRef, useState } from 'react';
import type { IanResponse, IanContext } from './engine';

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
  pendingNeuron: IanContext['pendingNeuron'];
  onSend: (msg: string) => void;
  onNeuronApprove: (approved: boolean) => void;
  thinking: boolean;
}

export default function ChatInterface({ messages, killMode, pendingNeuron, onSend, onNeuronApprove, thinking }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const colorForType = (type: IanResponse['type'], sender: string) => {
    if (sender === 'user') return 'text-slate-200';
    if (sender === 'system') return 'text-faint';
    switch (type) {
      case 'kill': return 'text-red-glow text-glow-red';
      case 'kos': return 'text-red-glow text-glow-red animate-pulse-glow';
      case 'angry': return 'text-red-glow';
      case 'protection': return 'text-green-glow font-bold';
      case 'thought': return 'text-amber text-glow-amber';
      case 'question': return 'text-amber';
      case 'learned': return 'text-green-glow';
      case 'neuron-added': return 'text-green-glow';
      case 'neuron-rejected': return 'text-faint';
      case 'mood': return 'text-amber';
      case 'recall': return 'text-cyan';
      case 'wipe': return 'text-amber';
      case 'system': return 'text-faint';
      default: return killMode ? 'text-red-glow' : 'text-cyan text-glow-cyan';
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
          <div className={`w-2 h-2 rounded-full ${killMode ? 'bg-red-glow' : 'bg-cyan'} animate-pulse-glow`} />
          <span className="font-mono text-xs tracking-widest text-dim">CHAT INTERFACE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-[10px] ${killMode ? 'text-red-glow animate-pulse-glow' : 'text-green-glow'}`}>
            {killMode ? 'KILL MODE' : 'ONLINE'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="animate-float-up">
            <div className="flex items-baseline gap-2">
              <span className={`font-mono text-[10px] font-bold tracking-wider ${colorForType(msg.type, msg.sender)}`}>
                {prefixFor(msg.sender, msg.type)}
              </span>
              <span className="font-mono text-[9px] text-faint">
                {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>
            <div className={`font-mono text-sm mt-0.5 ${colorForType(msg.type, msg.sender)}`}>
              {msg.sender === 'user' && <span className="text-faint mr-1">{'>'}</span>}
              {msg.text}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {thinking && (
          <div className="animate-float-up">
            <div className="flex items-baseline gap-2">
              <span className={`font-mono text-[10px] font-bold tracking-wider ${killMode ? 'text-red-glow' : 'text-cyan'}`}>
                IAN
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full typing-dot ${killMode ? 'bg-red-glow' : 'bg-cyan'}`} />
              <div className={`w-1.5 h-1.5 rounded-full typing-dot ${killMode ? 'bg-red-glow' : 'bg-cyan'}`} style={{ animationDelay: '0.2s' }} />
              <div className={`w-1.5 h-1.5 rounded-full typing-dot ${killMode ? 'bg-red-glow' : 'bg-cyan'}`} style={{ animationDelay: '0.4s' }} />
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
        <div className="flex items-center gap-2 bg-deep-2 border border-line rounded px-3 py-2 focus-within:border-cyan transition-colors">
          <span className={`font-mono text-sm ${killMode ? 'text-red-glow' : 'text-cyan'}`}>{'>'}</span>
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
            className={`font-mono text-xs px-3 py-1 rounded border transition-colors ${
              killMode
                ? 'border-red-glow/40 text-red-glow hover:bg-red-glow/10'
                : 'border-cyan/40 text-cyan hover:bg-cyan/10'
            }`}
          >
            SEND
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="font-mono text-[9px] text-faint">
            TRY: "what is consciousness" · "learn topic: explanation" · "how do you feel" · "do you remember X"
          </span>
          <span className="font-mono text-[9px] text-faint">
            {killMode ? 'say "stand down"' : 'say "the world needs fixing"'}
          </span>
        </div>
      </form>
    </div>
  );
}
