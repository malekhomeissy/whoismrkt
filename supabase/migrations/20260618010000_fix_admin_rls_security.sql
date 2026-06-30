-- ─────────────────────────────────────────────────────────────────────────────
-- Security fix: tighten admin_actions and trust_verifications RLS
--
-- Both tables previously had USING (true) / WITH CHECK (true) policies,
-- meaning any authenticated user could read/write them — including granting
-- themselves "verified" status or forging admin action log entries.
--
-- Fix:
--   admin_actions     → readable only by admins (via is_admin() RPC); no
--                       direct client writes (service-role / RPC only)
--   trust_verifications → users can read only their own row; no direct client
--                         writes (service-role / RPC only)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. admin_actions ──────────────────────────────────────────────────────────

-- Drop the permissive catch-all policy
DROP POLICY IF EXISTS "Admins manage admin_actions" ON public.admin_actions;

-- Admins can read the log via is_admin() RPC
CREATE POLICY "Admins can view action log"
  ON public.admin_actions FOR SELECT
  USING (public.is_admin());

-- No client INSERT / UPDATE / DELETE — all writes go through SECURITY DEFINER RPCs
-- (Absence of a write policy = no client-side writes allowed when RLS is enabled)

-- ── 2. trust_verifications ────────────────────────────────────────────────────

-- Drop the permissive catch-all policy
DROP POLICY IF EXISTS "Service role manages verifications" ON public.trust_verifications;

-- Users may only read their own verification record
CREATE POLICY "Users view own verification"
  ON public.trust_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- No direct client INSERT / UPDATE / DELETE — all writes go through
-- admin_verify_creator() SECURITY DEFINER RPC which checks is_admin()

-- ── 3. Drop the unsafe 4-param admin_verify_creator (no auth check) ──────────
--
-- launch_readiness migration (20260615200000) created:
--   admin_verify_creator(uuid, uuid, text DEFAULT 'manual', text DEFAULT NULL)
-- This function had SECURITY DEFINER but NO is_admin() guard, allowing any
-- authenticated user to grant verified status to any creator.
--
-- The admin_security migration (20260616000000) only dropped the 3-param
-- signature and recreated it safely. The 4-param version survived unprotected.
-- Drop it now.

DROP FUNCTION IF EXISTS public.admin_verify_creator(uuid, uuid, text, text);

-- The safe 3-param version (from admin_security migration) remains in place.
-- It is the canonical admin_verify_creator going forward.
