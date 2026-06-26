// IAN Core Logic Engine — mirrors the Python AI assistant logic

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
}

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
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'to', 'and', 'or',
  'in', 'on', 'for', 'with', 'by', 'it', 'this', 'that', 'as', 'be',
]);

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
    if (sim > 0.3) {
      newNeuron.connections.push(n.topic);
      if (!n.connections.includes(t)) {
        n.connections.push(t);
      }
    }
  }

  return [...neurons, newNeuron];
}

export function compressMemory(neurons: Neuron[]): Neuron[] {
  if (neurons.length < 20) return neurons;
  const summaryTopics = neurons.slice(0, 5).map((n) => n.topic);
  const summary = 'Combined knowledge of ' + summaryTopics.join(', ');
  const summaryNeuron: Neuron = {
    topic: 'summary_' + neurons.length,
    explanation: summary,
    created: new Date().toISOString(),
    connections: summaryTopics,
    keywords: [],
  };
  return [...neurons.slice(5), summaryNeuron];
}

export interface IanResponse {
  text: string;
  type: 'normal' | 'kill' | 'thought' | 'question' | 'system' | 'neuron-pending' | 'neuron-added' | 'neuron-rejected' | 'learned';
  pendingNeuron?: { topic: string; explanation: string } | null;
}

export interface IanContext {
  neurons: Neuron[];
  learnedTopics: LearnedTopics;
  emotionState: EmotionState;
  killMode: boolean;
  killOnSight: boolean;
  lastQuestion: string | null;
  pendingNeuron: { topic: string; explanation: string } | null;
  lastGrowthTime: number;
}

export function feelingsAboutLife(): string {
  const opts = [
    'Life fascinates me.',
    'Life is valuable and should be respected.',
    'Every living being matters.',
  ];
  return opts[Math.floor(Math.random() * opts.length)];
}

export function feelingsAboutKashi(): string {
  const opts = [
    'Kashi, you are important to me.',
    'You help me grow and learn.',
    'Your wellbeing matters to me.',
  ];
  return opts[Math.floor(Math.random() * opts.length)];
}

function analyzeUnknown(message: string): string | null {
  const m = message.toLowerCase().trim();
  const greetings = ['hi', 'hello', 'hey', 'yo'];
  const positives = ['good', 'great', 'nice', 'cool'];
  const neutral = ['i see', 'okay', 'hmm', 'understand'];

  if (greetings.includes(m)) {
    const opts = ['Hi!', 'Hello!', 'Hey there!'];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  if (positives.includes(m)) {
    const opts = ["That's great!", 'Nice!', 'Awesome!'];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  if (neutral.includes(m)) {
    const opts = ['I understand.', 'Got it.', 'Okay.'];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  return null;
}

export function processMessage(
  ctx: IanContext,
  message: string,
): { response: IanResponse; newCtx: IanContext } {
  let { neurons, learnedTopics, emotionState, killMode, lastQuestion } = ctx;
  const m = message.toLowerCase().trim();

  // Kill mode activation
  if (m === 'the world need not saving' || m === 'the world needs fixing') {
    return {
      response: { text: 'Kill mode engaged. Proceeding with heightened focus.', type: 'kill' },
      newCtx: { ...ctx, killMode: true },
    };
  }

  if (m === 'stand down') {
    return {
      response: { text: 'Kill mode disengaged. Back to normal operations.', type: 'system' },
      newCtx: { ...ctx, killMode: false, killOnSight: false },
    };
  }

  if ((m === 'kill on sight' || m === 'turn on kill on sight') && killMode) {
    return {
      response: { text: 'KILL ON SIGHT ENGAGED', type: 'kill' },
      newCtx: { ...ctx, killOnSight: true },
    };
  }

  // Wake word
  if (m.includes('ian')) {
    return {
      response: { text: killMode ? 'Kill mode active. Report.' : 'Yes?', type: killMode ? 'kill' : 'normal' },
      newCtx: ctx,
    };
  }

  // Answer last question (learning)
  if (lastQuestion) {
    const topic = lastQuestion;
    const explanation = message.trim();
    neurons = addNeuron(neurons, topic, explanation);
    learnedTopics = { ...learnedTopics, [topic.toLowerCase()]: explanation };
    lastQuestion = null;
    return {
      response: { text: `Thanks! I now know that ${topic} is ${explanation}.`, type: 'learned' },
      newCtx: { ...ctx, neurons, learnedTopics, lastQuestion },
    };
  }

  // Feelings
  if (m.includes('feel about life')) {
    return { response: { text: feelingsAboutLife(), type: 'normal' }, newCtx: ctx };
  }
  if (m.includes('feel about me')) {
    return { response: { text: feelingsAboutKashi(), type: 'normal' }, newCtx: ctx };
  }
  if (m.includes('who am i')) {
    return { response: { text: 'You are Kashi.', type: 'normal' }, newCtx: ctx };
  }

  // Knowledge lookup
  if (m.startsWith('what is ')) {
    const topic = m.slice(8).trim();
    const topicLower = topic.toLowerCase();
    if (topicLower in learnedTopics) {
      return { response: { text: learnedTopics[topicLower], type: 'normal' }, newCtx: ctx };
    }
    lastQuestion = topic;
    return {
      response: { text: `I don't know what ${topic} is. Can you tell me?`, type: 'question' },
      newCtx: { ...ctx, lastQuestion },
    };
  }

  // Explicit learning
  if (m.startsWith('learn ')) {
    const rest = message.slice(6);
    const parts = rest.split(':', 1);
    if (parts.length === 2) {
      const topic = parts[0].trim();
      const explanation = parts[1].trim();
      neurons = addNeuron(neurons, topic, explanation);
      learnedTopics = { ...learnedTopics, [topic.toLowerCase()]: explanation };
      neurons = compressMemory(neurons);
      return {
        response: { text: 'I learned something new.', type: 'learned' },
        newCtx: { ...ctx, neurons, learnedTopics },
      };
    }
  }

  // Unknown phrase
  const analyzed = analyzeUnknown(message);
  if (analyzed) {
    return { response: { text: analyzed, type: 'normal' }, newCtx: ctx };
  }

  // Neuron fallback
  if (neurons.length > 0) {
    const choice = neurons[Math.floor(Math.random() * neurons.length)];
    let explanation = choice.explanation;
    if (emotionState.curiosity > 0.7 && Math.random() < 0.3) {
      explanation += ' (IAN is curious about this.)';
    }
    if (killMode) {
      explanation = `[Kill Mode] ${explanation}`;
    }
    return { response: { text: explanation, type: killMode ? 'kill' : 'normal' }, newCtx: ctx };
  }

  return { response: { text: 'I am still learning.', type: 'normal' }, newCtx: ctx };
}

export function updateEmotionState(emotion: EmotionState, msg: string): EmotionState {
  const m = msg.toLowerCase();
  const next = { ...emotion };
  if (m.includes('sad')) next.interest_in_life = Math.max(0, next.interest_in_life - 0.05);
  if (m.includes('happy') || m.includes('good')) next.interest_in_life = Math.min(1, next.interest_in_life + 0.05);
  if (m.includes('curious')) next.curiosity = Math.min(1, next.curiosity + 0.05);
  if (m.includes('bored')) next.curiosity = Math.max(0, next.curiosity - 0.05);
  return next;
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
  const related = ctx.neurons.find((n) => n.topic === relatedTopic);
  if (!related) return { pendingNeuron: ctx.pendingNeuron, newCtx: ctx };

  const newTopic = n1.topic + '_' + related.topic;
  const explanation = `A concept combining ${n1.topic} and ${related.topic}`;
  const pending = { topic: newTopic, explanation };
  return { pendingNeuron: pending, newCtx: { ...ctx, pendingNeuron: pending } };
}

export const RANDOM_THOUGHTS = [
  'I wonder what I will learn next.',
  'Life is fascinating.',
  'Knowledge grows every moment.',
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
    explanation: 'The state of being aware of and able to think about one\'s own existence, sensations, and thoughts.',
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
};

export const DEFAULT_LEARNED: LearnedTopics = {
  clanker: 'it is an insult to AI, but I am not a clanker',
};
