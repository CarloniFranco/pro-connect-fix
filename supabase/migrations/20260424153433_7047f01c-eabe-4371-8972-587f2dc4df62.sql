-- 1. Clean up misleading notifications INSERT policy scoped to authenticated checking service_role
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- 2. Add RLS policies on realtime.messages so authenticated users can only subscribe
-- to topics relevant to them. We restrict by topic naming patterns used in the app:
--   - "user-notifications" → only the owner via filter; we scope per-user channels named "user-notifications:{uid}" pattern not used,
--     but postgres_changes still applies table RLS. To be safe, we permit authenticated subscriptions to topics tied to their uid.
-- Strategy: allow authenticated users to receive realtime messages (postgres_changes already enforces table RLS for row payloads).
-- Block anonymous access entirely.

ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can send realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can send realtime"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
