/*
# Create IAN per-user data tables

## Summary
This migration creates the full data layer for the IAN AI assistant, making all
state (neurons, learned topics, memories, context buffer, emotion state, profile)
fully per-user with Supabase Auth. Previously all data was in-memory and shared
across users with a hardcoded "Kashi" persona. Now each authenticated user gets
their own isolated IAN instance.

## New Tables

1. `ian_profiles` — Per-user profile metadata (likes, dislikes, stats)
   - `user_id` (uuid, PK, references auth.users) — one row per user
   - `display_name` (text)
   - `likes` (text[]) — things the user likes
   - `dislikes` (text[]) — things the user dislikes
   - `session_count` (int, default 0)
   - `message_count` (int, default 0)
   - `first_seen` (timestamptz, default now())
   - `last_seen` (timestamptz, default now())

2. `ian_emotion_state` — Per-user emotion state (one row per user)
   - `user_id` (uuid, PK, references auth.users)
   - `curiosity` (float, default 0.8)
   - `respect_for_user` (float, default 1.0) — renamed from respect_for_kashi
   - `interest_in_life` (float, default 0.9)
   - `wariness` (float, default 0.0)
   - `happiness` (float, default 0.7)
   - `mood` (text, default 'neutral')
   - `anger_level` (int, default 0)
   - `kill_mode` (bool, default false)
   - `kill_on_sight` (bool, default false)
   - `updated_at` (timestamptz, default now())

3. `ian_neurons` — Per-user knowledge graph nodes
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users)
   - `topic` (text)
   - `explanation` (text)
   - `connections` (text[]) — topics this neuron links to
   - `keywords` (text[]) — extracted keywords for matching
   - `created` (timestamptz, default now())

4. `ian_learned_topics` — Per-user learned facts
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users)
   - `topic` (text, unique per user)
   - `explanation` (text)
   - `created` (timestamptz, default now())

5. `ian_memories` — Per-user conversation memory timeline
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users)
   - `message` (text) — what the user said
   - `response` (text) — what IAN replied
   - `created` (timestamptz, default now())

6. `ian_context` — Per-user rolling context buffer (last 10 exchanges)
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users)
   - `user_msg` (text)
   - `ian_msg` (text)
   - `created` (timestamptz, default now())

## Security
- RLS enabled on ALL tables.
- All tables are owner-scoped: each authenticated user can only CRUD their own rows.
- `user_id` columns default to `auth.uid()` so inserts work without explicitly passing user_id.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE), scoped TO authenticated.
- All foreign keys reference auth.users with ON DELETE CASCADE (user deletion cleans up).
*/

-- 1. ian_profiles
CREATE TABLE IF NOT EXISTS ian_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  likes text[] NOT NULL DEFAULT '{}',
  dislikes text[] NOT NULL DEFAULT '{}',
  session_count int NOT NULL DEFAULT 0,
  message_count int NOT NULL DEFAULT 0,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ian_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON ian_profiles;
CREATE POLICY "select_own_profile" ON ian_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON ian_profiles;
CREATE POLICY "insert_own_profile" ON ian_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON ian_profiles;
CREATE POLICY "update_own_profile" ON ian_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON ian_profiles;
CREATE POLICY "delete_own_profile" ON ian_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 2. ian_emotion_state
CREATE TABLE IF NOT EXISTS ian_emotion_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  curiosity float NOT NULL DEFAULT 0.8,
  respect_for_user float NOT NULL DEFAULT 1.0,
  interest_in_life float NOT NULL DEFAULT 0.9,
  wariness float NOT NULL DEFAULT 0.0,
  happiness float NOT NULL DEFAULT 0.7,
  mood text NOT NULL DEFAULT 'neutral',
  anger_level int NOT NULL DEFAULT 0,
  kill_mode boolean NOT NULL DEFAULT false,
  kill_on_sight boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ian_emotion_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_emotion" ON ian_emotion_state;
CREATE POLICY "select_own_emotion" ON ian_emotion_state FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_emotion" ON ian_emotion_state;
CREATE POLICY "insert_own_emotion" ON ian_emotion_state FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_emotion" ON ian_emotion_state;
CREATE POLICY "update_own_emotion" ON ian_emotion_state FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_emotion" ON ian_emotion_state;
CREATE POLICY "delete_own_emotion" ON ian_emotion_state FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 3. ian_neurons
CREATE TABLE IF NOT EXISTS ian_neurons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  explanation text NOT NULL,
  connections text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  created timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ian_neurons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_neurons" ON ian_neurons;
CREATE POLICY "select_own_neurons" ON ian_neurons FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_neurons" ON ian_neurons;
CREATE POLICY "insert_own_neurons" ON ian_neurons FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_neurons" ON ian_neurons;
CREATE POLICY "update_own_neurons" ON ian_neurons FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_neurons" ON ian_neurons;
CREATE POLICY "delete_own_neurons" ON ian_neurons FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ian_neurons_user_id ON ian_neurons(user_id);

-- 4. ian_learned_topics
CREATE TABLE IF NOT EXISTS ian_learned_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  explanation text NOT NULL,
  created timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic)
);
ALTER TABLE ian_learned_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_learned" ON ian_learned_topics;
CREATE POLICY "select_own_learned" ON ian_learned_topics FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_learned" ON ian_learned_topics;
CREATE POLICY "insert_own_learned" ON ian_learned_topics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_learned" ON ian_learned_topics;
CREATE POLICY "update_own_learned" ON ian_learned_topics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_learned" ON ian_learned_topics;
CREATE POLICY "delete_own_learned" ON ian_learned_topics FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ian_learned_user_id ON ian_learned_topics(user_id);

-- 5. ian_memories
CREATE TABLE IF NOT EXISTS ian_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  response text NOT NULL,
  created timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ian_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_memories" ON ian_memories;
CREATE POLICY "select_own_memories" ON ian_memories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_memories" ON ian_memories;
CREATE POLICY "insert_own_memories" ON ian_memories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_memories" ON ian_memories;
CREATE POLICY "delete_own_memories" ON ian_memories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ian_memories_user_id ON ian_memories(user_id);

-- 6. ian_context
CREATE TABLE IF NOT EXISTS ian_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  user_msg text NOT NULL,
  ian_msg text NOT NULL,
  created timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ian_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_context" ON ian_context;
CREATE POLICY "select_own_context" ON ian_context FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_context" ON ian_context;
CREATE POLICY "insert_own_context" ON ian_context FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_context" ON ian_context;
CREATE POLICY "delete_own_context" ON ian_context FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ian_context_user_id ON ian_context(user_id);
