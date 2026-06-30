import { supabase } from '../lib/supabase';
import {
  type IanContext,
  type Neuron,
  type EmotionState,
  type LearnedTopics,
  type MemoryEntry,
  type ContextEntry,
  type UserProfile,
  DEFAULT_NEURONS,
  DEFAULT_EMOTION,
  DEFAULT_LEARNED,
  DEFAULT_PROFILE,
} from './engine';

export async function loadUserContext(userId: string): Promise<IanContext> {
  const [profileRes, emotionRes, neuronsRes, learnedRes, memoriesRes, contextRes] = await Promise.all([
    supabase.from('ian_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('ian_emotion_state').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('ian_neurons').select('*').eq('user_id', userId).order('created', { ascending: true }),
    supabase.from('ian_learned_topics').select('*').eq('user_id', userId).order('created', { ascending: true }),
    supabase.from('ian_memories').select('*').eq('user_id', userId).order('created', { ascending: true }).limit(100),
    supabase.from('ian_context').select('*').eq('user_id', userId).order('created', { ascending: true }),
  ]);

  const profile: UserProfile = profileRes.data
    ? {
        display_name: profileRes.data.display_name || '',
        likes: profileRes.data.likes || [],
        dislikes: profileRes.data.dislikes || [],
        session_count: profileRes.data.session_count || 0,
        message_count: profileRes.data.message_count || 0,
        first_seen: profileRes.data.first_seen || new Date().toISOString(),
        last_seen: profileRes.data.last_seen || new Date().toISOString(),
      }
    : { ...DEFAULT_PROFILE };

  const emotionState: EmotionState = emotionRes.data
    ? {
        curiosity: emotionRes.data.curiosity,
        respect_for_user: emotionRes.data.respect_for_user,
        interest_in_life: emotionRes.data.interest_in_life,
        wariness: emotionRes.data.wariness,
        happiness: emotionRes.data.happiness,
        mood: emotionRes.data.mood,
        anger_level: emotionRes.data.anger_level,
      }
    : { ...DEFAULT_EMOTION };

  const neurons: Neuron[] = (neuronsRes.data || []).map((n: any) => ({
    topic: n.topic,
    explanation: n.explanation,
    created: n.created,
    connections: n.connections || [],
    keywords: n.keywords || [],
  }));

  const learnedTopics: LearnedTopics = {};
  for (const l of (learnedRes.data || [])) {
    learnedTopics[l.topic] = l.explanation;
  }

  const memoryTimeline: MemoryEntry[] = (memoriesRes.data || []).map((m: any) => ({
    timestamp: m.created,
    message: m.message,
    response: m.response,
  }));

  const contextBuffer: ContextEntry[] = (contextRes.data || []).map((c: any) => ({
    user: c.user_msg,
    ian: c.ian_msg,
  }));

  const killMode = emotionRes.data?.kill_mode ?? false;
  const killOnSight = emotionRes.data?.kill_on_sight ?? false;

  return {
    neurons: neurons.length > 0 ? neurons : [...DEFAULT_NEURONS],
    learnedTopics: Object.keys(learnedTopics).length > 0 ? learnedTopics : { ...DEFAULT_LEARNED },
    emotionState,
    killMode,
    killOnSight,
    lastQuestion: null,
    pendingNeuron: null,
    lastGrowthTime: 0,
    contextBuffer,
    memoryTimeline,
    currentUser: profile.display_name || 'User',
    profile,
    devMode: false,
  };
}

export async function ensureProfile(userId: string, email: string): Promise<void> {
  const { data } = await supabase.from('ian_profiles').select('user_id').eq('user_id', userId).maybeSingle();
  if (!data) {
    await supabase.from('ian_profiles').insert({
      user_id: userId,
      display_name: email.split('@')[0],
    });
  }
}

export async function saveEmotionState(userId: string, ctx: IanContext): Promise<void> {
  await supabase.from('ian_emotion_state').upsert({
    user_id: userId,
    curiosity: ctx.emotionState.curiosity,
    respect_for_user: ctx.emotionState.respect_for_user,
    interest_in_life: ctx.emotionState.interest_in_life,
    wariness: ctx.emotionState.wariness,
    happiness: ctx.emotionState.happiness,
    mood: ctx.emotionState.mood,
    anger_level: ctx.emotionState.anger_level,
    kill_mode: ctx.killMode,
    kill_on_sight: ctx.killOnSight,
    updated_at: new Date().toISOString(),
  });
}

export async function saveProfile(userId: string, ctx: IanContext): Promise<void> {
  await supabase.from('ian_profiles').update({
    display_name: ctx.profile.display_name,
    likes: ctx.profile.likes,
    dislikes: ctx.profile.dislikes,
    session_count: ctx.profile.session_count,
    message_count: ctx.profile.message_count,
    last_seen: new Date().toISOString(),
  }).eq('user_id', userId);
}

export async function addMemory(userId: string, message: string, response: string): Promise<void> {
  await supabase.from('ian_memories').insert({
    user_id: userId,
    message,
    response,
  });
}

export async function addContextEntry(userId: string, userMsg: string, ianMsg: string): Promise<void> {
  await supabase.from('ian_context').insert({
    user_id: userId,
    user_msg: userMsg,
    ian_msg: ianMsg,
  });
  const { data } = await supabase.from('ian_context').select('id').eq('user_id', userId).order('created', { ascending: true });
  if (data && data.length > 10) {
    const toDelete = data.slice(0, data.length - 10).map((d: any) => d.id);
    await supabase.from('ian_context').delete().in('id', toDelete);
  }
}

export async function addNeuronToDb(userId: string, neuron: Neuron): Promise<void> {
  await supabase.from('ian_neurons').insert({
    user_id: userId,
    topic: neuron.topic,
    explanation: neuron.explanation,
    connections: neuron.connections,
    keywords: neuron.keywords,
    created: neuron.created,
  });
}

export async function addLearnedTopic(userId: string, topic: string, explanation: string): Promise<void> {
  await supabase.from('ian_learned_topics').upsert({
    user_id: userId,
    topic: topic.toLowerCase(),
    explanation,
  });
}

export async function wipeConversation(userId: string): Promise<void> {
  await supabase.from('ian_memories').delete().eq('user_id', userId);
  await supabase.from('ian_context').delete().eq('user_id', userId);
}

export async function wipeAllMemory(userId: string): Promise<void> {
  await supabase.from('ian_memories').delete().eq('user_id', userId);
  await supabase.from('ian_context').delete().eq('user_id', userId);
  await supabase.from('ian_neurons').delete().eq('user_id', userId);
  await supabase.from('ian_learned_topics').delete().eq('user_id', userId);
  await supabase.from('ian_emotion_state').delete().eq('user_id', userId);
}
