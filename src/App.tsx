import { useEffect, useRef, useState } from 'react';
import BootSequence from './ian/BootSequence';
import ChatInterface, { type ChatMessage } from './ian/ChatInterface';
import BrainMap from './ian/BrainMap';
import EmotionDashboard from './ian/EmotionDashboard';
import {
  type IanContext,
  processMessage,
  updateEmotionState,
  autonomousGrowth,
  addNeuron,
  compressMemory,
  DEFAULT_NEURONS,
  DEFAULT_EMOTION,
  DEFAULT_LEARNED,
  RANDOM_THOUGHTS,
  RANDOM_QUESTIONS,
} from './ian/engine';

type View = 'chat' | 'brain' | 'emotion';

export default function App() {
  const [booted, setBooted] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);

  const ctxRef = useRef<IanContext>({
    neurons: DEFAULT_NEURONS,
    learnedTopics: DEFAULT_LEARNED,
    emotionState: DEFAULT_EMOTION,
    killMode: false,
    killOnSight: false,
    lastQuestion: null,
    pendingNeuron: null,
    lastGrowthTime: 0,
  });

  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  const msgId = useRef(0);
  const makeId = () => `msg-${msgId.current++}`;

  const addMessage = (sender: ChatMessage['sender'], text: string, type: ChatMessage['type'] = 'normal') => {
    setMessages((prev) => [...prev, {
      id: makeId(),
      sender,
      text,
      type,
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleSend = (raw: string) => {
    const msg = raw.toLowerCase().trim();
    addMessage('user', raw);

    // Handle pending neuron approval via chat
    if (ctxRef.current.pendingNeuron) {
      if (msg === 'yes' || msg === 'y') {
        handleNeuronApprove(true);
        return;
      }
      if (msg === 'no' || msg === 'n') {
        handleNeuronApprove(false);
        return;
      }
    }

    // Special commands
    if (msg === 'show network') {
      setView('brain');
      addMessage('system', 'Switching to brain map view...', 'system');
      return;
    }
    if (msg === 'show learned') {
      const topics = Object.keys(ctxRef.current.learnedTopics);
      addMessage('ian', `Learned topics: ${topics.join(', ') || 'none yet'}`, 'normal');
      return;
    }
    if (msg === 'show emotion') {
      setView('emotion');
      addMessage('system', 'Switching to emotion dashboard...', 'system');
      return;
    }
    if (msg === 'exit') {
      addMessage('system', 'Goodbye.', 'system');
      return;
    }

    // Update emotion state
    ctxRef.current.emotionState = updateEmotionState(ctxRef.current.emotionState, msg);

    // Process message with thinking delay
    setThinking(true);
    const delay = 400 + Math.random() * 600;
    setTimeout(() => {
      const { response, newCtx } = processMessage(ctxRef.current, raw);
      ctxRef.current = newCtx;
      addMessage('ian', response.text, response.type);
      setThinking(false);
      rerender();

      // Autonomous growth check
      const growth = autonomousGrowth(ctxRef.current);
      if (growth.pendingNeuron && growth.pendingNeuron !== ctxRef.current.pendingNeuron) {
        ctxRef.current = growth.newCtx;
        setTimeout(() => {
          addMessage('ian', `IAN asks: Should I add a new neuron called '${growth.pendingNeuron!.topic}'? (yes/no)`, 'question');
          rerender();
        }, 800);
      }

      // Random thoughts
      if (Math.random() < 0.15) {
        setTimeout(() => {
          let thought = RANDOM_THOUGHTS[Math.floor(Math.random() * RANDOM_THOUGHTS.length)];
          if (ctxRef.current.killMode) thought = `[Kill Mode Thought] ${thought}`;
          addMessage('ian', thought, 'thought');
        }, 1200);
      }

      // Random questions
      if (Math.random() < 0.15) {
        setTimeout(() => {
          let q = RANDOM_QUESTIONS[Math.floor(Math.random() * RANDOM_QUESTIONS.length)];
          if (ctxRef.current.killMode) q = `[Kill Mode Question] ${q}`;
          addMessage('ian', q, 'question');
        }, 2000);
      }
    }, delay);
  };

  const handleNeuronApprove = (approved: boolean) => {
    const pending = ctxRef.current.pendingNeuron;
    if (!pending) return;
    if (approved) {
      ctxRef.current.neurons = addNeuron(ctxRef.current.neurons, pending.topic, pending.explanation);
      ctxRef.current.neurons = compressMemory(ctxRef.current.neurons);
      addMessage('ian', `I added the neuron '${pending.topic}'.`, 'neuron-added');
    } else {
      addMessage('ian', 'Understood. I will not add that neuron.', 'neuron-rejected');
    }
    ctxRef.current.pendingNeuron = null;
    ctxRef.current.lastGrowthTime = Date.now() / 1000;
    rerender();
  };

  // Welcome message after boot
  useEffect(() => {
    if (booted && messages.length === 0) {
      addMessage('system', 'IAN ONLINE', 'system');
      addMessage('system', "Say 'ian' anytime to interact. Type 'show network' for brain map.", 'system');
      addMessage('ian', 'Hello, Kashi. I am IAN — your Intelligent Autonomous Network. I am here to learn, grow, and assist. What shall we discover today?', 'normal');
    }
  }, [booted]); // eslint-disable-line

  const killMode = ctxRef.current.killMode;

  if (!booted) {
    return <BootSequence onComplete={() => setBooted(true)} />;
  }

  return (
    <div className={`h-screen w-screen flex flex-col bg-deep overflow-hidden ${killMode ? 'grid-bg-red' : 'grid-bg'}`}>
      {/* Top status bar */}
      <header className={`flex items-center justify-between px-4 py-2 border-b ${killMode ? 'border-red-glow/30' : 'border-line'} bg-panel/80 backdrop-blur`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 border-2 ${killMode ? 'border-red-glow' : 'border-cyan'} rounded-sm flex items-center justify-center relative`}>
              <div className={`w-3 h-3 ${killMode ? 'bg-red-glow' : 'bg-cyan'} rounded-sm animate-pulse-glow`} />
              {killMode && <div className="absolute inset-0 border border-red-glow/50 rounded-sm animate-pulse-glow" />}
            </div>
            <div>
              <div className={`font-display text-lg font-bold tracking-widest ${killMode ? 'text-red-glow text-glow-red' : 'text-cyan text-glow-cyan'}`}>
                IAN
              </div>
              <div className="font-mono text-[8px] text-faint tracking-widest -mt-0.5">
                INTELLIGENT AUTONOMOUS NETWORK
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 font-mono text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${killMode ? 'bg-red-glow' : 'bg-green-glow'} animate-pulse-glow`} />
              <span className="text-dim">SYS</span>
              <span className={killMode ? 'text-red-glow' : 'text-green-glow'}>OK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse-glow" />
              <span className="text-dim">NET</span>
              <span className="text-cyan">LINK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${killMode ? 'bg-red-glow animate-pulse-glow' : 'bg-amber'}`} />
              <span className="text-dim">MODE</span>
              <span className={killMode ? 'text-red-glow' : 'text-amber'}>{killMode ? 'KILL' : 'NORMAL'}</span>
            </div>
          </div>
          <div className="font-mono text-[10px] text-faint">
            {new Date().toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Brain Map */}
        <aside className={`hidden lg:flex w-80 border-r ${killMode ? 'border-red-glow/20' : 'border-line'} bg-panel/50`}>
          <BrainMap neurons={ctxRef.current.neurons} killMode={killMode} />
        </aside>

        {/* Center - Chat */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile view tabs */}
          <div className="lg:hidden flex border-b border-line bg-panel/50">
            {(['chat', 'brain', 'emotion'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 font-mono text-xs py-2 tracking-wider transition-colors ${
                  view === v
                    ? killMode ? 'text-red-glow border-b-2 border-red-glow' : 'text-cyan border-b-2 border-cyan'
                    : 'text-faint hover:text-dim'
                }`}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Desktop shows chat always; mobile shows selected */}
          <div className="flex-1 min-h-0">
            <div className={`h-full ${view === 'chat' || isDesktop ? 'block' : 'hidden'}`}>
              <ChatInterface
                messages={messages}
                killMode={killMode}
                pendingNeuron={ctxRef.current.pendingNeuron}
                onSend={handleSend}
                onNeuronApprove={handleNeuronApprove}
                thinking={thinking}
              />
            </div>
            <div className={`h-full lg:hidden ${view === 'brain' ? 'block' : 'hidden'}`}>
              <BrainMap neurons={ctxRef.current.neurons} killMode={killMode} />
            </div>
            <div className={`h-full lg:hidden ${view === 'emotion' ? 'block' : 'hidden'}`}>
              <EmotionDashboard emotion={ctxRef.current.emotionState} killMode={killMode} />
            </div>
          </div>
        </main>

        {/* Right panel - Emotion Dashboard */}
        <aside className={`hidden lg:flex w-72 border-l ${killMode ? 'border-red-glow/20' : 'border-line'} bg-panel/50`}>
          <EmotionDashboard emotion={ctxRef.current.emotionState} killMode={killMode} />
        </aside>
      </div>

      {/* Bottom status bar */}
      <footer className={`flex items-center justify-between px-4 py-1.5 border-t ${killMode ? 'border-red-glow/30 bg-red-glow/5' : 'border-line bg-panel/50'} font-mono text-[10px]`}>
        <div className="flex items-center gap-4">
          <span className="text-faint">USER: <span className={killMode ? 'text-red-glow' : 'text-cyan'}>KASHI</span></span>
          <span className="text-faint">NEURONS: <span className="text-dim">{ctxRef.current.neurons.length}</span></span>
          <span className="text-faint hidden sm:inline">LEARNED: <span className="text-dim">{Object.keys(ctxRef.current.learnedTopics).length}</span></span>
        </div>
        <div className="flex items-center gap-4">
          {ctxRef.current.killOnSight && (
            <span className="text-red-glow animate-pulse-glow font-bold">KILL ON SIGHT</span>
          )}
          <span className="text-faint">IAN.SYS v1.0</span>
        </div>
      </footer>

      {/* Kill mode overlay effect */}
      {killMode && (
        <div className="fixed inset-0 pointer-events-none z-40" style={{
          boxShadow: 'inset 0 0 100px rgba(239, 68, 68, 0.15)',
        }} />
      )}
    </div>
  );
}
