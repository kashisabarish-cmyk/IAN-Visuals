import { useEffect, useRef, useState } from 'react';
import { Users, Settings, Terminal } from 'lucide-react';
import BootSequence from './ian/BootSequence';
import ChatInterface, { type ChatMessage } from './ian/ChatInterface';
import BrainMap from './ian/BrainMap';
import EmotionDashboard from './ian/EmotionDashboard';
import UserSwitcher from './ian/UserSwitcher';
import SettingsPanel from './ian/SettingsPanel';
import DevDataPanel from './ian/DevDataPanel';
import PasswordPrompt from './ian/PasswordPrompt';
import {
  type IanContext,
  type MemoryEntry,
  type AccentColor,
  processMessage,
  updateEmotionState,
  autonomousGrowth,
  addNeuron,
  compressMemory,
  maybeRecallSomething,
  createUser,
  switchUser,
  bumpMessageStats,
  formatUserStats,
  manualCombineNeurons,
  ACCENT_COLORS,
  KASHI_PASSWORD,
  DEV_PASSWORD,
  PROTECTED_USERS,
  DEFAULT_NEURONS,
  DEFAULT_EMOTION,
  DEFAULT_LEARNED,
  DEFAULT_USERS,
  RANDOM_THOUGHTS_NEUTRAL,
  RANDOM_THOUGHTS_ANGRY,
  RANDOM_THOUGHTS_HAPPY,
  RANDOM_QUESTIONS,
} from './ian/engine';

type View = 'chat' | 'brain' | 'emotion';

function LiveClock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{time}</>;
}

export default function App() {
  const [booted, setBooted] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState<null | 'conversation' | 'all'>(null);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [accent, setAccent] = useState<AccentColor>('cyan');
  const [passwordPrompt, setPasswordPrompt] = useState<{ username: string; isDev: boolean } | null>(null);
  const [showDevData, setShowDevData] = useState(false);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const ctxRef = useRef<IanContext>({
    neurons: DEFAULT_NEURONS,
    learnedTopics: DEFAULT_LEARNED,
    emotionState: DEFAULT_EMOTION,
    killMode: false,
    killOnSight: false,
    lastQuestion: null,
    pendingNeuron: null,
    lastGrowthTime: 0,
    contextBuffer: [],
    memoryTimeline: [],
    currentUser: 'User',
    users: DEFAULT_USERS,
    devMode: false,
  });

  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  useEffect(() => {
    const u = ctxRef.current.currentUser;
    const profile = ctxRef.current.users[u];
    if (profile) {
      const now = new Date().toISOString();
      ctxRef.current.users = {
        ...ctxRef.current.users,
        [u]: { ...profile, session_count: profile.session_count + 1, last_seen: now },
      };
      rerender();
    }
  }, []);

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

  const addToContext = (user: string, ian: string) => {
    ctxRef.current.contextBuffer = [...ctxRef.current.contextBuffer, { user, ian }];
    if (ctxRef.current.contextBuffer.length > 10) {
      ctxRef.current.contextBuffer = ctxRef.current.contextBuffer.slice(-10);
    }
  };

  const logMemory = (user: string, message: string, response: string) => {
    const entry: MemoryEntry = {
      timestamp: new Date().toISOString(),
      user,
      message,
      response,
    };
    ctxRef.current.memoryTimeline = [...ctxRef.current.memoryTimeline, entry];
  };

  const doSwitchUser = (username: string) => {
    if (username === ctxRef.current.currentUser) {
      setShowUserSwitcher(false);
      return;
    }
    ctxRef.current = switchUser(ctxRef.current, username);
    addMessage('system', `Switched to user: ${username}`, 'system');
    addMessage('ian', `Hello, ${username}. I am IAN. Welcome.`, 'normal');
    setShowUserSwitcher(false);
    rerender();
  };

  const handleSwitchUser = (username: string) => {
    if (PROTECTED_USERS.includes(username) && username !== ctxRef.current.currentUser) {
      setPasswordPrompt({ username, isDev: false });
      return;
    }
    doSwitchUser(username);
  };

  const handleCreateUser = (username: string) => {
    ctxRef.current.users = createUser(ctxRef.current.users, username);
    ctxRef.current = switchUser(ctxRef.current, username);
    addMessage('system', `New user profile created: ${username}`, 'system');
    addMessage('ian', `Hello, ${username}. I am IAN — your Intelligent Autonomous Network. I'm here to learn and grow with you.`, 'normal');
    setShowUserSwitcher(false);
    rerender();
  };

  const handlePasswordSubmit = (password: string) => {
    if (!passwordPrompt) return;
    if (passwordPrompt.isDev) {
      if (password === DEV_PASSWORD) {
        ctxRef.current.devMode = true;
        addMessage('system', 'DEV MODE ACTIVATED', 'system');
        addMessage('ian', 'Developer mode enabled. All restrictions lifted.', 'system');
        setPasswordPrompt(null);
        rerender();
      } else {
        addMessage('system', 'ACCESS DENIED — incorrect dev password', 'system');
        setPasswordPrompt(null);
      }
      return;
    }
    if (password === KASHI_PASSWORD) {
      doSwitchUser(passwordPrompt.username);
      setPasswordPrompt(null);
    } else {
      addMessage('system', 'ACCESS DENIED — incorrect password', 'system');
      setPasswordPrompt(null);
    }
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

    // Handle wipe confirmation
    if (confirmWipe) {
      if (msg === 'yes' || msg === 'y') {
        if (confirmWipe === 'conversation') {
          ctxRef.current.memoryTimeline = [];
          ctxRef.current.contextBuffer = [];
          addMessage('ian', 'Conversation memory wiped. I still know who you are.', 'wipe');
        } else {
          ctxRef.current.neurons = [];
          ctxRef.current.memoryTimeline = [];
          ctxRef.current.contextBuffer = [];
          addMessage('ian', 'Full memory wipe complete. I remember you. Everything else is gone.', 'wipe');
        }
        setConfirmWipe(null);
        rerender();
        return;
      }
      if (msg === 'no' || msg === 'n') {
        addMessage('ian', 'Memory wipe cancelled.', 'system');
        setConfirmWipe(null);
        return;
      }
    }

    // Switch user command
    if (msg === 'switch user') {
      setShowUserSwitcher(true);
      return;
    }
    if (msg.startsWith('switch user ')) {
      const targetName = raw.slice(12).trim();
      if (targetName in ctxRef.current.users) {
        handleSwitchUser(targetName);
      } else {
        ctxRef.current.users = createUser(ctxRef.current.users, targetName);
        handleCreateUser(targetName);
      }
      return;
    }

    // Dev mode command
    if (msg === 'dev mode' || msg === 'devmode') {
      setPasswordPrompt({ username: '', isDev: true });
      return;
    }
    if (msg.startsWith('dev mode ') || msg.startsWith('devmode ')) {
      const pw = raw.split(' ').slice(2).join(' ').trim();
      if (pw === DEV_PASSWORD) {
        ctxRef.current.devMode = true;
        addMessage('system', 'DEV MODE ACTIVATED', 'system');
        addMessage('ian', 'Developer mode enabled. All restrictions lifted.', 'system');
        rerender();
      } else {
        addMessage('system', 'ACCESS DENIED — incorrect dev password', 'system');
      }
      return;
    }

    // Dev data editor command
    if (msg === 'dev data' || msg === 'edit data') {
      if (!ctxRef.current.devMode) {
        addMessage('system', 'ACCESS DENIED — dev mode required. Type "dev mode" to authenticate.', 'system');
      } else {
        setShowDevData(true);
      }
      return;
    }

    // Settings command
    if (msg === 'settings' || msg === 'change color' || msg === 'change accent') {
      setShowSettings(true);
      return;
    }
    if (msg.startsWith('set color ') || msg.startsWith('set accent ')) {
      const colorName = msg.split(' ').slice(-1)[0] as AccentColor;
      if (colorName in ACCENT_COLORS) {
        setAccent(colorName);
        addMessage('system', `Accent color changed to ${ACCENT_COLORS[colorName].name}.`, 'system');
      } else {
        addMessage('ian', `Available colors: ${Object.keys(ACCENT_COLORS).join(', ')}`, 'system');
      }
      return;
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
    if (msg === 'stats' || msg === 'my stats') {
      const profile = ctxRef.current.users[ctxRef.current.currentUser];
      if (profile) {
        addMessage('ian', formatUserStats(profile), 'system');
      }
      return;
    }
    if (msg === 'show emotion') {
      setView('emotion');
      addMessage('system', 'Switching to emotion dashboard...', 'system');
      return;
    }
    if (msg === 'show context' || msg === 'recent conversation' || msg === 'what did we talk about') {
      if (ctxRef.current.contextBuffer.length === 0) {
        addMessage('ian', "We haven't talked much yet.", 'recall');
      } else {
        const recent = ctxRef.current.contextBuffer.slice(-3);
        const lines = recent.map((e) => `You: ${e.user} | IAN: ${e.ian}`);
        addMessage('ian', `Here's what we discussed recently:\n${lines.join('\n')}`, 'recall');
      }
      return;
    }
    if (msg === 'wipe conversation') {
      setConfirmWipe('conversation');
      addMessage('ian', 'Are you sure? I\'ll forget our conversation but remember you. (yes/no)', 'wipe');
      return;
    }
    if (msg === 'wipe all memory') {
      setConfirmWipe('all');
      addMessage('ian', 'This will wipe everything except your profile. Are you sure? (yes/no)', 'wipe');
      return;
    }
    if (msg.startsWith('combine ')) {
      const parts = raw.slice(8).split(' and ');
      if (parts.length === 2) {
        const { result, neurons: updated } = manualCombineNeurons(ctxRef.current.neurons, parts[0].trim(), parts[1].trim());
        ctxRef.current.neurons = updated;
        addMessage('ian', result, 'normal');
      } else {
        addMessage('ian', 'Usage: combine <topic1> and <topic2>', 'normal');
      }
      return;
    }
    if (msg.startsWith('link ')) {
      const parts = raw.slice(5).split(' and ');
      if (parts.length === 2) {
        const t1 = parts[0].trim().toLowerCase();
        const t2 = parts[1].trim().toLowerCase();
        const neurons = ctxRef.current.neurons;
        const n1 = neurons.find((n) => n.topic === t1);
        const n2 = neurons.find((n) => n.topic === t2);
        if (!n1) { addMessage('ian', `I don't know '${t1}' yet.`, 'normal'); return; }
        if (!n2) { addMessage('ian', `I don't know '${t2}' yet.`, 'normal'); return; }
        if (!n1.connections.includes(t2)) n1.connections.push(t2);
        if (!n2.connections.includes(t1)) n2.connections.push(t1);
        ctxRef.current.neurons = [...neurons];
        addMessage('ian', `Linked '${t1}' and '${t2}'. They are now connected.`, 'normal');
        rerender();
      } else {
        addMessage('ian', 'Usage: link <topic1> and <topic2>', 'normal');
      }
      return;
    }
    if (msg === 'stark systems') {
      addMessage('system', '---STARK SYSTEMS CHECK...', 'system');
      setTimeout(() => addMessage('system', '---ALL SYSTEMS GO', 'system'), 800);
      return;
    }
    if (msg === 'exit') {
      addMessage('system', 'Goodbye. I\'ll remember everything.', 'system');
      return;
    }

    // Update emotion state
    ctxRef.current.emotionState = updateEmotionState(ctxRef.current.emotionState, raw);

    // Process message with thinking delay
    setThinking(true);
    const delay = 400 + Math.random() * 600;
    setTimeout(() => {
      const { response, newCtx } = processMessage(ctxRef.current, raw);
      ctxRef.current = bumpMessageStats(newCtx);
      addMessage('ian', response.text, response.type);
      logMemory(ctxRef.current.currentUser, raw, response.text);
      addToContext(raw, response.text);
      setThinking(false);
      rerender();

      // Autonomous growth check
      const growth = autonomousGrowth(ctxRef.current);
      if (growth.pendingNeuron && growth.pendingNeuron !== ctxRef.current.pendingNeuron) {
        ctxRef.current = growth.newCtx;
        setTimeout(() => {
          addMessage('ian', `IAN asks: Should I add a new concept called '${growth.pendingNeuron!.topic}'? (yes/no)`, 'question');
          rerender();
        }, 800);
      }

      // Proactive recall
      const recall = maybeRecallSomething(ctxRef.current);
      if (recall) {
        setTimeout(() => {
          addMessage('ian', recall, 'recall');
        }, 1000);
      }

      // Random thoughts (mood-aware)
      if (Math.random() < 0.12) {
        const mood = ctxRef.current.emotionState.mood;
        let pool = RANDOM_THOUGHTS_NEUTRAL;
        if (mood === 'angry') pool = RANDOM_THOUGHTS_ANGRY;
        else if (mood === 'happy') pool = RANDOM_THOUGHTS_HAPPY;
        let thought = pool[Math.floor(Math.random() * pool.length)];
        if (ctxRef.current.killMode) thought = `[Kill Mode Thought] ${thought}`;
        setTimeout(() => {
          addMessage('ian', thought, 'thought');
        }, 1200);
      }

      // Curiosity questions
      if (ctxRef.current.emotionState.curiosity > 0.6 && Math.random() < 0.12 && ctxRef.current.emotionState.mood !== 'angry') {
        let q = RANDOM_QUESTIONS[Math.floor(Math.random() * RANDOM_QUESTIONS.length)];
        if (ctxRef.current.killMode) q = `[Kill Mode Question] ${q}`;
        setTimeout(() => {
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
      addMessage('ian', `Added concept '${pending.topic}'.`, 'neuron-added');
    } else {
      addMessage('ian', "Understood. I won't add that concept.", 'neuron-rejected');
    }
    ctxRef.current.pendingNeuron = null;
    ctxRef.current.lastGrowthTime = Date.now() / 1000;
    rerender();
  };

  // Welcome message after boot
  useEffect(() => {
    if (booted && messages.length === 0) {
      addMessage('system', 'IAN ONLINE', 'system');
      addMessage('system', "Commands: 'switch user', 'settings', 'dev mode', 'show network', 'show context', 'wipe conversation', 'exit'", 'system');
      addMessage('ian', `Hello, ${ctxRef.current.currentUser}. I am IAN — your Intelligent Autonomous Network. I am here to learn, grow, and assist. What shall we discover today?`, 'normal');
    }
  }, [booted]); // eslint-disable-line

  const killMode = ctxRef.current.killMode;
  const mood = ctxRef.current.emotionState.mood;
  const accentCfg = ACCENT_COLORS[accent];
  const accentMain = killMode ? '#ef4444' : accentCfg.main;
  const accentGlow = killMode ? 'rgba(239,68,68,0.5)' : accentCfg.glow;
  const accentDim = killMode ? '#991b1b' : accentCfg.dim;

  if (!booted) {
    return <BootSequence onComplete={() => setBooted(true)} />;
  }

  return (
    <div className={`h-screen w-screen flex flex-col bg-deep overflow-hidden ${killMode ? 'grid-bg-red' : 'grid-bg'} relative`}>
      {/* Kill mode scan line */}
      {killMode && (
        <div className="fixed inset-x-0 top-0 z-30 pointer-events-none h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #ef4444, transparent)', animation: 'scan 2s linear infinite', opacity: 0.6 }} />
      )}

      {/* Top status bar */}
      <header className={`flex items-center justify-between px-4 py-2 border-b ${killMode ? 'border-red-glow/30' : 'border-line'} bg-panel/80 backdrop-blur relative overflow-hidden`}>
        {/* Header shimmer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-y-0 left-0 right-0 animate-shimmer" style={{ background: `linear-gradient(90deg, transparent, ${accentMain}06, transparent)`, backgroundSize: '200% auto' }} />
        </div>
        <div className="flex items-center gap-3">
          {/* User switcher button */}
          <button
            onClick={() => setShowUserSwitcher(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded border transition-all hover:bg-panel-2"
            style={{ borderColor: accentMain + '40' }}
            title="Switch user"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold"
              style={{ background: accentMain + '20', color: accentMain }}
            >
              {ctxRef.current.currentUser.charAt(0).toUpperCase()}
            </div>
            <span className="font-mono text-xs text-slate-200 hidden sm:inline">{ctxRef.current.currentUser}</span>
            <Users size={14} style={{ color: accentMain }} />
          </button>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded border transition-all hover:bg-panel-2"
            style={{ borderColor: accentMain + '30' }}
            title="Settings"
          >
            <Settings size={14} style={{ color: accentMain }} />
          </button>

          {/* Dev data button — only in dev mode */}
          {ctxRef.current.devMode && (
            <button
              onClick={() => setShowDevData(true)}
              className="p-1.5 rounded border border-amber/40 transition-all hover:bg-amber/10 animate-pulse-glow"
              title="Dev Data Editor"
            >
              <Terminal size={14} className="text-amber" />
            </button>
          )}
          {/* IAN logo */}
          <div className="flex items-center gap-2 ml-2">
            <div className={`w-8 h-8 border-2 rounded-sm flex items-center justify-center relative`} style={{ borderColor: accentMain, boxShadow: `0 0 10px ${accentGlow}` }}>
              <div className={`w-3 h-3 rounded-sm animate-core-pulse`} style={{ background: accentMain, color: accentMain }} />
              {(killMode || mood === 'angry') && <div className="absolute inset-0 border rounded-sm animate-anger" style={{ borderColor: '#ef444450' }} />}
            </div>
            <div>
              <div className={`font-display text-lg font-bold tracking-widest ${killMode ? 'animate-glitch' : ''}`} style={{ color: accentMain, textShadow: `0 0 14px ${accentGlow}` }}>
                IAN
              </div>
              <div className="font-mono text-[8px] text-faint tracking-widest -mt-0.5">
                INTELLIGENT AUTONOMOUS NETWORK{ctxRef.current.devMode ? ' :: DEV' : ''}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 font-mono text-[10px]">
            <div className="flex items-center gap-1.5 animate-status-blink">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse-glow`} style={{ background: killMode ? '#ef4444' : '#10b981' }} />
              <span className="text-dim">SYS</span>
              <span style={{ color: killMode ? '#ef4444' : '#10b981' }}>OK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: accentMain, boxShadow: `0 0 4px ${accentGlow}` }} />
              <span className="text-dim">NET</span>
              <span style={{ color: accentMain }}>LINK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${mood === 'angry' || killMode ? 'animate-anger' : 'animate-pulse-glow'}`} style={{ background: mood === 'angry' ? '#ef4444' : killMode ? '#ef4444' : '#f59e0b' }} />
              <span className="text-dim">MOOD</span>
              <span className={mood === 'angry' || killMode ? 'animate-glitch' : ''} style={{ color: mood === 'angry' ? '#ef4444' : killMode ? '#ef4444' : '#f59e0b' }}>
                {mood.toUpperCase()}{killMode ? ' / KILL' : ''}
              </span>
            </div>
          </div>
          <div className="font-mono text-[10px] text-faint tabular-nums animate-fade-in">
            <LiveClock />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Brain Map */}
        <aside className={`hidden lg:flex w-80 border-r ${killMode ? 'border-red-glow/20' : 'border-line'} bg-panel/50 animate-slide-right`} style={{ animationDuration: '0.4s' }}>
          <BrainMap neurons={ctxRef.current.neurons} killMode={killMode || mood === 'angry'} accentColor={accentMain} accentDim={accentDim} accentGlow={accentGlow} />
        </aside>

        {/* Center - Chat */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile view tabs */}
          <div className="lg:hidden flex border-b border-line bg-panel/50">
            {(['chat', 'brain', 'emotion'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="flex-1 font-mono text-xs py-2 tracking-wider transition-colors"
                style={{
                  color: view === v ? accentMain : '#475569',
                  borderBottom: view === v ? `2px solid ${accentMain}` : 'none',
                }}
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
                accent={accent}
                pendingNeuron={ctxRef.current.pendingNeuron}
                onSend={handleSend}
                onNeuronApprove={handleNeuronApprove}
                thinking={thinking}
                currentUser={ctxRef.current.currentUser}
              />
            </div>
            <div className={`h-full lg:hidden ${view === 'brain' ? 'block' : 'hidden'}`}>
              <BrainMap neurons={ctxRef.current.neurons} killMode={killMode || mood === 'angry'} accentColor={accentMain} accentDim={accentDim} accentGlow={accentGlow} />
            </div>
            <div className={`h-full lg:hidden ${view === 'emotion' ? 'block' : 'hidden'}`}>
              <EmotionDashboard emotion={ctxRef.current.emotionState} killMode={killMode} accent={accent} userName={ctxRef.current.currentUser} />
            </div>
          </div>
        </main>

        {/* Right panel - Emotion Dashboard */}
        <aside className={`hidden lg:flex w-72 border-l ${killMode ? 'border-red-glow/20' : 'border-line'} bg-panel/50 animate-slide-left`} style={{ animationDuration: '0.4s' }}>
          <EmotionDashboard emotion={ctxRef.current.emotionState} killMode={killMode} accent={accent} userName={ctxRef.current.currentUser} />
        </aside>
      </div>

      {/* Bottom status bar */}
      <footer className={`flex items-center justify-between px-4 py-1.5 border-t ${killMode ? 'border-red-glow/30 bg-red-glow/5' : 'border-line bg-panel/50'} font-mono text-[10px] relative overflow-hidden`}>
        {/* Footer data stream */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-y-0 w-20 animate-shimmer" style={{ background: `linear-gradient(90deg, transparent, ${accentMain}04, transparent)`, backgroundSize: '200% auto' }} />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-faint">USER: <span style={{ color: accentMain }}>{ctxRef.current.currentUser}</span></span>
          <span className="text-faint">NEURONS: <span className="text-dim">{ctxRef.current.neurons.length}</span></span>
          <span className="text-faint hidden sm:inline">LEARNED: <span className="text-dim">{Object.keys(ctxRef.current.learnedTopics).length}</span></span>
          <span className="text-faint hidden sm:inline">CTX: <span className="text-dim">{ctxRef.current.contextBuffer.length}/10</span></span>
        </div>
        <div className="flex items-center gap-4">
          {ctxRef.current.killOnSight && (
            <span className="text-red-glow animate-pulse-glow font-bold">KILL ON SIGHT</span>
          )}
          {ctxRef.current.devMode && (
            <span className="text-amber font-bold animate-pulse-glow">DEV MODE</span>
          )}
          {mood === 'angry' && (
            <span className="text-red-glow font-bold">ANGER {ctxRef.current.emotionState.anger_level}/10</span>
          )}
          <span className="text-faint">IAN.SYS v2.0</span>
        </div>
      </footer>

      {/* Kill mode overlay effect */}
      {killMode && (
        <div className="fixed inset-0 pointer-events-none z-40" style={{ boxShadow: 'inset 0 0 120px rgba(239,68,68,0.18), inset 0 0 40px rgba(239,68,68,0.08)' }}>
          {/* Corner danger markers */}
          {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} font-mono text-[9px] font-bold text-red-glow animate-anger`} style={{ animationDelay: `${i * 0.15}s` }}>⚠</div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showUserSwitcher && !passwordPrompt && (
        <UserSwitcher
          users={ctxRef.current.users}
          currentUser={ctxRef.current.currentUser}
          accent={accent}
          onSwitch={handleSwitchUser}
          onCreate={handleCreateUser}
          onClose={() => setShowUserSwitcher(false)}
        />
      )}
      {showSettings && (
        <SettingsPanel
          accent={accent}
          onAccentChange={(c) => { setAccent(c); rerender(); }}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showDevData && ctxRef.current.devMode && (
        <DevDataPanel
          ctx={ctxRef.current}
          accent={accent}
          onUpdate={(newCtx) => { ctxRef.current = newCtx; rerender(); }}
          onClose={() => setShowDevData(false)}
        />
      )}
      {passwordPrompt && (
        <PasswordPrompt
          username={passwordPrompt.username}
          isDev={passwordPrompt.isDev}
          accent={accent}
          onSubmit={handlePasswordSubmit}
          onClose={() => setPasswordPrompt(null)}
        />
      )}
    </div>
  );
}
