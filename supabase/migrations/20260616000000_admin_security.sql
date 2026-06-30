-- ─────────────────────────────────────────────────────────────────────────────
-- Admin Security — Phase 1
-- Moves admin authorization server-side.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Admin users table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by  uuid REFERENCES auth.users(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  notes       text,
  UNIQUE (user_id)
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can read the admin_users table (via service role in edge functions)
-- No client-side SELECT allowed
CREATE POLICY "Service role only" ON public.admin_users
  USING (false);

-- ── 2. Admin action log ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_action_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES auth.users(id),
  action      text NOT NULL,
  target_id   uuid,
  target_type text,
  payload     jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_action_log_admin_idx ON public.admin_action_log (admin_id, created_at DESC);
CREATE INDEX admin_action_log_target_idx ON public.admin_action_log (target_id, created_at DESC);

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

-- Only service role can write; admins can read their own actions via RPC
CREATE POLICY "No direct client access" ON public.admin_action_log
  USING (false);

-- ── 3. is_admin() RPC ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$;

-- ── 4. log_admin_action() RPC ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action      text,
  p_target_id   uuid      DEFAULT NULL,
  p_target_type text      DEFAULT NULL,
  p_payload     jsonb     DEFAULT NULL,
  p_ip_address  text      DEFAULT NULL,
  p_user_agent  text      DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: caller is not an admin';
  END IF;

  INSERT INTO public.admin_action_log (
    admin_id, action, target_id, target_type, payload, ip_address, user_agent
  ) VALUES (
    auth.uid(), p_action, p_target_id, p_target_type, p_payload, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ── 5. Admin-gated RPCs (replace existing unsafe versions) ───────────────────
-- Drop old signatures first (parameter names changed)
DROP FUNCTION IF EXISTS public.admin_grant_pioneer(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.admin_revoke_pioneer(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.admin_verify_creator(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.admin_suspend_user(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.admin_grant_pioneer(
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

  UPDATE public.profiles
  SET is_beta_pioneer = true
  WHERE id = p_user_id;

  INSERT INTO public.admin_action_log (admin_id, action, target_id, target_type, payload)
  VALUES (auth.uid(), 'grant_pioneer', p_user_id, 'profile', jsonb_build_object('note', p_note));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_pioneer(
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

  UPDATE public.profiles
  SET is_beta_pioneer = false
  WHERE id = p_user_id;

  INSERT INTO public.admin_action_log (admin_id, action, target_id, target_type, payload)
  VALUES (auth.uid(), 'revoke_pioneer', p_user_id, 'profile', jsonb_build_object('note', p_note));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_verify_creator(
  p_creator_id uuid,
  p_admin_id   uuid,
  p_note       text DEFAULT NULL
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
  SET is_verified = true
  WHERE id = p_creator_id;

  INSERT INTO public.admin_action_log (admin_id, action, target_id, target_type, payload)
  VALUES (auth.uid(), 'verify_creator', p_creator_id, 'creator_profile', jsonb_build_object('note', p_note));
END;
$$;

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

  INSERT INTO public.admin_action_log (admin_id, action, target_id, target_type, payload)
  VALUES (auth.uid(), 'suspend_user', p_user_id, 'profile', jsonb_build_object('reason', p_reason));
END;
$$;

-- ── 6. Admin action log reader (for admin UI) ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_action_log(p_limit int DEFAULT 50)
RETURNS TABLE (
  id          uuid,
  admin_id    uuid,
  admin_email text,
  action      text,
  target_id   uuid,
  target_type text,
  payload     jsonb,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.admin_id,
    u.email::text as admin_email,
    l.action,
    l.target_id,
    l.target_type,
    l.payload,
    l.created_at
  FROM public.admin_action_log l
  LEFT JOIN auth.users u ON u.id = l.admin_id
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ── 7. Seed: insert founder as first admin ────────────────────────────────────
-- Runs only if the founder account exists
DO $$
DECLARE
  v_founder_id uuid;
BEGIN
  SELECT id INTO v_founder_id
  FROM auth.users
  WHERE email = 'malekhomeissy@gmail.com'
  LIMIT 1;

  IF v_founder_id IS NOT NULL THEN
    INSERT INTO public.admin_users (user_id, notes)
    VALUES (v_founder_id, 'Founder — seeded by migration')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$;
