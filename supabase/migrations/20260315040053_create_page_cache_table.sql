/*
  # Create page_cache table

  1. New Tables
    - `page_cache`
      - `cache_key` (text, primary key) - SHA-256 hash of url + model
      - `url` (text, not null) - the original URL that was generated
      - `model` (text, not null) - the model tier used for generation
      - `html_content` (text, not null) - the full generated HTML
      - `created_at` (timestamptz, default now()) - when the cache entry was created
      - `ttl_hours` (integer, default 24) - time-to-live in hours
      - `hit_count` (integer, default 0) - number of cache hits

  2. Indexes
    - Index on `url` for lookups by URL
    - Index on `created_at` for TTL pruning

  3. Security
    - Enable RLS on `page_cache` table
    - Add policy for anonymous read access (cache is public content)
    - Add policy for anonymous insert/update access (any visitor can populate cache)
*/

CREATE TABLE IF NOT EXISTS page_cache (
  cache_key text PRIMARY KEY,
  url text NOT NULL,
  model text NOT NULL,
  html_content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  ttl_hours integer DEFAULT 24 NOT NULL,
  hit_count integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_page_cache_url ON page_cache (url);
CREATE INDEX IF NOT EXISTS idx_page_cache_created_at ON page_cache (created_at);

ALTER TABLE page_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached pages"
  ON page_cache
  FOR SELECT
  TO anon, authenticated
  USING (
    created_at + (ttl_hours || ' hours')::interval > now()
  );

CREATE POLICY "Anyone can insert cache entries"
  ON page_cache
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update cache hit counts"
  ON page_cache
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
