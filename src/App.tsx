import { useEffect, useRef, useState } from 'react';
import { Users, Settings, Terminal, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import BootSequence from './ian/BootSequence';
import AuthScreen from './ian/AuthScreen';
import ChatInterface, { type ChatMessage } from './ian/ChatInterface';
import BrainMap from './ian/BrainMap';
import EmotionDashboard from './ian/EmotionDashboard';
import SettingsPanel from './ian/SettingsPanel';
import DevDataPanel from './ian/DevDataPanel';
import {
  type IanContext,
  type AccentColor,
  processMessage,
  updateEmotionState,
  autonomousGrowth,
  addNeuron,
  compressMemory,
  maybeRecallSomething,
  formatUserStats,
  ACCENT_COLORS,
  DEFAULT_NEURONS,
  DEFAULT_EMOTION,
  DEFAULT_LEARNED,
  DEFAULT_PROFILE,
  RANDOM_THOUGHTS_NEUTRAL,
  RANDOM_THOUGHTS_ANGRY,
  RANDOM_THOUGHTS_HAPPY,
  RANDOM_QUESTIONS,
} from './ian/engine';
import {
  loadUserContext,
  ensureProfile,
  saveEmotionState,
  saveProfile,
  addMemory,
  addContextEntry,
  addNeuronToDb,
  addLearnedTopic,
  wipeConversation,
  wipeAllMemory,
} from './ian/data';

type View = 'chat' | 'brain' | 'emotion';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [booted, setBooted] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState<null | 'conversation' | 'all'>(null);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [showSettings, setShowSettings] = useState(false);
  const [accent, setAccent] = useState<AccentColor>('cyan');
  const [showDevData, setShowDevData] = useState(false);
  const [loadingCtx, setLoadingCtx] = useState(false);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Check existing session
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthUserId(session.user.id);
        setAuthed(true);
      }
      setAuthChecking(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_IN' && session?.user) {
          setAuthUserId(session.user.id);
          setAuthed(true);
        } else if (event === 'SIGNED_OUT') {
          setAuthUserId(null);
          setAuthed(false);
          setBooted(false);
          setMessages([]);
        }
      })();
    });

    return () => subscription.unsubscribe();
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
    profile: { ...DEFAULT_PROFILE },
    devMode: false,
  });

  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  // Load user context when authed
  useEffect(() => {
    if (!authed || !authUserId) return;
    (async () => {
      setLoadingCtx(true);
      try {
        await ensureProfile(authUserId, ctxRef.current.currentUser);
        const ctx = await loadUserContext(authUserId);
        ctxRef.current = ctx;
        // Bump session count
        ctxRef.current.profile.session_count += 1;
        ctxRef.current.profile.last_seen = new Date().toISOString();
        await saveProfile(authUserId, ctxRef.current);
        rerender();
      } finally {
        setLoadingCtx(false);
      }
    })();
  }, [authed, authUserId]);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
          if (authUserId) wipeConversation(authUserId);
          addMessage('ian', 'Conversation memory wiped. I still know who you are.', 'wipe');
        } else {
          ctxRef.current.neurons = [];
          ctxRef.current.memoryTimeline = [];
          ctxRef.current.contextBuffer = [];
          ctxRef.current.learnedTopics = {};
          ctxRef.current.emotionState = { ...DEFAULT_EMOTION };
          if (authUserId) wipeAllMemory(authUserId);
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

    // Dev mode command
    if (msg === 'dev mode' || msg === 'devmode') {
      ctxRef.current.devMode = !ctxRef.current.devMode;
      addMessage('system', ctxRef.current.devMode ? 'DEV MODE ACTIVATED' : 'DEV MODE DEACTIVATED', 'system');
      rerender();
      return;
    }

    // Dev data editor command
    if (msg === 'dev data' || msg === 'edit data') {
      if (!ctxRef.current.devMode) {
        addMessage('system', 'ACCESS DENIED — dev mode required. Type "dev mode" to toggle.', 'system');
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
      addMessage('ian', formatUserStats(ctxRef.current.profile), 'system');
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
    if (msg === 'stark systems') {
      addMessage('system', '---STARK SYSTEMS CHECK...', 'system');
      setTimeout(() => addMessage('system', '---ALL SYSTEMS GO', 'system'), 800);
      return;
    }
    if (msg === 'sign out' || msg === 'logout' || msg === 'log out') {
      handleSignOut();
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
      ctxRef.current = newCtx;
      ctxRef.current.profile.message_count += 1;

      // Persist changes
      if (authUserId) {
        saveEmotionState(authUserId, ctxRef.current);
        saveProfile(authUserId, ctxRef.current);
        addMemory(authUserId, raw, response.text);
        addContextEntry(authUserId, raw, response.text);
        // If learned something new, persist it
        const newLearnedKeys = Object.keys(ctxRef.current.learnedTopics);
        if (newLearnedKeys.length > 0) {
          const lastKey = newLearnedKeys[newLearnedKeys.length - 1];
          addLearnedTopic(authUserId, lastKey, ctxRef.current.learnedTopics[lastKey]);
        }
      }

      addMessage('ian', response.text, response.type);
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
      const newNeuron = ctxRef.current.neurons[ctxRef.current.neurons.length - 1];
      if (authUserId) addNeuronToDb(authUserId, newNeuron);
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
    if (booted && authed && messages.length === 0 && !loadingCtx) {
      addMessage('system', 'IAN ONLINE', 'system');
      addMessage('system', "Commands: 'settings', 'dev mode', 'show network', 'show context', 'wipe conversation', 'sign out', 'exit'", 'system');
      addMessage('ian', `Hello, ${ctxRef.current.currentUser}. I am IAN — your Intelligent Autonomous Network. I am here to learn, grow, and assist. What shall we discover today?`, 'normal');
    }
  }, [booted, authed, loadingCtx]); // eslint-disable-line

  const killMode = ctxRef.current.killMode;
  const mood = ctxRef.current.emotionState.mood;
  const accentCfg = ACCENT_COLORS[accent];
  const accentMain = killMode ? '#ef4444' : accentCfg.main;
  const accentGlow = killMode ? 'rgba(239,68,68,0.5)' : accentCfg.glow;
  const accentDim = killMode ? '#991b1b' : accentCfg.dim;

  // Auth checking splash
  if (authChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep">
        <div className="font-mono text-sm text-cyan animate-pulse-glow">CONNECTING TO IAN...</div>
      </div>
    );
  }

  // Not authed — show auth screen
  if (!authed) {
    return <AuthScreen accent={accent} onAuthed={() => setAuthed(true)} />;
  }

  // Loading context
  if (loadingCtx && !booted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep">
        <div className="font-mono text-sm text-cyan animate-pulse-glow">LOADING NEURAL DATA...</div>
      </div>
    );
  }

  if (!booted) {
    return <BootSequence userName={ctxRef.current.currentUser} onComplete={() => setBooted(true)} />;
  }

  return (
    <div className={`h-screen w-screen flex flex-col bg-deep overflow-hidden ${killMode ? 'grid-bg-red' : 'grid-bg'}`}>
      {/* Top status bar */}
      <header className={`flex items-center justify-between px-4 py-2 border-b ${killMode ? 'border-red-glow/30' : 'border-line'} bg-panel/80 backdrop-blur`}>
        <div className="flex items-center gap-3">
          {/* User display */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded border" style={{ borderColor: accentMain + '40' }}>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold"
              style={{ background: accentMain + '20', color: accentMain }}
            >
              {ctxRef.current.currentUser.charAt(0).toUpperCase()}
            </div>
            <span className="font-mono text-xs text-slate-200 hidden sm:inline">{ctxRef.current.currentUser}</span>
            <Users size={14} style={{ color: accentMain }} />
          </div>

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

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded border transition-all hover:bg-panel-2"
            style={{ borderColor: accentMain + '30' }}
            title="Sign out"
          >
            <LogOut size={14} style={{ color: accentMain }} />
          </button>

          {/* IAN logo */}
          <div className="flex items-center gap-2 ml-2">
            <div className={`w-8 h-8 border-2 rounded-sm flex items-center justify-center relative`} style={{ borderColor: accentMain }}>
              <div className={`w-3 h-3 rounded-sm animate-pulse-glow`} style={{ background: accentMain }} />
              {(killMode || mood === 'angry') && <div className="absolute inset-0 border rounded-sm animate-pulse-glow" style={{ borderColor: '#ef444450' }} />}
            </div>
            <div>
              <div className="font-display text-lg font-bold tracking-widest" style={{ color: accentMain, textShadow: `0 0 10px ${accentGlow}` }}>
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
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse-glow`} style={{ background: killMode ? '#ef4444' : '#10b981' }} />
              <span className="text-dim">SYS</span>
              <span style={{ color: killMode ? '#ef4444' : '#10b981' }}>OK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: accentMain }} />
              <span className="text-dim">NET</span>
              <span style={{ color: accentMain }}>LINK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${mood === 'angry' || killMode ? 'animate-pulse-glow' : ''}`} style={{ background: mood === 'angry' ? '#ef4444' : killMode ? '#ef4444' : '#f59e0b' }} />
              <span className="text-dim">MOOD</span>
              <span style={{ color: mood === 'angry' ? '#ef4444' : killMode ? '#ef4444' : '#f59e0b' }}>
                {mood.toUpperCase()}{killMode ? ' / KILL' : ''}
              </span>
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
                userName={ctxRef.current.currentUser}
                pendingNeuron={ctxRef.current.pendingNeuron}
                onSend={handleSend}
                onNeuronApprove={handleNeuronApprove}
                thinking={thinking}
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
        <aside className={`hidden lg:flex w-72 border-l ${killMode ? 'border-red-glow/20' : 'border-line'} bg-panel/50`}>
          <EmotionDashboard emotion={ctxRef.current.emotionState} killMode={killMode} accent={accent} userName={ctxRef.current.currentUser} />
        </aside>
      </div>

      {/* Bottom status bar */}
      <footer className={`flex items-center justify-between px-4 py-1.5 border-t ${killMode ? 'border-red-glow/30 bg-red-glow/5' : 'border-line bg-panel/50'} font-mono text-[10px]`}>
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
        <div className="fixed inset-0 pointer-events-none z-40" style={{
          boxShadow: 'inset 0 0 100px rgba(239, 68, 68, 0.15)',
        }} />
      )}

      {/* Modals */}
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
    </div>
  );
}
