-- Fix: ai_credits is_pro privilege escalation
-- The previous UPDATE policy allowed any authenticated user to set is_pro=true
-- on their own row directly from the client. Drop it; only admins may flip is_pro.

-- Drop the permissive client UPDATE policy
DROP POLICY IF EXISTS "Users can update own credits" ON public.ai_credits;

-- Users may still read their own row
DROP POLICY IF EXISTS "Users can view own credits" ON public.ai_credits;
CREATE POLICY "Users can view own credits"
  ON public.ai_credits FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update daily_count (for rate limiting increments), never is_pro.
-- We achieve this by keeping UPDATE blocked at the RLS level and using a
-- SECURITY DEFINER function for the legitimate increment path.

-- Admin-only RPC to set pro status
CREATE OR REPLACE FUNCTION public.admin_set_pro_status(
  target_user_id uuid,
  new_is_pro     boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  INSERT INTO public.ai_credits (user_id, is_pro)
  VALUES (target_user_id, new_is_pro)
  ON CONFLICT (user_id) DO UPDATE SET is_pro = EXCLUDED.is_pro, updated_at = now();
END;
$$;

-- Service-role RPC to increment daily count (used by edge functions)
CREATE OR REPLACE FUNCTION public.increment_ai_daily_count(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_credits (user_id, daily_count, last_reset_date)
  VALUES (target_user_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE
    SET daily_count = CASE
          WHEN public.ai_credits.last_reset_date < CURRENT_DATE THEN 1
          ELSE public.ai_credits.daily_count + 1
        END,
        last_reset_date = CURRENT_DATE,
        updated_at = now();
END;
$$;

-- Revoke direct table UPDATE from authenticated users entirely
-- (edge functions use service role key, not anon/auth)
REVOKE UPDATE ON public.ai_credits FROM authenticated;

-- Fix incorrect COMMENT on marketplace_events — it IS actively written to
-- by src/lib/marketplaceEvents.ts (trackMarketplaceEvent calls)
COMMENT ON TABLE public.marketplace_events IS
  'Active — written to by the web and mobile apps via trackMarketplaceEvent(). Records creator/business interactions for analytics and feed ranking.';
