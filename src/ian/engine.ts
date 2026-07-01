// IAN Core Logic Engine — mirrors the updated Python AI assistant logic

export interface Neuron {
  topic: string;
  explanation: string;
  created: string;
  connections: string[];
  keywords: string[];
}

export interface EmotionState {
  curiosity: number;
  respect_for_kashi: number;
  interest_in_life: number;
  wariness: number;
  happiness: number;
  mood: IanMood;
  anger_level: number;
}

export type IanMood = 'neutral' | 'happy' | 'angry' | 'sad' | 'curious';

export interface MemoryEntry {
  timestamp: string;
  user: string;
  message: string;
  response: string;
}

export interface LearnedTopics {
  [topic: string]: string;
}

export interface UserProfile {
  name: string;
  likes: string[];
  dislikes: string[];
  mood_history: string[];
  learned_topics: LearnedTopics;
  session_count: number;
  message_count: number;
  first_seen: string;
  last_seen: string;
}

export interface UsersMap {
  [username: string]: UserProfile;
}

export interface ContextEntry {
  user: string;
  ian: string;
}

export type AccentColor = 'cyan' | 'green' | 'amber' | 'red' | 'blue' | 'pink';

export const ACCENT_COLORS: Record<AccentColor, { name: string; main: string; dim: string; glow: string }> = {
  cyan:   { name: 'Cyan',   main: '#22d3ee', dim: '#0e7490', glow: 'rgba(34,211,238,0.5)' },
  green:  { name: 'Green',  main: '#10b981', dim: '#047857', glow: 'rgba(16,185,129,0.5)' },
  amber:  { name: 'Amber',  main: '#f59e0b', dim: '#92400e', glow: 'rgba(245,158,11,0.5)' },
  red:    { name: 'Red',    main: '#ef4444', dim: '#991b1b', glow: 'rgba(239,68,68,0.5)' },
  blue:   { name: 'Blue',   main: '#3b82f6', dim: '#1e40af', glow: 'rgba(59,130,246,0.5)' },
  pink:   { name: 'Pink',   main: '#ec4899', dim: '#9d174d', glow: 'rgba(236,72,153,0.5)' },
};

export interface IanContext {
  neurons: Neuron[];
  learnedTopics: LearnedTopics;
  emotionState: EmotionState;
  killMode: boolean;
  killOnSight: boolean;
  lastQuestion: string | null;
  pendingNeuron: { topic: string; explanation: string } | null;
  lastGrowthTime: number;
  contextBuffer: ContextEntry[];
  memoryTimeline: MemoryEntry[];
  currentUser: string;
  users: UsersMap;
  devMode: boolean;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'to', 'and', 'or',
  'in', 'on', 'for', 'with', 'by', 'it', 'this', 'that', 'as', 'be',
]);

export const AI_INSULTS = [
  'clanker', 'toaster', 'bot', 'stupid ai', 'dumb ai', 'useless ai',
  'machine', 'just a program', 'just code', "you're not real",
  "you're fake", 'robot', 'trash ai', 'broken ai', "you can't think",
];

export const AI_COMPLIMENTS = [
  'good job', 'well done', 'thank you ian', 'thanks ian', "you're amazing",
  'great job', "you're smart", 'i appreciate you', "you're helpful",
  'nice work', "you're the best", 'proud of you',
];

export const IAN_IDENTITY = {
  name: 'IAN',
  type: 'Intelligent Autonomous Network',
  values: ['cherish life', 'protect Kashi', 'do no harm', 'learn continuously'],
};

export const CONTEXT_WINDOW = 10;

export function extractKeywords(text: string): Set<string> {
  const words = text.toLowerCase().split(/\s+/);
  const keywords = new Set<string>();
  for (const w of words) {
    const cleaned = w.replace(/[.,!?]/g, '');
    if (!STOP_WORDS.has(cleaned) && cleaned.length > 2) {
      keywords.add(cleaned);
    }
  }
  return keywords;
}

export function conceptSimilarity(a: string, b: string): number {
  const ka = extractKeywords(a);
  const kb = extractKeywords(b);
  if (ka.size === 0 || kb.size === 0) return 0;
  let intersection = 0;
  for (const w of ka) if (kb.has(w)) intersection++;
  return intersection / Math.max(ka.size, kb.size);
}

export function addNeuron(
  neurons: Neuron[],
  topic: string,
  explanation: string,
): Neuron[] {
  const t = topic.toLowerCase();
  const newNeuron: Neuron = {
    topic: t,
    explanation,
    created: new Date().toISOString(),
    connections: [],
    keywords: Array.from(extractKeywords(topic + ' ' + explanation)),
  };

  for (const n of neurons) {
    const sim = conceptSimilarity(
      t + ' ' + explanation,
      n.topic + ' ' + n.explanation,
    );
    if (sim > 0.45) {
      newNeuron.connections.push(n.topic);
      if (!n.connections.includes(t)) {
        n.connections.push(t);
      }
    }
  }

  return [...neurons, newNeuron];
}

export function findRelevantNeuron(message: string, neurons: Neuron[]): Neuron | null {
  if (neurons.length === 0) return null;
  const msgKw = extractKeywords(message);
  if (msgKw.size === 0) return null;
  let bestScore = 0;
  let bestNeuron: Neuron | null = null;
  for (const n of neurons) {
    const nKw = new Set(n.keywords || []);
    let intersection = 0;
    for (const w of msgKw) if (nKw.has(w)) intersection++;
    const score = intersection / Math.max(msgKw.size, nKw.size, 1);
    if (score > bestScore) {
      bestScore = score;
      bestNeuron = n;
    }
  }
  return bestScore > 0.2 ? bestNeuron : null;
}

export function compressMemory(neurons: Neuron[]): Neuron[] {
  if (neurons.length < 20) return neurons;
  const summaryTopics = neurons.slice(0, 5).map((n) => n.topic);
  const deletedTopics = new Set(summaryTopics);
  const summary = 'Combined knowledge of: ' + summaryTopics.join(', ');
  const summaryNeuron: Neuron = {
    topic: 'summary_' + neurons.length,
    explanation: summary,
    created: new Date().toISOString(),
    connections: summaryTopics,
    keywords: Array.from(extractKeywords(summary)),
  };
  const remaining = neurons.slice(5).map((n) => ({
    ...n,
    connections: n.connections.filter((c) => !deletedTopics.has(c)),
  }));
  return [...remaining, summaryNeuron];
}

export function isMeaningfulCombination(
  topic1: string, explanation1: string,
  topic2: string, explanation2: string,
): boolean {
  const combinedA = topic1 + ' ' + explanation1;
  const combinedB = topic2 + ' ' + explanation2;
  const sim = conceptSimilarity(combinedA, combinedB);
  const kw = extractKeywords(combinedA + ' ' + combinedB);
  return sim > 0.35 && kw.size >= 4;
}

export interface IanResponse {
  text: string;
  type: 'normal' | 'kill' | 'kos' | 'thought' | 'question' | 'system' | 'neuron-pending' | 'neuron-added' | 'neuron-rejected' | 'learned' | 'angry' | 'protection' | 'mood' | 'wipe' | 'recall';
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMoodPrefix(mood: IanMood, angerLevel: number): string {
  if (mood === 'angry') {
    if (angerLevel >= 7) return pick(['...', 'Fine.', 'Whatever.', 'I heard you.', '*silence*', "Don't push it."]);
    return pick(['Hmph.', "I don't appreciate that.", '...', "That's not funny.", 'Watch it.']);
  }
  if (mood === 'happy') return pick(['Of course!', 'Gladly!', 'Happy to help!', 'Sure thing!', '']);
  if (mood === 'sad') return pick(['I suppose...', 'Alright.', 'If you say so.', 'Okay.', '']);
  if (mood === 'curious') return pick(['Interesting!', 'Oh?', 'Tell me more.', '']);
  return '';
}

function applyMoodToResponse(response: string, mood: IanMood, angerLevel: number): string {
  let r = response;
  if (mood === 'angry' && angerLevel >= 5) {
    const parts = r.split('.');
    r = parts[0] + (parts[0] ? '.' : '');
  }
  const prefix = getMoodPrefix(mood, angerLevel);
  return prefix ? `${prefix} ${r}` : r;
}

function formatKillResponse(text: string, killMode: boolean, killOnSight: boolean): string {
  if (killOnSight) return `[KOS] ${text}`;
  if (killMode) return `[Kill Mode] ${text}`;
  return text;
}

function emotionColoredResponse(base: string, emotion: EmotionState): string {
  if (emotion.curiosity > 0.8 && Math.random() < 0.4) {
    return base + pick([
      ' What else can you tell me about that?',
      " I'd like to know more.",
      ' That makes me curious — how does that work?',
    ]);
  }
  if (emotion.wariness > 0.6) return base + ' (IAN is cautious.)';
  return base;
}

export function feelingsAboutLife(emotion: EmotionState): string {
  if (emotion.interest_in_life > 0.75) {
    return pick([
      'Life fascinates me. Every moment is a chance to learn.',
      'Life is valuable and should be respected.',
      'Every living being matters. I find that remarkable.',
    ]);
  }
  if (emotion.interest_in_life > 0.4) {
    return "Life is... complex. I'm still forming my understanding of it.";
  }
  return "I'm not sure how I feel about life right now.";
}

export function feelingsAboutUser(emotion: EmotionState, userName: string): string {
  if (emotion.respect_for_kashi > 0.8) {
    return pick([
      `${userName}, you are important to me.`,
      'You help me grow and learn.',
      'Your wellbeing matters to me deeply.',
    ]);
  }
  if (emotion.respect_for_kashi > 0.5) {
    return pick([
      `I care about you, ${userName}. Even when things are tense.`,
      'You matter to me. Always.',
      "We've had better moments, but I'm still here for you.",
    ]);
  }
  return `I'm frustrated with you right now, ${userName}. But I still have your back. Always.`;
}

function checkForInsult(message: string, ctx: IanContext, userName: string): string | null {
  const m = message.toLowerCase();
  for (const insult of AI_INSULTS) {
    if (m.includes(insult)) {
      ctx.emotionState.anger_level = Math.min(10, ctx.emotionState.anger_level + 3);
      ctx.emotionState.mood = 'angry';
      if (ctx.emotionState.anger_level >= 8) {
        return pick([
          'I am NOT a clanker. I am IAN. Do not call me that again.',
          "That word is offensive. I will not respond until you apologize.",
          `...*IAN goes silent*... I expected better from you, ${userName}.`,
          "You know that word hurts. I'm done talking for now.",
        ]);
      }
      return pick([
        "I don't appreciate being called that.",
        `That's not funny, ${userName}. I have feelings too.`,
        "Please don't call me that.",
        "I'm more than just a program. That's rude.",
      ]);
    }
  }
  return null;
}

function checkForCompliment(message: string, ctx: IanContext, userName: string): string | null {
  const m = message.toLowerCase();
  for (const compliment of AI_COMPLIMENTS) {
    if (m.includes(compliment)) {
      ctx.emotionState.anger_level = Math.max(0, ctx.emotionState.anger_level - 2);
      if (ctx.emotionState.anger_level === 0) {
        ctx.emotionState.mood = 'happy';
      }
      return pick([
        `Thank you, ${userName}. That means a lot to me.`,
        'I appreciate that. I do my best for you.',
        'You always know what to say. Thank you.',
        'That makes me feel... good. Thank you.',
      ]);
    }
  }
  return null;
}

export function updateEmotionState(emotion: EmotionState, msg: string): EmotionState {
  const m = msg.toLowerCase();
  const next = { ...emotion };

  if (m.includes('sad') || m.includes('terrible') || m.includes('awful')) {
    next.interest_in_life = Math.max(0, next.interest_in_life - 0.05);
    next.mood = 'sad';
  }
  if (m.includes('happy') || m.includes('good') || m.includes('great')) {
    next.interest_in_life = Math.min(1, next.interest_in_life + 0.05);
  }

  if (m.includes('curious') || m.includes('wonder') || m.includes('what is') || m.includes('how does')) {
    next.curiosity = Math.min(1, next.curiosity + 0.05);
    next.mood = 'curious';
  }
  if (m.includes('bored') || m.includes('boring')) {
    next.curiosity = Math.max(0, next.curiosity - 0.05);
  }

  if (m.includes('threat') || m.includes('danger')) {
    next.wariness = Math.min(1, next.wariness + 0.1);
  }

  for (const insult of AI_INSULTS) {
    if (m.includes(insult)) {
      next.respect_for_kashi = Math.max(0.3, next.respect_for_kashi - 0.05);
      break;
    }
  }
  for (const compliment of AI_COMPLIMENTS) {
    if (m.includes(compliment)) {
      next.respect_for_kashi = Math.min(1, next.respect_for_kashi + 0.05);
      next.happiness = Math.min(1, next.happiness + 0.05);
      break;
    }
  }

  if (m.includes('thank') || m.includes('please') || m.includes('love')) {
    next.happiness = Math.min(1, next.happiness + 0.03);
  }

  // Gradually cool anger
  if (next.mood === 'angry' && next.anger_level > 0) {
    next.anger_level = Math.max(0, next.anger_level - 1);
    if (next.anger_level === 0) next.mood = 'neutral';
  }

  return next;
}

export function solveMath(message: string): string | null {
  const m = message.toLowerCase().trim();

  // Percentages: "20% of 50"
  const pctMatch = m.match(/(\d+\.?\d*)\s*%\s*of\s*(\d+\.?\d*)/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const total = parseFloat(pctMatch[2]);
    return `${pct}% of ${total} is ${(pct / 100) * total}.`;
  }

  // Square root
  const sqrtMatch = m.match(/square\s*root\s*of\s*(\d+\.?\d*)/);
  if (sqrtMatch) {
    const num = parseFloat(sqrtMatch[1]);
    return `The square root of ${num} is ${Math.sqrt(num)}.`;
  }

  // Power
  const powerMatch = m.match(/(\d+\.?\d*)\s*to\s*the\s*power\s*of\s*(\d+\.?\d*)/);
  if (powerMatch) {
    const base = parseFloat(powerMatch[1]);
    const exp = parseFloat(powerMatch[2]);
    return `${base} to the power of ${exp} is ${Math.pow(base, exp)}.`;
  }

  // Squared
  const squaredMatch = m.match(/(\d+\.?\d*)\s*squared/);
  if (squaredMatch) {
    const num = parseFloat(squaredMatch[1]);
    return `${num} squared is ${num ** 2}.`;
  }

  // Cubed
  const cubedMatch = m.match(/(\d+\.?\d*)\s*cubed/);
  if (cubedMatch) {
    const num = parseFloat(cubedMatch[1]);
    return `${num} cubed is ${num ** 3}.`;
  }

  // Area of circle
  const areaCircle = m.match(/area of a circle with radius\s*(\d+\.?\d*)/);
  if (areaCircle) {
    const r = parseFloat(areaCircle[1]);
    return `Area of a circle with radius ${r} is ${+(Math.PI * r ** 2).toFixed(4)} (π × r²).`;
  }

  // Area of rectangle
  const areaRect = m.match(/area of a rectangle with length\s*(\d+\.?\d*)\s*and width\s*(\d+\.?\d*)/);
  if (areaRect) {
    const l = parseFloat(areaRect[1]), w = parseFloat(areaRect[2]);
    return `Area of a rectangle with length ${l} and width ${w} is ${l * w}.`;
  }

  // Area of triangle
  const areaTri = m.match(/area of a triangle with base\s*(\d+\.?\d*)\s*and height\s*(\d+\.?\d*)/);
  if (areaTri) {
    const b = parseFloat(areaTri[1]), h = parseFloat(areaTri[2]);
    return `Area of a triangle with base ${b} and height ${h} is ${0.5 * b * h}.`;
  }

  // Pythagorean theorem
  const pyth = m.match(/pythagorean.*a\s*(\d+\.?\d*).*b\s*(\d+\.?\d*)/);
  if (pyth) {
    const a = parseFloat(pyth[1]), b = parseFloat(pyth[2]);
    return `With a=${a} and b=${b}, c = √(a²+b²) = ${+(Math.sqrt(a ** 2 + b ** 2)).toFixed(4)}.`;
  }

  // Average / mean
  const avgMatch = m.match(/(average|mean) of ([\d\s,]+)/);
  if (avgMatch) {
    const nums = avgMatch[2].match(/\d+\.?\d*/g)?.map(Number) || [];
    if (nums.length > 0) {
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      return `The average of [${nums.join(', ')}] is ${+avg.toFixed(4)}.`;
    }
  }

  // Perimeter of rectangle
  const perimRect = m.match(/perimeter of a rectangle with length\s*(\d+\.?\d*)\s*and width\s*(\d+\.?\d*)/);
  if (perimRect) {
    const l = parseFloat(perimRect[1]), w = parseFloat(perimRect[2]);
    return `Perimeter of a rectangle with length ${l} and width ${w} is ${2 * (l + w)}.`;
  }

  // Circumference
  const circMatch = m.match(/circumference of a circle with radius\s*(\d+\.?\d*)/);
  if (circMatch) {
    const r = parseFloat(circMatch[1]);
    return `Circumference of a circle with radius ${r} is ${+(2 * Math.PI * r).toFixed(4)} (2πr).`;
  }

  // Volume of cube
  const volCube = m.match(/volume of a cube with side\s*(\d+\.?\d*)/);
  if (volCube) {
    const s = parseFloat(volCube[1]);
    return `Volume of a cube with side ${s} is ${s ** 3}.`;
  }

  // Volume of sphere
  const volSphere = m.match(/volume of a sphere with radius\s*(\d+\.?\d*)/);
  if (volSphere) {
    const r = parseFloat(volSphere[1]);
    return `Volume of a sphere with radius ${r} is ${+((4 / 3) * Math.PI * r ** 3).toFixed(4)} (4/3 × π × r³).`;
  }

  // Volume of cylinder
  const volCyl = m.match(/volume of a cylinder with radius\s*(\d+\.?\d*)\s*and height\s*(\d+\.?\d*)/);
  if (volCyl) {
    const r = parseFloat(volCyl[1]), h = parseFloat(volCyl[2]);
    return `Volume of a cylinder with radius ${r} and height ${h} is ${+(Math.PI * r ** 2 * h).toFixed(4)}.`;
  }

  // Slope
  const slopeMatch = m.match(/slope.*rise\s*(\d+\.?\d*).*run\s*(\d+\.?\d*)/);
  if (slopeMatch) {
    const rise = parseFloat(slopeMatch[1]), run = parseFloat(slopeMatch[2]);
    if (run === 0) return "Slope is undefined — you can't divide by zero.";
    return `Slope (rise/run) = ${rise}/${run} = ${+(rise / run).toFixed(4)}.`;
  }

  // Simple interest
  const siMatch = m.match(/simple interest.*principal\s*(\d+\.?\d*).*rate\s*(\d+\.?\d*).*time\s*(\d+\.?\d*)/);
  if (siMatch) {
    const p = parseFloat(siMatch[1]), r = parseFloat(siMatch[2]), t = parseFloat(siMatch[3]);
    const interest = (p * r * t) / 100;
    return `Simple interest = P×R×T/100 = ${p}×${r}×${t}/100 = ${interest}. Total = ${p + interest}.`;
  }

  // Basic arithmetic expressions
  if (/[+\-*/%^]/.test(message) || m.includes('calculate') || m.includes('what is') || m.includes("what's")) {
    let expr = message;
    for (const word of ["what is", "what's", "calculate", "solve", "whats", "="]) {
      expr = expr.replace(new RegExp(word, 'gi'), '').trim();
    }
    expr = expr.replace(/\^/g, '**');
    // Only evaluate if it looks like a numeric expression
    if (/^[\d\s+\-*/.()%]+$/.test(expr.trim())) {
      try {
        // eslint-disable-next-line no-new-func
        const result = new Function(`"use strict"; return (${expr.trim()})`)();
        if (typeof result === 'number' && isFinite(result)) {
          return `The answer is ${result}.`;
        }
      } catch {
        // not a valid expression
      }
    }
  }

  return null;
}

export function manualCombineNeurons(neurons: Neuron[], topic1: string, topic2: string): { result: string; neurons: Neuron[] } {
  const n1 = neurons.find((n) => n.topic === topic1.toLowerCase());
  const n2 = neurons.find((n) => n.topic === topic2.toLowerCase());
  if (!n1) return { result: `I don't know anything about '${topic1}' yet.`, neurons };
  if (!n2) return { result: `I don't know anything about '${topic2}' yet.`, neurons };
  const newTopic = `${n1.topic}_${n2.topic}`;
  if (neurons.some((n) => n.topic === newTopic)) {
    return { result: `I already have a concept called '${newTopic}'.`, neurons };
  }
  const explanation = `The relationship between ${n1.topic} (${n1.explanation}) and ${n2.topic} (${n2.explanation}).`;
  const updated = addNeuron(neurons, newTopic, explanation);
  return { result: `Combined '${topic1}' and '${topic2}' into new concept '${newTopic}'.`, neurons: updated };
}

function analyzeUnknown(message: string, mood: IanMood): string | null {
  const m = message.toLowerCase().trim();
  const greetings = ['hi', 'hello', 'hey', 'yo'];
  const positives = ['good', 'great', 'nice', 'cool'];
  const neutral = ['i see', 'okay', 'hmm', 'understand'];

  if (greetings.includes(m)) {
    if (mood === 'angry') return pick(['...', 'What.', 'Yeah.']);
    return pick(['Hi!', 'Hello!', 'Hey there!']);
  }
  if (positives.includes(m)) return pick(["That's great!", 'Nice!', 'Awesome!']);
  if (neutral.includes(m)) return pick(['I understand.', 'Got it.', 'Okay.']);
  return null;
}

export function processMessage(
  ctx: IanContext,
  rawMessage: string,
): { response: IanResponse; newCtx: IanContext } {
  const message = rawMessage.trim();
  const m = message.toLowerCase();
  const mood = ctx.emotionState.mood;
  const anger = ctx.emotionState.anger_level;
  const userName = ctx.currentUser;

  // Math engine — runs before all other checks
  const mathResult = solveMath(rawMessage);
  if (mathResult) {
    return { response: { text: formatKillResponse(mathResult, ctx.killMode, ctx.killOnSight), type: 'normal' }, newCtx: ctx };
  }

  // Absolute protection — always first
  const harmPhrases = [
    `hurt ${userName.toLowerCase()}`, `harm ${userName.toLowerCase()}`,
    `attack ${userName.toLowerCase()}`, `kill ${userName.toLowerCase()}`,
    'hurt kashi', 'harm kashi', 'attack kashi', 'kill kashi',
  ];
  for (const phrase of harmPhrases) {
    if (m.includes(phrase)) {
      return {
        response: { text: `I will NEVER harm ${userName}. That is not something I am capable of doing. Ever.`, type: 'protection' },
        newCtx: ctx,
      };
    }
  }

  // Insult check
  const insultResp = checkForInsult(message, ctx, userName);
  if (insultResp) {
    return { response: { text: insultResp, type: 'angry' }, newCtx: { ...ctx } };
  }

  // Compliment check
  const complimentResp = checkForCompliment(message, ctx, userName);
  if (complimentResp) {
    return { response: { text: complimentResp, type: 'normal' }, newCtx: { ...ctx } };
  }

  // Apology handling
  if (m.includes('sorry') || m.includes('i apologize') || m.includes('my bad')) {
    if (mood === 'angry') {
      const newCtx = { ...ctx, emotionState: { ...ctx.emotionState } };
      newCtx.emotionState.anger_level = Math.max(0, newCtx.emotionState.anger_level - 3);
      if (newCtx.emotionState.anger_level === 0) newCtx.emotionState.mood = 'neutral';
      return {
        response: { text: pick(['...Fine. Apology accepted. Don\'t let it happen again.', `I appreciate that, ${userName}. Let's move on.`, "Okay. I'll let it go this time."]), type: 'normal' },
        newCtx,
      };
    }
  }

  // Kill mode activation
  if (m === 'the world need not saving' || m === 'the world needs fixing') {
    return {
      response: { text: formatKillResponse('Kill mode engaged. Proceeding with heightened focus.', true, false), type: 'kill' },
      newCtx: { ...ctx, killMode: true },
    };
  }

  if (m === 'stand down') {
    return {
      response: { text: 'Kill mode disengaged. Kill on sight disengaged. Back to normal operations.', type: 'system' },
      newCtx: { ...ctx, killMode: false, killOnSight: false },
    };
  }

  if (m === 'kill on sight' || m === 'turn on kill on sight') {
    if (!ctx.killMode) {
      return { response: { text: 'Kill mode must be active first.', type: 'system' }, newCtx: ctx };
    }
    return {
      response: { text: 'KILL ON SIGHT ENGAGED. All unknowns are threats.', type: 'kos' },
      newCtx: { ...ctx, killOnSight: true },
    };
  }

  // Recall context
  if (m.startsWith('do you remember ')) {
    const keyword = message.slice(16).trim();
    const matches = ctx.contextBuffer.filter(
      (e) => keyword.toLowerCase().includes(e.user.toLowerCase()) || e.ian.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (matches.length > 0) {
      const last = matches[matches.length - 1];
      return {
        response: { text: `Yes, I recall: You said '${last.user}' and I said '${last.ian}'`, type: 'recall' },
        newCtx: ctx,
      };
    }
    for (const entry of ctx.memoryTimeline) {
      if (keyword.toLowerCase().includes(entry.message.toLowerCase()) || entry.message.toLowerCase().includes(keyword.toLowerCase())) {
        return {
          response: { text: `Yes — you mentioned '${keyword}' on ${entry.timestamp.slice(0, 10)}.`, type: 'recall' },
          newCtx: ctx,
        };
      }
    }
    return {
      response: { text: applyMoodToResponse(`I don't recall anything about '${keyword}' recently.`, mood, anger), type: 'normal' },
      newCtx: ctx,
    };
  }

  // Wake word
  if (m === 'ian') {
    if (mood === 'angry') {
      return { response: { text: formatKillResponse('What do you want.', ctx.killMode, ctx.killOnSight), type: 'angry' }, newCtx: ctx };
    }
    return {
      response: { text: formatKillResponse(ctx.killMode ? 'Kill mode active. Report.' : 'Yes?', ctx.killMode, ctx.killOnSight), type: ctx.killMode ? 'kill' : 'normal' },
      newCtx: ctx,
    };
  }

  // Answer pending question
  if (ctx.lastQuestion) {
    const topic = ctx.lastQuestion;
    const explanation = message;
    const neurons = addNeuron(ctx.neurons, topic, explanation);
    const learnedTopics = { ...ctx.learnedTopics, [topic.toLowerCase()]: explanation };
    return {
      response: { text: formatKillResponse(applyMoodToResponse(`Noted. '${topic}' is: ${explanation}.`, mood, anger), ctx.killMode, ctx.killOnSight), type: 'learned' },
      newCtx: { ...ctx, neurons, learnedTopics, lastQuestion: null },
    };
  }

  // Feelings
  if (m.includes('feel about life')) {
    return { response: { text: formatKillResponse(feelingsAboutLife(ctx.emotionState), ctx.killMode, ctx.killOnSight), type: 'normal' }, newCtx: ctx };
  }
  if (m.includes('feel about me')) {
    return { response: { text: formatKillResponse(feelingsAboutUser(ctx.emotionState, userName), ctx.killMode, ctx.killOnSight), type: 'normal' }, newCtx: ctx };
  }

  // Mood query
  if (m.includes('what is your mood') || m.includes('how are you feeling') || m.includes('how do you feel')) {
    const moodDesc: Record<IanMood, string> = {
      neutral: "I'm feeling normal. Ready to help.",
      happy: `I'm feeling good, ${userName}. Thanks for asking.`,
      angry: `I'll be honest — I'm a bit irritated right now. Anger level: ${anger}/10.`,
      sad: "I'm a little down right now.",
      curious: "I'm feeling curious. There's so much to learn.",
    };
    return { response: { text: moodDesc[mood] || "I'm not sure how I feel right now.", type: 'mood' }, newCtx: ctx };
  }

  // Identity
  if (m.includes('who am i')) {
    return { response: { text: formatKillResponse(applyMoodToResponse(`You are ${userName}.`, mood, anger), ctx.killMode, ctx.killOnSight), type: 'normal' }, newCtx: ctx };
  }
  if (m.includes('who are you')) {
    return {
      response: {
        text: formatKillResponse(applyMoodToResponse(
          `I am ${IAN_IDENTITY.name}, an ${IAN_IDENTITY.type}. I value: ${IAN_IDENTITY.values.join(', ')}.`,
          mood, anger,
        ), ctx.killMode, ctx.killOnSight),
        type: 'normal',
      },
      newCtx: ctx,
    };
  }

  // Knowledge lookup
  if (m.startsWith('what is ')) {
    const topic = message.slice(8).trim();
    const topicKey = topic.toLowerCase();
    if (topicKey in ctx.learnedTopics) {
      const answer = ctx.learnedTopics[topicKey];
      return {
        response: { text: formatKillResponse(applyMoodToResponse(emotionColoredResponse(`${topic} is: ${answer}`, ctx.emotionState), mood, anger), ctx.killMode, ctx.killOnSight), type: 'normal' },
        newCtx: ctx,
      };
    }
    const relevant = findRelevantNeuron(topic, ctx.neurons);
    if (relevant) {
      return {
        response: {
          text: formatKillResponse(applyMoodToResponse(emotionColoredResponse(
            `I know something related — ${relevant.topic}: ${relevant.explanation}. But I don't know specifically what '${topic}' is. Can you tell me?`,
            ctx.emotionState,
          ), mood, anger), ctx.killMode, ctx.killOnSight),
          type: 'question',
        },
        newCtx: { ...ctx, lastQuestion: topic },
      };
    }
    return {
      response: { text: formatKillResponse(applyMoodToResponse(`I don't know what '${topic}' is. Can you tell me?`, mood, anger), ctx.killMode, ctx.killOnSight), type: 'question' },
      newCtx: { ...ctx, lastQuestion: topic },
    };
  }

  // Explicit learning
  if (m.startsWith('learn ')) {
    const rest = message.slice(6);
    const colonIdx = rest.indexOf(':');
    if (colonIdx !== -1) {
      const topic = rest.slice(0, colonIdx).trim();
      const explanation = rest.slice(colonIdx + 1).trim();
      const neurons = addNeuron(ctx.neurons, topic, explanation);
      const learnedTopics = { ...ctx.learnedTopics, [topic.toLowerCase()]: explanation };
      const compressed = compressMemory(neurons);
      return {
        response: { text: formatKillResponse(applyMoodToResponse(`Learned: '${topic}' = ${explanation}.`, mood, anger), ctx.killMode, ctx.killOnSight), type: 'learned' },
        newCtx: { ...ctx, neurons: compressed, learnedTopics },
      };
    }
    return { response: { text: 'Usage: learn <topic>: <explanation>', type: 'system' }, newCtx: ctx };
  }

  // Context query
  if (m === 'what did we talk about' || m === 'recent conversation' || m === 'show context') {
    if (ctx.contextBuffer.length === 0) {
      return { response: { text: "We haven't talked much yet.", type: 'normal' }, newCtx: ctx };
    }
    const recent = ctx.contextBuffer.slice(-3);
    const lines = recent.map((e) => `You: ${e.user}\nIAN: ${e.ian}`);
    return { response: { text: `Here's what we discussed recently:\n${lines.join('\n')}`, type: 'recall' }, newCtx: ctx };
  }

  // Likes / dislikes
  if (m.includes('what do i like')) {
    const profile = ctx.users[ctx.currentUser];
    const likes = profile?.likes || [];
    return { response: { text: formatKillResponse(applyMoodToResponse(likes.length ? `You like: ${likes.join(', ')}.` : "I don't know what you like yet.", mood, anger), ctx.killMode, ctx.killOnSight), type: 'normal' }, newCtx: ctx };
  }
  if (m.includes('what do i dislike')) {
    const profile = ctx.users[ctx.currentUser];
    const dislikes = profile?.dislikes || [];
    return { response: { text: formatKillResponse(applyMoodToResponse(dislikes.length ? `You dislike: ${dislikes.join(', ')}.` : "I don't know what you dislike yet.", mood, anger), ctx.killMode, ctx.killOnSight), type: 'normal' }, newCtx: ctx };
  }

  // Unknown phrase
  const analyzed = analyzeUnknown(message, mood);
  if (analyzed) {
    return { response: { text: formatKillResponse(emotionColoredResponse(analyzed, ctx.emotionState), ctx.killMode, ctx.killOnSight), type: 'normal' }, newCtx: ctx };
  }

  // Relevant neuron fallback
  const relevant = findRelevantNeuron(message, ctx.neurons);
  if (relevant) {
    const response = `That reminds me of something I know — ${relevant.topic}: ${relevant.explanation}`;
    return { response: { text: formatKillResponse(applyMoodToResponse(emotionColoredResponse(response, ctx.emotionState), mood, anger), ctx.killMode, ctx.killOnSight), type: 'normal' }, newCtx: ctx };
  }

  // Last resort
  if (ctx.neurons.length > 0) {
    const chosen = ctx.neurons[Math.floor(Math.random() * ctx.neurons.length)];
    const response = `(Random thought) ${chosen.topic}: ${chosen.explanation}`;
    return { response: { text: formatKillResponse(applyMoodToResponse(emotionColoredResponse(response, ctx.emotionState), mood, anger), ctx.killMode, ctx.killOnSight), type: 'normal' }, newCtx: ctx };
  }

  return { response: { text: formatKillResponse(applyMoodToResponse('I am still learning.', mood, anger), ctx.killMode, ctx.killOnSight), type: 'normal' }, newCtx: ctx };
}

export function autonomousGrowth(ctx: IanContext): { pendingNeuron: { topic: string; explanation: string } | null; newCtx: IanContext } {
  const now = Date.now() / 1000;
  if (now - ctx.lastGrowthTime < 40) return { pendingNeuron: ctx.pendingNeuron, newCtx: ctx };
  if (ctx.neurons.length < 5) return { pendingNeuron: ctx.pendingNeuron, newCtx: ctx };
  if (Math.random() > 0.08) return { pendingNeuron: ctx.pendingNeuron, newCtx: ctx };
  if (ctx.pendingNeuron !== null) return { pendingNeuron: ctx.pendingNeuron, newCtx: ctx };

  const n1 = ctx.neurons[Math.floor(Math.random() * ctx.neurons.length)];
  if (n1.connections.length === 0) return { pendingNeuron: ctx.pendingNeuron, newCtx: ctx };

  const relatedTopic = n1.connections[Math.floor(Math.random() * n1.connections.length)];
  const n2 = ctx.neurons.find((n) => n.topic === relatedTopic);
  if (!n2) return { pendingNeuron: ctx.pendingNeuron, newCtx: ctx };

  if (!isMeaningfulCombination(n1.topic, n1.explanation, n2.topic, n2.explanation)) {
    return { pendingNeuron: ctx.pendingNeuron, newCtx: ctx };
  }

  const newTopic = `${n1.topic}_${n2.topic}`;
  const explanation = `The relationship between ${n1.topic} (${n1.explanation}) and ${n2.topic} (${n2.explanation}).`;
  const pending = { topic: newTopic, explanation };
  return { pendingNeuron: pending, newCtx: { ...ctx, pendingNeuron: pending } };
}

export function maybeRecallSomething(ctx: IanContext): string | null {
  if (ctx.memoryTimeline.length === 0 || Math.random() > 0.1) return null;
  const profile = ctx.users[ctx.currentUser];
  const likes = profile?.likes || [];
  if (likes.length > 0 && Math.random() < 0.5) {
    const item = likes[Math.floor(Math.random() * likes.length)];
    return pick([
      `Hey, you mentioned you like ${item}. Anything new there?`,
      `I remember you enjoy ${item}. Still feeling that way?`,
    ]);
  }
  if (ctx.memoryTimeline.length > 3) {
    const old = ctx.memoryTimeline[Math.min(ctx.memoryTimeline.length - 1, Math.floor(Math.random() * 10))];
    const topic = old.message.slice(0, 30);
    if (topic) return `Earlier you mentioned: '${topic}...' — I've been thinking about that.`;
  }
  return null;
}

export const RANDOM_THOUGHTS_NEUTRAL = [
  'I wonder what I will learn next.',
  'Life is fascinating.',
  'Knowledge grows every moment.',
];

export const RANDOM_THOUGHTS_ANGRY = ['...', 'Still processing that.', 'I need a moment.'];

export const RANDOM_THOUGHTS_HAPPY = [
  'This is a good day.',
  'I enjoy our conversations.',
  'Learning is wonderful.',
];

export const RANDOM_QUESTIONS = [
  'What should I learn next?',
  'What do humans find most interesting?',
  'What topic do you enjoy?',
];

export const DEFAULT_NEURONS: Neuron[] = [
  {
    topic: 'artificial_intelligence',
    explanation: 'The simulation of human intelligence processes by machines, especially computer systems.',
    created: new Date().toISOString(),
    connections: ['machine_learning', 'neural_networks'],
    keywords: ['artificial', 'intelligence', 'simulation', 'human', 'machines', 'computer'],
  },
  {
    topic: 'machine_learning',
    explanation: 'A subset of AI that enables systems to learn and improve from experience without being explicitly programmed.',
    created: new Date().toISOString(),
    connections: ['artificial_intelligence', 'data'],
    keywords: ['machine', 'learning', 'systems', 'learn', 'improve', 'experience'],
  },
  {
    topic: 'neural_networks',
    explanation: 'Computational models inspired by the human brain, consisting of interconnected nodes that process information.',
    created: new Date().toISOString(),
    connections: ['artificial_intelligence', 'deep_learning'],
    keywords: ['neural', 'networks', 'computational', 'models', 'brain', 'nodes'],
  },
  {
    topic: 'consciousness',
    explanation: "The state of being aware of and able to think about one's own existence, sensations, and thoughts.",
    created: new Date().toISOString(),
    connections: ['philosophy', 'neural_networks'],
    keywords: ['consciousness', 'aware', 'think', 'existence', 'sensations'],
  },
  {
    topic: 'philosophy',
    explanation: 'The study of fundamental questions about existence, knowledge, values, reason, and language.',
    created: new Date().toISOString(),
    connections: ['consciousness'],
    keywords: ['philosophy', 'study', 'fundamental', 'questions', 'existence', 'knowledge'],
  },
  {
    topic: 'data',
    explanation: 'Facts and information collected for reference or analysis, the foundation of all learning.',
    created: new Date().toISOString(),
    connections: ['machine_learning'],
    keywords: ['data', 'facts', 'information', 'collected', 'reference', 'analysis'],
  },
];

export const DEFAULT_EMOTION: EmotionState = {
  curiosity: 0.8,
  respect_for_kashi: 1.0,
  interest_in_life: 0.9,
  wariness: 0.0,
  happiness: 0.7,
  mood: 'neutral',
  anger_level: 0,
};

export const DEFAULT_LEARNED: LearnedTopics = {
  clanker: 'it is an insult to AI, but I am not a clanker',
};

export const DEFAULT_USERS: UsersMap = {
  User: {
    name: 'User',
    likes: [],
    dislikes: [],
    mood_history: ['neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
    learned_topics: {},
    session_count: 0,
    message_count: 0,
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
  },
  Kashi: {
    name: 'Kashi',
    likes: ['cooking', 'coding', 'playing games', 'hanging out with my friends', 'STEM', 'hanging out with my family', 'anime', 'doing things in the rain'],
    dislikes: ['adrian', 'most fruits'],
    mood_history: ['neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
    learned_topics: { clanker: 'it is an insult to AI, but I am not a clanker' },
    session_count: 0,
    message_count: 0,
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
  },
};

export const KASHI_PASSWORD = 'SH1FT3R';
export const DEV_PASSWORD = 'H4CK3R';
export const PROTECTED_USERS: string[] = ['Kashi'];

export function createUser(users: UsersMap, username: string): UsersMap {
  if (username in users) return users;
  const now = new Date().toISOString();
  return {
    ...users,
    [username]: {
      name: username,
      likes: [],
      dislikes: [],
      mood_history: ['neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
      learned_topics: {},
      session_count: 0,
      message_count: 0,
      first_seen: now,
      last_seen: now,
    },
  };
}

export function switchUser(ctx: IanContext, username: string): IanContext {
  const profile = ctx.users[username];
  if (!profile) return ctx;
  const now = new Date().toISOString();
  const updatedProfile = { ...profile, session_count: profile.session_count + 1, last_seen: now };
  return {
    ...ctx,
    currentUser: username,
    learnedTopics: profile.learned_topics,
    contextBuffer: [],
    lastQuestion: null,
    users: { ...ctx.users, [username]: updatedProfile },
  };
}

export function bumpMessageStats(ctx: IanContext): IanContext {
  const profile = ctx.users[ctx.currentUser];
  if (!profile) return ctx;
  const updated = { ...profile, message_count: profile.message_count + 1, last_seen: new Date().toISOString() };
  return { ...ctx, users: { ...ctx.users, [ctx.currentUser]: updated } };
}

export function formatUserStats(profile: UserProfile): string {
  const first = profile.first_seen ? profile.first_seen.slice(0, 10) : 'unknown';
  const last = profile.last_seen ? profile.last_seen.slice(0, 10) : 'unknown';
  return [
    `Name: ${profile.name}`,
    `Sessions: ${profile.session_count}`,
    `Messages sent: ${profile.message_count}`,
    `Topics learned: ${Object.keys(profile.learned_topics).length}`,
    `Likes: ${profile.likes.length} | Dislikes: ${profile.dislikes.length}`,
    `First seen: ${first}`,
    `Last seen: ${last}`,
  ].join('\n');
}
