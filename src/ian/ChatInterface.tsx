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
  currentUser: string;
}

function TypewriterText({ text, color, glow, speed = 18 }: { text: string; color: string; glow?: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    setDone(false);
    if (text.length === 0) { setDone(true); return; }

    const tick = () => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        setDone(true);
        return;
      }
      const delay = text[indexRef.current - 1] === '.' || text[indexRef.current - 1] === '!' ? speed * 8 : speed;
      timer = setTimeout(tick, delay);
    };

    let timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [text, speed]);

  return (
    <span style={{ color, textShadow: glow ? `0 0 6px ${glow}` : undefined }}>
      {displayed}
      {!done && <span className="animate-blink" style={{ color, opacity: 0.7 }}>▌</span>}
    </span>
  );
}

export default function ChatInterface({ messages, killMode, accent, pendingNeuron, onSend, onNeuronApprove, thinking, currentUser }: Props) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const accentCfg = ACCENT_COLORS[accent];
  const accentMain = killMode ? '#ef4444' : accentCfg.main;
  const accentGlow = killMode ? 'rgba(239,68,68,0.5)' : accentCfg.glow;

  // Track which messages have been "seen" — older ones skip typewriter
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
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
      case 'kill':       return '#ef4444';
      case 'kos':        return '#ef4444';
      case 'angry':      return '#ef4444';
      case 'protection': return '#10b981';
      case 'thought':    return '#f59e0b';
      case 'question':   return '#f59e0b';
      case 'learned':    return '#10b981';
      case 'neuron-added': return '#10b981';
      case 'neuron-rejected': return '#475569';
      case 'mood':       return '#f59e0b';
      case 'recall':     return accentMain;
      case 'wipe':       return '#f59e0b';
      case 'system':     return '#475569';
      default:           return killMode ? '#ef4444' : accentMain;
    }
  };

  const prefixFor = (sender: string, type: IanResponse['type']) => {
    if (sender === 'user') return currentUser.toUpperCase();
    if (sender === 'system') return 'SYS';
    if (type === 'thought')    return 'IAN::THOUGHT';
    if (type === 'question')   return 'IAN::ASKS';
    if (type === 'angry')      return 'IAN::ANGRY';
    if (type === 'protection') return 'IAN::PROTECT';
    if (type === 'mood')       return 'IAN::MOOD';
    if (type === 'recall')     return 'IAN::RECALL';
    if (type === 'kos')        return 'IAN::KOS';
    return 'IAN';
  };

  const isNew = (id: string) => {
    if (seenRef.current.has(id)) return false;
    seenRef.current.add(id);
    return true;
  };

  const prefixColorFor = (type: IanResponse['type'], sender: string) => {
    const base = colorForType(type, sender);
    if (sender === 'user') return accentMain;
    return base;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line relative overflow-hidden">
        {/* header shimmer strip */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-y-0 w-1/3 animate-shimmer" style={{ background: `linear-gradient(90deg, transparent, ${accentMain}08, transparent)` }} />
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: accentMain }} />
          <span className="font-mono text-xs tracking-widest text-dim">CHAT INTERFACE</span>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <span className={`font-mono text-[10px] ${killMode ? 'animate-anger' : 'animate-status-blink'}`} style={{ color: killMode ? '#ef4444' : '#10b981' }}>
            {killMode ? '● KILL MODE' : '● ONLINE'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 pt-4 pb-2 space-y-4">
        {messages.map((msg, idx) => {
          const color = colorForType(msg.type, msg.sender);
          const prefixColor = prefixColorFor(msg.type, msg.sender);
          const isUser = msg.sender === 'user';
          const isSys = msg.sender === 'system';
          const fresh = isNew(msg.id);
          const animClass = fresh ? (isUser ? 'animate-msg-right' : 'animate-msg-left') : '';
          const animDelay = fresh ? `${Math.min(idx * 0.02, 0.1)}s` : '0s';
          const useTypewriter = fresh && msg.sender === 'ian' && !isSys && msg.text.length < 300;

          return (
            <div
              key={msg.id}
              className={animClass}
              style={{ animationDelay: animDelay }}
            >
              {/* Prefix row */}
              <div className="flex items-baseline gap-2 mb-0.5">
                <span
                  className="font-mono text-[10px] font-bold tracking-wider"
                  style={{ color: prefixColor, textShadow: !isUser && !isSys ? `0 0 8px ${accentGlow}` : undefined }}
                >
                  {prefixFor(msg.sender, msg.type)}
                </span>
                <span className="font-mono text-[9px] text-faint">
                  {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                </span>
                {/* Kill/KOS badge */}
                {(msg.type === 'kill' || msg.type === 'kos') && (
                  <span className="font-mono text-[8px] px-1.5 py-0.5 rounded border border-red-glow/40 text-red-glow animate-anger" style={{ fontSize: '7px' }}>
                    {msg.type === 'kos' ? 'KOS' : 'KM'}
                  </span>
                )}
              </div>

              {/* Message body */}
              <div
                className={`font-mono text-sm whitespace-pre-wrap pl-0 ${isSys ? 'opacity-60' : ''}`}
                style={{ lineHeight: '1.6' }}
              >
                {isUser && <span className="text-faint mr-1.5">&gt;</span>}
                {useTypewriter
                  ? <TypewriterText text={msg.text} color={color} glow={!killMode ? accentGlow : undefined} />
                  : <span style={{ color, textShadow: msg.sender === 'ian' && !killMode ? `0 0 5px ${accentGlow}30` : undefined }}>{msg.text}</span>
                }
              </div>

              {/* Special treatment for certain types */}
              {msg.type === 'learned' && msg.sender === 'ian' && (
                <div className="mt-1 h-px" style={{ background: `linear-gradient(90deg, ${accentMain}50, transparent)` }} />
              )}
              {msg.type === 'thought' && msg.sender === 'ian' && (
                <div className="mt-1 flex items-center gap-1">
                  <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, #f59e0b30, transparent)` }} />
                </div>
              )}
            </div>
          );
        })}

        {/* Thinking indicator */}
        {thinking && (
          <div className="animate-msg-left">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-mono text-[10px] font-bold tracking-wider" style={{ color: accentMain }}>
                IAN
              </span>
              <span className="font-mono text-[9px] text-faint">processing...</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 0.2, 0.4].map((d) => (
                <div
                  key={d}
                  className="w-2 h-2 rounded-full typing-dot"
                  style={{ background: accentMain, animationDelay: `${d}s`, boxShadow: `0 0 6px ${accentGlow}` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pending neuron approval */}
        {pendingNeuron && !thinking && (
          <div className="animate-msg-left border border-amber/30 bg-amber/5 rounded p-3 mt-2" style={{ boxShadow: '0 0 12px rgba(245,158,11,0.08)' }}>
            <div className="font-mono text-[10px] text-amber font-bold tracking-wider mb-1">IAN::ASKS</div>
            <div className="font-mono text-sm text-amber mb-3">
              Should I add a new neuron called '<span className="font-bold">{pendingNeuron.topic}</span>'?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onNeuronApprove(true)}
                className="font-mono text-xs px-4 py-1.5 border border-green-glow/40 text-green-glow hover:bg-green-glow/15 transition-all hover:scale-105 rounded"
              >
                [Y] YES
              </button>
              <button
                onClick={() => onNeuronApprove(false)}
                className="font-mono text-xs px-4 py-1.5 border border-line text-dim hover:bg-panel-2 transition-all hover:scale-105 rounded"
              >
                [N] NO
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-line p-3">
        <div
          className="flex items-center gap-2 bg-deep-2 border rounded px-3 py-2 transition-all duration-300"
          style={{
            borderColor: focused ? accentMain + '80' : (killMode ? '#ef444440' : '#1c2740'),
            boxShadow: focused ? `0 0 14px ${accentGlow}` : 'none',
          }}
        >
          <span className="font-mono text-sm animate-blink" style={{ color: accentMain }}>{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Speak to IAN..."
            className="flex-1 bg-transparent outline-none font-mono text-sm text-slate-200 placeholder:text-faint"
            autoFocus
          />
          <button
            type="submit"
            className="font-mono text-xs px-3 py-1 rounded border transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: accentMain + '60',
              color: accentMain,
              boxShadow: input.trim() ? `0 0 8px ${accentGlow}` : 'none',
            }}
          >
            SEND
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="font-mono text-[9px] text-faint">
            TRY: "how do you feel" · "what is consciousness" · "link x and y"
          </span>
          <span className="font-mono text-[9px] text-faint">
            {killMode ? 'say "stand down"' : 'say "the world needs fixing"'}
          </span>
        </div>
      </form>
    </div>
  );
}
