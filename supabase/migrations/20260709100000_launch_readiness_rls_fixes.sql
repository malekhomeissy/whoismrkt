-- ─────────────────────────────────────────────────────────────────────────────
-- Launch readiness: critical RLS/RPC fixes
--
-- Source: July 2026 pre-launch due diligence audit. Every fix below closes an
-- exploit that was confirmed by direct code review of the shipped policy/RPC
-- definitions (not just theoretical). Each section states: what the bug was,
-- what the fix is, and how the three paths that matter are preserved:
--   (a) the legitimate user action this table/RPC exists for still works
--   (b) the attacker path that was open is now rejected
--   (c) admin / service-role / trigger paths (which run as table owner and
--       bypass RLS regardless) are unaffected
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. campaign_applications — block creator self-approval
-- ═══════════════════════════════════════════════════════════════════════════
-- Bug: "Creators manage own applications" is a permissive FOR ALL policy with
-- no restriction on which columns change. Because RLS policies are OR'd
-- together, a creator's direct PATCH to their own application row satisfies
-- that policy regardless of what `status` they set — they could PATCH
-- straight to 'accepted', bypassing the business's review entirely.
--
-- Fix: a BEFORE trigger (triggers see OLD vs NEW regardless of which RLS
-- policy admitted the statement, so this closes the hole without touching
-- the existing INSERT/SELECT policies creators legitimately need).
--   (a) Legitimate: creator INSERTs a new application (status defaults to
--       'pending') — untouched. Business PATCHes status via the existing
--       "Campaign owners can update application status" policy — the trigger
--       sees the campaign owner as EXISTS-true and allows it.
--   (b) Attacker: creator PATCHes their own row to status='accepted' — the
--       trigger finds they are not the campaign owner and not an admin, and
--       raises, aborting the statement.
--   (c) service_role / admin: auth.uid() is NULL for service-role callers
--       (no user JWT in context) or public.is_admin() is true — both skip
--       the block.

CREATE OR REPLACE FUNCTION public.guard_application_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_is_owner boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = NEW.campaign_id AND c.user_id = auth.uid()
  ) INTO v_is_owner;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending'
       AND auth.uid() IS NOT NULL
       AND NOT v_is_owner
       AND NOT public.is_admin()
    THEN
      RAISE EXCEPTION 'New applications must start as pending';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND auth.uid() IS NOT NULL
       AND NOT v_is_owner
       AND NOT public.is_admin()
    THEN
      RAISE EXCEPTION 'Only the campaign owner can change application status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_application_status_change ON public.campaign_applications;
CREATE TRIGGER guard_application_status_change
  BEFORE INSERT OR UPDATE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_application_status_change();


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. campaign_deliverable_submissions — block creator self-approval
-- ═══════════════════════════════════════════════════════════════════════════
-- Bug: identical shape to (1). "Creator manages own deliverable submissions"
-- is FOR ALL with no column restriction — a creator could PATCH their own
-- submission straight to status='approved', which fires
-- notify_on_deliverable_approved AND (via the wave1_trust_v2 trigger) directly
-- inflates their own trust score.
--
-- Fix: creator may still freely move through the states they own
-- (not_started → in_progress → submitted); only 'approved' and
-- 'revision_requested' — the business's review verdicts — are gated.
--   (a) Legitimate: creator marks submitted; business marks approved via the
--       existing "Business reviews deliverable submissions" policy (already
--       scoped to business_id = auth.uid()) — trigger sees them as the
--       business and allows it.
--   (b) Attacker: creator PATCHes status='approved' on their own row — not
--       business_id, not admin → rejected.
--   (c) service_role/admin bypass as in (1).

CREATE OR REPLACE FUNCTION public.guard_deliverable_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('approved', 'revision_requested') THEN
      IF auth.uid() IS NOT NULL
         AND auth.uid() <> NEW.business_id
         AND NOT public.is_admin()
      THEN
        RAISE EXCEPTION 'Only the business (or admin) can approve or request revisions on a deliverable';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_deliverable_status_change ON public.campaign_deliverable_submissions;
CREATE TRIGGER guard_deliverable_status_change
  BEFORE UPDATE ON public.campaign_deliverable_submissions
  FOR EACH ROW EXECUTE FUNCTION public.guard_deliverable_status_change();


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. notifications — remove WITH CHECK (true) on INSERT
-- ═══════════════════════════════════════════════════════════════════════════
-- Bug: "System inserts notifications" was WITH CHECK (true), no role
-- restriction — any anon/authenticated client could insert a notification
-- for any user_id. The original comment assumed SECURITY DEFINER triggers
-- "bypass this policy" — true, but only because those functions are owned
-- by a superuser-equivalent migration role, not because of anything this
-- policy does; the policy itself was wide open to normal clients the whole
-- time.
--
-- Fix: drop the permissive policy; add one scoped to service_role only.
--   (a) Legitimate: every notification insert in this codebase happens
--       inside a SECURITY DEFINER trigger function (notify_on_new_message,
--       notify_on_new_application, notify_on_application_status,
--       notify_on_deliverable_approved, notify_on_contract_sent/insert) or
--       from an edge function using the service-role key — both bypass RLS
--       entirely (trigger functions run as their owning role; service_role
--       has BYPASSRLS). Neither depends on this policy at all.
--   (b) Attacker: a direct authenticated-client INSERT into notifications no
--       longer matches any policy → rejected.
--   (c) service_role: explicit policy below covers any edge function that
--       inserts directly via the service-role client rather than a trigger.

DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;

CREATE POLICY "Service role inserts notifications"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ai_credits — block self-granting Pro / unlimited credits on INSERT
-- ═══════════════════════════════════════════════════════════════════════════
-- Bug: fix_ai_credits_rls (20260630000000) revoked UPDATE but left the
-- original INSERT policy — WITH CHECK (auth.uid() = user_id) with no
-- restriction on is_pro/total_credits/used_credits — untouched. A first-time
-- user could POST a row with is_pro=true and total_credits=999999 before
-- consume_ai_credits() ever creates their default row.
--
-- Fix: the INSERT policy now only admits the exact default-row shape,
-- matching the table's own DEFAULTs. Any tampered values fail WITH CHECK.
--   (a) Legitimate: consume_ai_credits() (SECURITY DEFINER, bypasses RLS)
--       already creates the first-time row server-side — this client policy
--       is not required for normal operation, it only needs to not block
--       anything real. No client code path inserts into ai_credits directly
--       (grep confirms only consume_ai_credits() and admin_set_pro_status()
--       write to this table).
--   (b) Attacker: POST {user_id: self, is_pro: true, total_credits: 999999}
--       → WITH CHECK fails on is_pro/total_credits mismatch → rejected.
--   (c) admin_set_pro_status() / consume_ai_credits() are SECURITY DEFINER
--       and bypass RLS entirely, unaffected by this policy either way.

DROP POLICY IF EXISTS "Users can insert own credits" ON public.ai_credits;

CREATE POLICY "Users can insert only their own default credit row"
  ON public.ai_credits FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_pro = false
    AND total_credits = 200
    AND used_credits = 0
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. consume_ai_credits() — add caller-ownership check, lock down EXECUTE
-- ═══════════════════════════════════════════════════════════════════════════
-- Bug: SECURITY DEFINER function accepted an arbitrary p_user_id with no
-- check that the caller owns that ID, and PostgreSQL grants EXECUTE to
-- PUBLIC by default on function creation — no migration ever revoked it.
-- Any authenticated client could call consume_ai_credits(victim_id, cost)
-- directly via PostgREST's RPC endpoint and drain another user's credits.
--
-- Fix: revoke PUBLIC/anon/authenticated execute (service_role keeps it —
-- already granted explicitly in the original migration), and add an
-- in-function guard as defense in depth in case grants ever drift again.
--   (a) Legitimate: content-plan-generate calls this via the service-role
--       client with p_user_id = the caller's own verified auth.uid() — the
--       REVOKE doesn't affect service_role, and the in-function check
--       (auth.role() = 'service_role') passes.
--   (b) Attacker: PostgREST call as `authenticated` role is rejected before
--       the function body even runs (no EXECUTE grant); even if grants were
--       ever restored, the in-function check would reject p_user_id !=
--       auth.uid() unless the caller is service_role.
--   (c) service_role calls (edge functions) are unaffected.

REVOKE EXECUTE ON FUNCTION public.consume_ai_credits(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_ai_credits(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_ai_credits(uuid, integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_ai_credits(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_ai_credits(
  p_user_id uuid,
  p_cost    integer
)
RETURNS TABLE(allowed boolean, remaining integer, is_pro boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total   integer;
  v_used    integer;
  v_reset   timestamptz;
  v_is_pro  boolean;
BEGIN
  IF auth.role() <> 'service_role' AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to consume credits for another user';
  END IF;

  -- Ensure a row exists for first-time users
  INSERT INTO public.ai_credits (user_id, total_credits, used_credits, reset_at, is_pro)
  VALUES (p_user_id, 200, 0, now() + interval '1 month', false)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock the row for the duration of this transaction to serialize concurrent calls
  SELECT ac.total_credits, ac.used_credits, ac.reset_at, ac.is_pro
    INTO v_total, v_used, v_reset, v_is_pro
    FROM public.ai_credits ac
    WHERE ac.user_id = p_user_id
    FOR UPDATE;

  -- Monthly reset if due
  IF v_reset IS NOT NULL AND v_reset < now() THEN
    v_used  := 0;
    v_reset := now() + interval '1 month';
    UPDATE public.ai_credits
      SET used_credits = 0, reset_at = v_reset
      WHERE user_id = p_user_id;
  END IF;

  IF v_is_pro THEN
    RETURN QUERY SELECT true, (v_total - v_used), true;
    RETURN;
  END IF;

  IF (v_total - v_used) < p_cost THEN
    RETURN QUERY SELECT false, (v_total - v_used), false;
    RETURN;
  END IF;

  UPDATE public.ai_credits
    SET used_credits = v_used + p_cost
    WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, (v_total - v_used - p_cost), false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_ai_credits(uuid, integer) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. conversation_participants — require real membership on INSERT
-- ═══════════════════════════════════════════════════════════════════════════
-- Bug: "Authenticated can add participant" checked only auth.uid() IS NOT
-- NULL — not that the inserted user_id was the caller, nor that the caller
-- belongs to that conversation. Because SELECT on messages/conversations
-- gates purely on conversation_participants membership, anyone who obtained
-- a conversation_id (embedded in notification links: '/messages/' ||
-- conversation_id) could self-insert as a participant and read a private
-- thread.
--
-- Fix: the only code path that creates conversations/participants is
-- find_or_create_conversation() (SECURITY DEFINER, bypasses RLS entirely —
-- confirmed via grep that no frontend code calls
-- .from("conversation_participants").insert(...) directly). So the client
-- policy can be tightened to "only an existing participant may add a new
-- participant to that same conversation" with no legitimate path broken.
--   (a) Legitimate: find_or_create_conversation() runs as table owner and
--       is unaffected by this policy either way.
--   (b) Attacker: direct INSERT of {conversation_id: <leaked id>, user_id:
--       self} — caller is not yet a participant of that conversation, so
--       the EXISTS check fails → rejected.
--   (c) service_role bypasses RLS entirely, unaffected.

DROP POLICY IF EXISTS "Authenticated can add participant" ON public.conversation_participants;

CREATE POLICY "Existing participant can add a participant"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. contracts — creator cannot rewrite terms while accepting/declining
-- ═══════════════════════════════════════════════════════════════════════════
-- Bug: "Creator responds to contracts" correctly restricts the *status*
-- transition (USING status='sent', WITH CHECK status IN
-- ('accepted','declined')) but does not restrict any other column. A
-- creator PATCHing directly (bypassing the properly-scoped sign_contract()
-- RPC the app actually uses) could rewrite amount_cents, terms,
-- usage_rights, etc. in the same request that accepts.
--
-- Fix: a BEFORE trigger blocks the creator from changing any term-bearing
-- column. sign_contract() only ever touches status/accepted_at/declined_at/
-- signed_at/signer_*/contract_snapshot — none of which are guarded — so the
-- legitimate accept/decline flow is untouched.
--   (a) Legitimate: business edits terms freely (auth.uid() = business_id is
--       excluded from the guard). Creator calls sign_contract(), which only
--       touches signing-metadata columns — none trigger the guard.
--   (b) Attacker: creator PATCHes {status: 'accepted', amount_cents: 1} in
--       one request — amount_cents changed while acting as the creator (not
--       business, not admin) → rejected.
--   (c) admin/service_role bypass as elsewhere.

CREATE OR REPLACE FUNCTION public.guard_contract_terms_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.creator_id
     AND auth.uid() <> OLD.business_id
     AND NOT public.is_admin()
  THEN
    IF NEW.title             IS DISTINCT FROM OLD.title
    OR NEW.terms              IS DISTINCT FROM OLD.terms
    OR NEW.campaign_title     IS DISTINCT FROM OLD.campaign_title
    OR NEW.campaign_id        IS DISTINCT FROM OLD.campaign_id
    OR NEW.business_id        IS DISTINCT FROM OLD.business_id
    OR NEW.creator_id         IS DISTINCT FROM OLD.creator_id
    OR NEW.deliverables_json  IS DISTINCT FROM OLD.deliverables_json
    OR NEW.amount_cents       IS DISTINCT FROM OLD.amount_cents
    OR NEW.currency           IS DISTINCT FROM OLD.currency
    OR NEW.due_date           IS DISTINCT FROM OLD.due_date
    OR NEW.ownership_clause   IS DISTINCT FROM OLD.ownership_clause
    OR NEW.usage_rights       IS DISTINCT FROM OLD.usage_rights
    OR NEW.cancellation_terms IS DISTINCT FROM OLD.cancellation_terms
    OR NEW.business_name      IS DISTINCT FROM OLD.business_name
    OR NEW.creator_name       IS DISTINCT FROM OLD.creator_name
    OR NEW.platform_fee_pct   IS DISTINCT FROM OLD.platform_fee_pct
    OR NEW.payment_status     IS DISTINCT FROM OLD.payment_status
    THEN
      RAISE EXCEPTION 'Creators may not modify contract terms while accepting or declining — use sign_contract()';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_contract_terms_immutable ON public.contracts;
CREATE TRIGGER guard_contract_terms_immutable
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.guard_contract_terms_immutable();


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. admin_suspend_user — fix broken constraint, wire up the real enforcement
--    column, add the reverse operation
-- ═══════════════════════════════════════════════════════════════════════════
-- Bug: admin_suspend_user set creator_profiles.status = 'suspended', but
-- that column's CHECK constraint only allows
-- ('incomplete','pending_review','active','hidden') — the UPDATE always
-- violates the constraint and the whole RPC fails. Meanwhile discovery/
-- search (search_creators(), creator_discovery_ranked) actually filters on
-- a different column entirely: profiles.suspended_at. There was no working
-- way to suspend an abusive account.
--
-- Fix: widen the creator_profiles status constraint to include 'suspended'
-- (keeps status semantically meaningful for profile UI/admin tooling), and
-- have the RPC set profiles.suspended_at — the column every discovery/search
-- path actually checks. Add admin_unsuspend_user as the reverse operation;
-- a one-way kill switch isn't a usable moderation tool.
--   (a) Legitimate: admin calls admin_suspend_user(target, admin, reason) —
--       is_admin() gate unchanged, now succeeds instead of raising a
--       constraint violation, and the user is actually excluded from
--       search_creators()/discovery going forward.
--   (b) Attacker: is_admin() gate is unchanged — non-admins still rejected
--       immediately, before either UPDATE runs.
--   (c) N/A — this is an admin-only RPC; there is no "normal user" path.

ALTER TABLE public.creator_profiles
  DROP CONSTRAINT IF EXISTS creator_profiles_status_check;

ALTER TABLE public.creator_profiles
  ADD CONSTRAINT creator_profiles_status_check
  CHECK (status IN ('incomplete', 'pending_review', 'active', 'hidden', 'suspended'));

CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_user_id  uuid,
  p_admin_id uuid,
  p_reason   text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.creator_profiles
  SET status = 'suspended'
  WHERE user_id = p_user_id;

  UPDATE public.profiles
  SET suspended_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.admin_action_log (admin_id, action, target_id, target_type, payload)
  VALUES (auth.uid(), 'suspend_user', p_user_id, 'profile', jsonb_build_object('reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(
  p_user_id  uuid,
  p_admin_id uuid,
  p_note     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.creator_profiles
  SET status = 'active'
  WHERE user_id = p_user_id AND status = 'suspended';

  UPDATE public.profiles
  SET suspended_at = NULL
  WHERE id = p_user_id;

  INSERT INTO public.admin_action_log (admin_id, action, target_id, target_type, payload)
  VALUES (auth.uid(), 'unsuspend_user', p_user_id, 'profile', jsonb_build_object('note', p_note));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_suspend_user(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_suspend_user(uuid, uuid, text) TO authenticated;
-- (kept grantable to `authenticated` — is_admin() inside the function is the
--  real gate, matching the existing pattern for every other admin_* RPC in
--  this codebase, e.g. admin_grant_pioneer/admin_revoke_pioneer above.)
REVOKE EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid, uuid, text) TO authenticated;
