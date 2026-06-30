import { useState } from 'react';
import { X, Database, Plus, Trash2, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import type { IanContext, Neuron, EmotionState, UserProfile, AccentColor } from './engine';
import { ACCENT_COLORS, DEFAULT_EMOTION, DEFAULT_NEURONS, PROTECTED_USERS } from './engine';

interface Props {
  ctx: IanContext;
  accent: AccentColor;
  onUpdate: (newCtx: IanContext) => void;
  onClose: () => void;
}

type Section = 'neurons' | 'learned' | 'emotion' | 'users';

export default function DevDataPanel({ ctx, accent, onUpdate, onClose }: Props) {
  const [openSection, setOpenSection] = useState<Section | null>('neurons');
  const accentCfg = ACCENT_COLORS[accent];
  const accentMain = accentCfg.main;

  const toggle = (s: Section) => setOpenSection(openSection === s ? null : s);

  const updateNeurons = (neurons: Neuron[]) => onUpdate({ ...ctx, neurons });
  const updateLearned = (learnedTopics: Record<string, string>) => {
    const users = { ...ctx.users };
    users[ctx.currentUser] = { ...users[ctx.currentUser], learned_topics: learnedTopics };
    onUpdate({ ...ctx, learnedTopics, users });
  };
  const updateEmotion = (emotionState: EmotionState) => onUpdate({ ...ctx, emotionState });
  const updateUsers = (users: Record<string, UserProfile>) => onUpdate({ ...ctx, users });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-panel border rounded-lg w-full max-w-2xl mx-4 shadow-2xl max-h-[85vh] flex flex-col"
        style={{ borderColor: accentMain + '50' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-2">
            <Database size={18} style={{ color: accentMain }} />
            <h2 className="font-display text-lg font-bold tracking-wider" style={{ color: accentMain }}>
              DEV DATA EDITOR
            </h2>
            <span className="font-mono text-[9px] text-amber border border-amber/40 px-1.5 py-0.5 rounded ml-2">
              UNRESTRICTED
            </span>
          </div>
          <button onClick={onClose} className="text-faint hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto scrollbar-thin p-4 space-y-2 flex-1">
          {/* NEURONS */}
          <SectionWrapper
            label={`NEURONS (${ctx.neurons.length})`}
            isOpen={openSection === 'neurons'}
            onToggle={() => toggle('neurons')}
            accentMain={accentMain}
          >
            <NeuronEditor neurons={ctx.neurons} onChange={updateNeurons} accentMain={accentMain} />
          </SectionWrapper>

          {/* LEARNED TOPICS */}
          <SectionWrapper
            label={`LEARNED TOPICS (${Object.keys(ctx.learnedTopics).length})`}
            isOpen={openSection === 'learned'}
            onToggle={() => toggle('learned')}
            accentMain={accentMain}
          >
            <LearnedEditor learned={ctx.learnedTopics} onChange={updateLearned} />
          </SectionWrapper>

          {/* EMOTION STATE */}
          <SectionWrapper
            label="EMOTION STATE"
            isOpen={openSection === 'emotion'}
            onToggle={() => toggle('emotion')}
            accentMain={accentMain}
          >
            <EmotionEditor emotion={ctx.emotionState} onChange={updateEmotion} accentMain={accentMain} />
          </SectionWrapper>

          {/* USERS */}
          <SectionWrapper
            label={`USER PROFILES (${Object.keys(ctx.users).length})`}
            isOpen={openSection === 'users'}
            onToggle={() => toggle('users')}
            accentMain={accentMain}
          >
            <UsersEditor users={ctx.users} currentUser={ctx.currentUser} onChange={updateUsers} accentMain={accentMain} />
          </SectionWrapper>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-line shrink-0 flex items-center justify-between">
          <span className="font-mono text-[9px] text-faint">Changes apply instantly to the live IAN context.</span>
          <button
            onClick={() => {
              if (confirm('Reset neurons and emotion to defaults? This cannot be undone.')) {
                onUpdate({ ...ctx, neurons: DEFAULT_NEURONS, emotionState: { ...DEFAULT_EMOTION } });
              }
            }}
            className="flex items-center gap-1.5 font-mono text-[10px] px-3 py-1.5 border border-amber/40 text-amber hover:bg-amber/10 rounded transition-colors"
          >
            <RotateCcw size={12} /> RESET DEFAULTS
          </button>
        </div>
      </div>
    </div>
  );
}

interface SectionWrapperProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  accentMain: string;
  children: React.ReactNode;
}

function SectionWrapper({ label, isOpen, onToggle, accentMain, children }: SectionWrapperProps) {
  return (
    <div className="border border-line rounded overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 bg-deep-2 hover:bg-panel-2 transition-colors">
        <span className="font-mono text-[11px] font-bold tracking-wider text-slate-200">{label}</span>
        {isOpen ? <ChevronDown size={14} className="text-dim" /> : <ChevronRight size={14} className="text-dim" />}
      </button>
      {isOpen && <div className="p-3 space-y-2">{children}</div>}
    </div>
  );
}

function NeuronEditor({ neurons, onChange, accentMain }: { neurons: Neuron[]; onChange: (n: Neuron[]) => void; accentMain: string }) {
  const [newTopic, setNewTopic] = useState('');
  const [newExpl, setNewExpl] = useState('');

  const add = () => {
    if (!newTopic.trim() || !newExpl.trim()) return;
    onChange([...neurons, {
      topic: newTopic.trim().toLowerCase(),
      explanation: newExpl.trim(),
      created: new Date().toISOString(),
      connections: [],
      keywords: newTopic.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
    }]);
    setNewTopic('');
    setNewExpl('');
  };

  return (
    <>
      {neurons.map((n, i) => (
        <div key={i} className="border border-line rounded p-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              value={n.topic}
              onChange={(e) => onChange(neurons.map((nn, j) => j === i ? { ...nn, topic: e.target.value } : nn))}
              className="flex-1 bg-deep-2 border border-line rounded px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-cyan"
            />
            <button onClick={() => onChange(neurons.filter((_, j) => j !== i))} className="text-red-glow hover:text-red-400 transition-colors p-1">
              <Trash2 size={13} />
            </button>
          </div>
          <textarea
            value={n.explanation}
            onChange={(e) => onChange(neurons.map((nn, j) => j === i ? { ...nn, explanation: e.target.value } : nn))}
            rows={2}
            className="w-full bg-deep-2 border border-line rounded px-2 py-1 font-mono text-xs text-slate-300 outline-none focus:border-cyan resize-none"
          />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-faint">CONN:</span>
            <input
              value={n.connections.join(', ')}
              onChange={(e) => onChange(neurons.map((nn, j) => j === i ? { ...nn, connections: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : nn))}
              className="flex-1 bg-deep-2 border border-line rounded px-2 py-0.5 font-mono text-[10px] text-dim outline-none focus:border-cyan"
            />
          </div>
        </div>
      ))}
      <div className="border border-dashed border-line rounded p-2 space-y-1.5">
        <div className="font-mono text-[9px] text-faint tracking-wider">ADD NEURON</div>
        <input
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder="topic"
          className="w-full bg-deep-2 border border-line rounded px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-cyan placeholder:text-faint"
        />
        <textarea
          value={newExpl}
          onChange={(e) => setNewExpl(e.target.value)}
          placeholder="explanation"
          rows={2}
          className="w-full bg-deep-2 border border-line rounded px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-cyan resize-none placeholder:text-faint"
        />
        <button onClick={add} className="flex items-center gap-1 font-mono text-[10px] px-2 py-1 border rounded transition-colors" style={{ borderColor: accentMain + '60', color: accentMain }}>
          <Plus size={11} /> ADD
        </button>
      </div>
    </>
  );
}

function LearnedEditor({ learned, onChange }: { learned: Record<string, string>; onChange: (l: Record<string, string>) => void }) {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const keys = Object.keys(learned);

  return (
    <>
      {keys.length === 0 && <div className="font-mono text-[10px] text-faint">No learned topics yet.</div>}
      {keys.map((k) => (
        <div key={k} className="border border-line rounded p-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-200 flex-1">{k}</span>
            <button onClick={() => { const next = { ...learned }; delete next[k]; onChange(next); }} className="text-red-glow hover:text-red-400 transition-colors p-1">
              <Trash2 size={13} />
            </button>
          </div>
          <textarea
            value={learned[k]}
            onChange={(e) => onChange({ ...learned, [k]: e.target.value })}
            rows={2}
            className="w-full bg-deep-2 border border-line rounded px-2 py-1 font-mono text-xs text-slate-300 outline-none focus:border-cyan resize-none"
          />
        </div>
      ))}
      <div className="border border-dashed border-line rounded p-2 space-y-1">
        <div className="font-mono text-[9px] text-faint tracking-wider">ADD TOPIC</div>
        <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="topic" className="w-full bg-deep-2 border border-line rounded px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-cyan placeholder:text-faint" />
        <textarea value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="explanation" rows={2} className="w-full bg-deep-2 border border-line rounded px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-cyan resize-none placeholder:text-faint" />
        <button onClick={() => { if (newKey.trim() && newVal.trim()) { onChange({ ...learned, [newKey.trim().toLowerCase()]: newVal.trim() }); setNewKey(''); setNewVal(''); } }} className="flex items-center gap-1 font-mono text-[10px] px-2 py-1 border rounded transition-colors" style={{ borderColor: accentMain + '60', color: accentMain }}>
          <Plus size={11} /> ADD
        </button>
      </div>
    </>
  );
}

function EmotionEditor({ emotion, onChange, accentMain }: { emotion: EmotionState; onChange: (e: EmotionState) => void; accentMain: string }) {
  const sliders: { key: keyof EmotionState; label: string }[] = [
    { key: 'curiosity', label: 'CURIOSITY' },
    { key: 'respect_for_kashi', label: 'RESPECT' },
    { key: 'interest_in_life', label: 'INTEREST IN LIFE' },
    { key: 'wariness', label: 'WARINESS' },
    { key: 'happiness', label: 'HAPPINESS' },
  ];

  return (
    <>
      <div className="space-y-2">
        {sliders.map((s) => {
          const val = emotion[s.key] as number;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-dim w-28">{s.label}</span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={val}
                onChange={(e) => onChange({ ...emotion, [s.key]: parseFloat(e.target.value) })}
                className="flex-1 accent-cyan"
                style={{ accentColor: accentMain }}
              />
              <span className="font-mono text-[10px] text-slate-200 w-10 text-right">{val.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-line pt-2 space-y-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-dim w-28">MOOD</span>
          <select
            value={emotion.mood}
            onChange={(e) => onChange({ ...emotion, mood: e.target.value as EmotionState['mood'] })}
            className="flex-1 bg-deep-2 border border-line rounded px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-cyan"
          >
            {['neutral', 'happy', 'angry', 'sad', 'curious'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-dim w-28">ANGER LEVEL</span>
          <input type="range" min={0} max={10} step={1} value={emotion.anger_level} onChange={(e) => onChange({ ...emotion, anger_level: parseInt(e.target.value) })} className="flex-1" style={{ accentColor: accentMain }} />
          <span className="font-mono text-[10px] text-slate-200 w-10 text-right">{emotion.anger_level}/10</span>
        </div>
      </div>
    </>
  );
}

function UsersEditor({ users, currentUser, onChange, accentMain }: { users: Record<string, UserProfile>; currentUser: string; onChange: (u: Record<string, UserProfile>) => void; accentMain: string }) {
  const [selected, setSelected] = useState(currentUser);
  const profile = users[selected];
  const [newLike, setNewLike] = useState('');
  const [newDislike, setNewDislike] = useState('');

  if (!profile) return <div className="font-mono text-[10px] text-faint">No profile selected.</div>;

  const updateProfile = (patch: Partial<UserProfile>) => onChange({ ...users, [selected]: { ...profile, ...patch } });

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-2">
        {Object.keys(users).map((name) => (
          <button
            key={name}
            onClick={() => setSelected(name)}
            className="font-mono text-[10px] px-2 py-1 rounded border transition-all"
            style={{
              borderColor: selected === name ? accentMain : '#1c2740',
              background: selected === name ? accentMain + '15' : 'transparent',
              color: selected === name ? accentMain : '#94a3b8',
            }}
          >
            {name}{PROTECTED_USERS.includes(name) ? ' 🔒' : ''}
          </button>
        ))}
      </div>

      <div className="border border-line rounded p-2 space-y-3">
        <div>
          <div className="font-mono text-[9px] text-faint tracking-wider mb-1">NAME</div>
          <input value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} className="w-full bg-deep-2 border border-line rounded px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-cyan" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-line rounded p-2">
            <div className="font-mono text-[9px] text-faint tracking-wider mb-1">SESSIONS</div>
            <input type="number" value={profile.session_count ?? 0} onChange={(e) => updateProfile({ session_count: parseInt(e.target.value) || 0 })} className="w-full bg-deep-2 border border-line rounded px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-cyan" />
          </div>
          <div className="border border-line rounded p-2">
            <div className="font-mono text-[9px] text-faint tracking-wider mb-1">MESSAGES</div>
            <input type="number" value={profile.message_count ?? 0} onChange={(e) => updateProfile({ message_count: parseInt(e.target.value) || 0 })} className="w-full bg-deep-2 border border-line rounded px-2 py-1 font-mono text-xs text-slate-200 outline-none focus:border-cyan" />
          </div>
        </div>

        <div className="border border-line rounded p-2">
          <div className="font-mono text-[9px] text-faint tracking-wider mb-1">FIRST SEEN</div>
          <div className="font-mono text-[10px] text-dim">{profile.first_seen ? profile.first_seen.slice(0, 10) : 'unknown'}</div>
          <div className="font-mono text-[9px] text-faint tracking-wider mt-1.5 mb-1">LAST SEEN</div>
          <div className="font-mono text-[10px] text-dim">{profile.last_seen ? profile.last_seen.slice(0, 10) : 'unknown'}</div>
        </div>

        <div>
          <div className="font-mono text-[9px] text-faint tracking-wider mb-1">LIKES</div>
          <div className="flex flex-wrap gap-1 mb-1">
            {profile.likes.map((l, i) => (
              <span key={i} className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 bg-green-glow/10 text-green-glow border border-green-glow/30 rounded">
                {l}
                <button onClick={() => updateProfile({ likes: profile.likes.filter((_, j) => j !== i) })} className="hover:text-red-400"><X size={9} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input value={newLike} onChange={(e) => setNewLike(e.target.value)} placeholder="add like..." onKeyDown={(e) => { if (e.key === 'Enter' && newLike.trim()) { updateProfile({ likes: [...profile.likes, newLike.trim()] }); setNewLike(''); } }} className="flex-1 bg-deep-2 border border-line rounded px-2 py-1 font-mono text-[10px] text-slate-200 outline-none focus:border-cyan placeholder:text-faint" />
            <button onClick={() => { if (newLike.trim()) { updateProfile({ likes: [...profile.likes, newLike.trim()] }); setNewLike(''); } }} className="font-mono text-[10px] px-2 py-1 border border-green-glow/40 text-green-glow rounded"><Plus size={11} /></button>
          </div>
        </div>

        <div>
          <div className="font-mono text-[9px] text-faint tracking-wider mb-1">DISLIKES</div>
          <div className="flex flex-wrap gap-1 mb-1">
            {profile.dislikes.map((l, i) => (
              <span key={i} className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 bg-red-glow/10 text-red-glow border border-red-glow/30 rounded">
                {l}
                <button onClick={() => updateProfile({ dislikes: profile.dislikes.filter((_, j) => j !== i) })} className="hover:text-red-400"><X size={9} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input value={newDislike} onChange={(e) => setNewDislike(e.target.value)} placeholder="add dislike..." onKeyDown={(e) => { if (e.key === 'Enter' && newDislike.trim()) { updateProfile({ dislikes: [...profile.dislikes, newDislike.trim()] }); setNewDislike(''); } }} className="flex-1 bg-deep-2 border border-line rounded px-2 py-1 font-mono text-[10px] text-slate-200 outline-none focus:border-cyan placeholder:text-faint" />
            <button onClick={() => { if (newDislike.trim()) { updateProfile({ dislikes: [...profile.dislikes, newDislike.trim()] }); setNewDislike(''); } }} className="font-mono text-[10px] px-2 py-1 border border-red-glow/40 text-red-glow rounded"><Plus size={11} /></button>
          </div>
        </div>

        <div>
          <div className="font-mono text-[9px] text-faint tracking-wider mb-1">LEARNED TOPICS ({Object.keys(profile.learned_topics).length})</div>
          <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
            {Object.entries(profile.learned_topics).map(([k, v]) => (
              <div key={k} className="flex items-start gap-1">
                <span className="font-mono text-[10px] text-slate-200 font-bold w-20 shrink-0">{k}:</span>
                <input value={v} onChange={(e) => updateProfile({ learned_topics: { ...profile.learned_topics, [k]: e.target.value } })} className="flex-1 bg-deep-2 border border-line rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-300 outline-none focus:border-cyan" />
                <button onClick={() => { const next = { ...profile.learned_topics }; delete next[k]; updateProfile({ learned_topics: next }); }} className="text-red-glow hover:text-red-400 p-0.5"><Trash2 size={10} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
