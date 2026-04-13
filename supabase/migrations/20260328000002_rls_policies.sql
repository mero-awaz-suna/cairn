-- ============================================================================
-- CAIRN — Row Level Security Policies + RBAC Enforcement
-- Every table has RLS enabled. No exceptions.
-- ============================================================================

-- ============================================================================
-- 1. USER ROLES — Only admins can manage roles
-- ============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own roles
CREATE POLICY "Users can read own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Admins can read all roles
CREATE POLICY "Admins can read all roles"
  ON user_roles FOR SELECT
  USING (public.auth_has_role('admin'));

-- Only admins can insert/update/delete roles
CREATE POLICY "Admins can manage roles"
  ON user_roles FOR ALL
  USING (public.auth_has_role('admin'))
  WITH CHECK (public.auth_has_role('admin'));

-- ============================================================================
-- 2. USERS — Self-access + admin override
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (supabase_auth_id = auth.uid());

-- Users can update their own profile (limited fields enforced at app layer)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (supabase_auth_id = auth.uid())
  WITH CHECK (supabase_auth_id = auth.uid());

-- Users can insert their own profile (onboarding)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (supabase_auth_id = auth.uid());

-- Admins can read all users
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (public.auth_has_role('admin'));

-- Admins can update any user (suspension, crisis flags)
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (public.auth_has_role('admin'));

-- ============================================================================
-- 3. JOURNAL ENTRIES — Strictly private to owner
-- ============================================================================

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own journal entries
CREATE POLICY "Users own their journal entries"
  ON journal_entries FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users WHERE supabase_auth_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

-- Admins can read (for safety review only, never modify)
CREATE POLICY "Admins can read journal entries"
  ON journal_entries FOR SELECT
  USING (public.auth_has_role('admin'));

-- ============================================================================
-- 4. BURDEN DROPS — Private to owner, themes are public via materialized view
-- ============================================================================

ALTER TABLE burden_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their burden drops"
  ON burden_drops FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users WHERE supabase_auth_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. BURDEN TAXONOMY — Public read, admin write
-- ============================================================================

ALTER TABLE burden_taxonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read taxonomy"
  ON burden_taxonomy FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage taxonomy"
  ON burden_taxonomy FOR ALL
  USING (public.auth_has_role('admin'))
  WITH CHECK (public.auth_has_role('admin'));

-- ============================================================================
-- 6. MEMORIES — Public read (approved only), admin write
-- ============================================================================

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Everyone can read approved memories (including anonymous/public)
CREATE POLICY "Public can read approved memories"
  ON memories FOR SELECT
  USING (is_approved = true);

-- Admins can read all memories (including pending moderation)
CREATE POLICY "Admins can read all memories"
  ON memories FOR SELECT
  USING (public.auth_has_role('admin'));

-- Authenticated users can insert (submit to moderation queue)
CREATE POLICY "Authenticated users can submit memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can update memories (approve/reject)
CREATE POLICY "Admins can moderate memories"
  ON memories FOR UPDATE
  USING (public.auth_has_role('admin'));

-- Admins can delete memories
CREATE POLICY "Admins can delete memories"
  ON memories FOR DELETE
  USING (public.auth_has_role('admin'));

-- ============================================================================
-- 7. CIRCLES — Members only
-- ============================================================================

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;

-- Users can read circles they are a member of
CREATE POLICY "Members can read their circles"
  ON circles FOR SELECT
  USING (
    id IN (
      SELECT cm.circle_id FROM circle_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE u.supabase_auth_id = auth.uid()
    )
  );

-- Admins can read all circles
CREATE POLICY "Admins can read all circles"
  ON circles FOR SELECT
  USING (public.auth_has_role('admin'));

-- Admins can update circles (close, intervene)
CREATE POLICY "Admins can manage circles"
  ON circles FOR ALL
  USING (public.auth_has_role('admin'))
  WITH CHECK (public.auth_has_role('admin'));

-- ============================================================================
-- 8. CIRCLE MEMBERS — Circle members can see each other
-- ============================================================================

ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members in their circles (anonymous aliases only)
CREATE POLICY "Circle members can see each other"
  ON circle_members FOR SELECT
  USING (
    circle_id IN (
      SELECT cm.circle_id FROM circle_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE u.supabase_auth_id = auth.uid()
    )
  );

-- Users can update their own membership (leave, save insight)
CREATE POLICY "Members can update own membership"
  ON circle_members FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users WHERE supabase_auth_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. MESSAGES — Only circle members can read/write
-- ============================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Circle members can read messages in their circles
CREATE POLICY "Circle members can read messages"
  ON messages FOR SELECT
  USING (
    circle_id IN (
      SELECT cm.circle_id FROM circle_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE u.supabase_auth_id = auth.uid()
      AND cm.left_at IS NULL
    )
  );

-- Circle members can send messages
CREATE POLICY "Circle members can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    circle_id IN (
      SELECT cm.circle_id FROM circle_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE u.supabase_auth_id = auth.uid()
      AND cm.left_at IS NULL
    )
  );

-- Admins can read all messages (safety monitoring)
CREATE POLICY "Admins can read all messages"
  ON messages FOR SELECT
  USING (public.auth_has_role('admin'));

-- ============================================================================
-- 10. USER PERSONA HISTORY — Private to owner
-- ============================================================================

ALTER TABLE user_persona_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their persona history"
  ON user_persona_history FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

CREATE POLICY "System can insert persona history"
  ON user_persona_history FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE supabase_auth_id = auth.uid()
    )
  );

-- ============================================================================
-- 11. RATE LIMIT EVENTS — No direct user access (service_role only)
-- ============================================================================

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;

-- No policies = no user access. service_role bypasses RLS.

-- ============================================================================
-- 12. AUDIT LOG — Append-only, no user access (service_role only)
-- ============================================================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read audit log
CREATE POLICY "Admins can read audit log"
  ON audit_log FOR SELECT
  USING (public.auth_has_role('admin'));

-- No update or delete policies — audit log is immutable

-- ============================================================================
-- 13. ENABLE REALTIME on messages table
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================================
-- 14. STORAGE BUCKET for audio recordings
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'journal-audio',
  'journal-audio',
  false,
  10485760, -- 10MB max
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own audio files
CREATE POLICY "Users can upload own audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'journal-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own audio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'journal-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'journal-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
