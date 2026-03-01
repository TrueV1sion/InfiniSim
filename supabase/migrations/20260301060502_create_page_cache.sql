/*
  # Create page cache table

  1. New Tables
    - `page_cache`
      - `id` (uuid, primary key)
      - `url` (text, not null) - the URL that was generated
      - `content` (text, not null) - the full HTML content
      - `model` (text, not null) - which AI model generated it
      - `deep_research` (boolean, default false) - whether deep research was used
      - `created_at` (timestamptz, default now())
      - `access_count` (integer, default 1) - number of times this cached page was served
      - `last_accessed_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `page_cache` table
    - Add policy for anonymous users to read cached pages (public cache)
    - Add policy for anonymous users to insert cached pages

  3. Indexes
    - Unique index on (url, model, deep_research) for cache lookups
*/

CREATE TABLE IF NOT EXISTS page_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  content text NOT NULL,
  model text NOT NULL DEFAULT 'gemini-3-flash-preview',
  deep_research boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  access_count integer NOT NULL DEFAULT 1,
  last_accessed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_page_cache_lookup
  ON page_cache (url, model, deep_research);

ALTER TABLE page_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached pages"
  ON page_cache
  FOR SELECT
  TO anon, authenticated
  USING (created_at > now() - interval '7 days');

CREATE POLICY "Anyone can insert cached pages"
  ON page_cache
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (char_length(content) > 0 AND char_length(url) > 0);

CREATE POLICY "Anyone can update access stats on cached pages"
  ON page_cache
  FOR UPDATE
  TO anon, authenticated
  USING (created_at > now() - interval '7 days')
  WITH CHECK (created_at > now() - interval '7 days');
