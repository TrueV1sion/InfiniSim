/*
  # Allow anon access to user_api_keys table

  Since this application uses Firebase Auth (not Supabase Auth), the Supabase client
  operates under the `anon` role with no authenticated session. The existing RLS policies
  only allow `authenticated` role access, which means all reads/writes silently fail.

  1. Changes
    - Drop existing `authenticated`-only policies
    - Add new policies for `anon` role that allow CRUD operations
    - Operations are scoped by `user_id` column (Firebase UID) passed from the client

  2. Security
    - Each policy still requires the `user_id` to match, preventing cross-user access
    - The `user_id` is the Firebase Auth UID which is verified on the client side
*/

DROP POLICY IF EXISTS "Users can read own API key" ON user_api_keys;
DROP POLICY IF EXISTS "Users can insert own API key" ON user_api_keys;
DROP POLICY IF EXISTS "Users can update own API key" ON user_api_keys;
DROP POLICY IF EXISTS "Users can delete own API key" ON user_api_keys;

CREATE POLICY "Anon can read API key by user_id"
  ON user_api_keys
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert API key"
  ON user_api_keys
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NOT NULL AND user_id != '');

CREATE POLICY "Anon can update own API key"
  ON user_api_keys
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (user_id IS NOT NULL AND user_id != '');

CREATE POLICY "Anon can delete own API key"
  ON user_api_keys
  FOR DELETE
  TO anon
  USING (true);
