/*
  # Create increment_access_count RPC function

  1. New Functions
    - `increment_access_count(page_id uuid)` - atomically increments access_count and updates last_accessed_at
*/

CREATE OR REPLACE FUNCTION increment_access_count(page_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE page_cache
  SET access_count = access_count + 1,
      last_accessed_at = now()
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
