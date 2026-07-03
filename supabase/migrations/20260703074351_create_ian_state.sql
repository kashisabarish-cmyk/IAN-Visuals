/*
# Create IAN state table for persistence

1. New Tables
- `ian_state` - Stores the entire IAN context as JSON
  - `id` (int, primary key) - Single row with id = 1
  - `context` (jsonb) - Full IAN context (neurons, emotion, users, memory, etc.)
  - `updated_at` (timestamp) - Last save time

2. Security
- Enable RLS on `ian_state`.
- Allow anon + authenticated CRUD (single-tenant, no auth required).
- The app stores all IAN state in a single JSON blob for simplicity.
*/

CREATE TABLE IF NOT EXISTS ian_state (
  id int PRIMARY KEY DEFAULT 1,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Ensure only one row exists
INSERT INTO ian_state (id, context) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING;

ALTER TABLE ian_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ian_state" ON ian_state;
CREATE POLICY "anon_select_ian_state" ON ian_state FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ian_state" ON ian_state;
CREATE POLICY "anon_insert_ian_state" ON ian_state FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ian_state" ON ian_state;
CREATE POLICY "anon_update_ian_state" ON ian_state FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ian_state" ON ian_state;
CREATE POLICY "anon_delete_ian_state" ON ian_state FOR DELETE
  TO anon, authenticated USING (true);
