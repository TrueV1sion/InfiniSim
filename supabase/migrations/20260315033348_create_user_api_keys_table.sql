/*
  # Create User API Keys Table

  1. New Tables
    - `user_api_keys`
      - `user_id` (text, primary key) - Firebase Auth user ID
      - `gemini_api_key` (text) - User's Google Gemini API key
      - `created_at` (timestamptz) - When the key was first added
      - `updated_at` (timestamptz) - When the key was last updated
      - `is_valid` (boolean) - Whether the key has been validated
  
  2. Security
    - Enable RLS on `user_api_keys` table
    - Add policy for authenticated users to read their own API key
    - Add policy for authenticated users to insert their own API key
    - Add policy for authenticated users to update their own API key
    - Add policy for authenticated users to delete their own API key
  
  3. Notes
    - API keys are stored as plain text with RLS protection
    - Each user can have only one API key (enforced by primary key)
    - The `user_id` should match the Firebase Auth UID
*/

CREATE TABLE IF NOT EXISTS user_api_keys (
  user_id text PRIMARY KEY,
  gemini_api_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_valid boolean DEFAULT false
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own API key"
  ON user_api_keys
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own API key"
  ON user_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own API key"
  ON user_api_keys
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'sub' = user_id)
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own API key"
  ON user_api_keys
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'sub' = user_id);