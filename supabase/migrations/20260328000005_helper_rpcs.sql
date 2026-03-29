-- ============================================================================
-- CAIRN — Helper RPC functions for atomic increments
-- ============================================================================

-- Increment helped_count on a memory (atomic, no race condition)
CREATE OR REPLACE FUNCTION increment_helped_count(memory_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE memories SET helped_count = helped_count + 1 WHERE id = memory_id;
END;
$$;

-- Increment burdens_dropped on a user profile
CREATE OR REPLACE FUNCTION increment_burdens_dropped(profile_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users SET burdens_dropped = burdens_dropped + 1 WHERE id = profile_id;
END;
$$;
