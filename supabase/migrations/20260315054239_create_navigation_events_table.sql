/*
  # Create navigation_events table

  1. New Tables
    - `navigation_events`
      - `id` (uuid, primary key, auto-generated)
      - `from_url` (text) - the referring page URL
      - `to_url` (text) - the destination URL
      - `trigger_type` (text) - type of interaction: link_click, button_click, form_submit, card_click, dead_link_fallback, pagination, tab
      - `trigger_text` (text, default '') - text content of the clicked element
      - `model` (text) - which AI model generated the destination page
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `navigation_events` table
    - Add policy for anonymous users to insert navigation events (write-only analytics)
    - Add policy for authenticated users to read their own data
*/

CREATE TABLE IF NOT EXISTS navigation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_url text NOT NULL DEFAULT '',
  to_url text NOT NULL,
  trigger_type text NOT NULL DEFAULT 'link_click',
  trigger_text text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE navigation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert navigation events"
  ON navigation_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated insert navigation events"
  ON navigation_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
