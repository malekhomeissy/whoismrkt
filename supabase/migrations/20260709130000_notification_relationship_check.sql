-- ─────────────────────────────────────────────────────────────────────────────
-- users_have_relationship() — backs the notification-relay ownership check.
--
-- Bug: send-email-notification, send-push-notification, and
-- send-whatsapp-notification all require a valid JWT and rate-limit the
-- caller, but never verified the caller has any relationship to the target
-- user_id in the request body — any signed-up user could send an arbitrary
-- target user a fake notification with attacker-controlled text.
--
-- These functions are (by design) called directly from the browser with the
-- ACTING user's own JWT to notify a counterparty (e.g. a business notifying
-- a creator that a deliverable was approved) — so "service-role only" would
-- break the real, legitimate call pattern documented in
-- src/lib/notificationService.ts. The correct fix is what the audit
-- recommended as the alternative: validate target user ownership/relation
-- before sending anything.
--
-- A legitimate notification always corresponds to caller and target sharing
-- one of: a contract, a campaign application (via the campaign), a
-- conversation, or a deliverable submission. If none of those exist between
-- the two users, there is no legitimate reason for one to notify the other.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.users_have_relationship(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p_a = p_b
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE (c.business_id = p_a AND c.creator_id = p_b)
         OR (c.business_id = p_b AND c.creator_id = p_a)
    )
    OR EXISTS (
      SELECT 1 FROM public.campaign_applications ca
      JOIN public.campaigns camp ON camp.id = ca.campaign_id
      WHERE (ca.user_id = p_a AND camp.user_id = p_b)
         OR (ca.user_id = p_b AND camp.user_id = p_a)
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      JOIN public.conversation_participants cp2
        ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = p_a AND cp2.user_id = p_b
    )
    OR EXISTS (
      SELECT 1 FROM public.campaign_deliverable_submissions s
      WHERE (s.creator_id = p_a AND s.business_id = p_b)
         OR (s.creator_id = p_b AND s.business_id = p_a)
    );
$$;

-- Callable by any authenticated user to check their OWN relationship to a
-- target (the notification edge functions call this with p_a = the caller's
-- verified auth.uid()) — it only ever answers a boolean, never leaks row
-- contents, so there's no sensitive-data exposure in granting this broadly.
REVOKE EXECUTE ON FUNCTION public.users_have_relationship(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.users_have_relationship(uuid, uuid) TO authenticated, service_role;
