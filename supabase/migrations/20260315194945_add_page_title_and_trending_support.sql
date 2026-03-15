/*
  # Add page title column and trending pages support

  1. Modified Tables
    - `page_cache`
      - Add `title` (text, default '') - extracted page title for display without parsing HTML
      - Add index on `hit_count` for efficient trending queries

  2. Security
    - Add read policy on `navigation_events` for anon users (needed for trending aggregation)

  3. Notes
    - Backfills existing rows by extracting title from html_content
    - The title column avoids needing to parse HTML client-side for trending display
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_cache' AND column_name = 'title'
  ) THEN
    ALTER TABLE page_cache ADD COLUMN title text NOT NULL DEFAULT '';
  END IF;
END $$;

UPDATE page_cache
SET title = coalesce(substring(html_content from '<title[^>]*>(.*?)</title>'), '')
WHERE title = '';

CREATE INDEX IF NOT EXISTS idx_page_cache_hit_count ON page_cache (hit_count DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon read navigation events for trending'
  ) THEN
    CREATE POLICY "Allow anon read navigation events for trending"
      ON navigation_events
      FOR SELECT
      TO anon, authenticated
      USING (created_at > now() - interval '7 days');
  END IF;
END $$;
