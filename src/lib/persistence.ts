import { supabase } from './supabase';
import type { IanContext } from '../ian/engine';
import { DEFAULT_NEURONS, DEFAULT_EMOTION, DEFAULT_LEARNED, DEFAULT_USERS } from '../ian/engine';

const STATE_ID = 1;

export async function loadIanState(): Promise<IanContext | null> {
  try {
    const { data, error } = await supabase
      .from('ian_state')
      .select('context')
      .eq('id', STATE_ID)
      .maybeSingle();

    if (error) {
      console.error('Error loading IAN state:', error);
      return null;
    }

    if (!data?.context) {
      return null;
    }

    const ctx = data.context as IanContext;

    // Validate and merge with defaults for any missing fields
    return {
      neurons: ctx.neurons || DEFAULT_NEURONS,
      learnedTopics: ctx.learnedTopics || DEFAULT_LEARNED,
      emotionState: ctx.emotionState || DEFAULT_EMOTION,
      killMode: ctx.killMode || false,
      killOnSight: ctx.killOnSight || false,
      lastQuestion: ctx.lastQuestion || null,
      pendingNeuron: ctx.pendingNeuron || null,
      lastGrowthTime: ctx.lastGrowthTime || 0,
      contextBuffer: ctx.contextBuffer || [],
      memoryTimeline: ctx.memoryTimeline || [],
      currentUser: ctx.currentUser || 'User',
      users: ctx.users || DEFAULT_USERS,
      devMode: ctx.devMode || false,
    };
  } catch (err) {
    console.error('Failed to load IAN state:', err);
    return null;
  }
}

export async function saveIanState(ctx: IanContext): Promise<boolean> {
  try {
    // Strip non-serializable or transient fields
    const toSave = {
      neurons: ctx.neurons,
      learnedTopics: ctx.learnedTopics,
      emotionState: ctx.emotionState,
      killMode: ctx.killMode,
      killOnSight: ctx.killOnSight,
      lastQuestion: ctx.lastQuestion,
      pendingNeuron: ctx.pendingNeuron,
      lastGrowthTime: ctx.lastGrowthTime,
      contextBuffer: ctx.contextBuffer,
      memoryTimeline: ctx.memoryTimeline,
      currentUser: ctx.currentUser,
      users: ctx.users,
      devMode: ctx.devMode,
    };

    const { error } = await supabase
      .from('ian_state')
      .upsert({
        id: STATE_ID,
        context: toSave,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving IAN state:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to save IAN state:', err);
    return false;
  }
}
