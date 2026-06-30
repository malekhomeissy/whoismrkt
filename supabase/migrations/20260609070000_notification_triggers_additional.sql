-- ─────────────────────────────────────────────────────────────────────────────
-- Additional notification triggers for MRKT
-- Covers: creator saved to project, creator verified via Instagram
-- (Contract-sent and deliverable-approved triggers live in their own migrations)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Creator saved to project → notify creator ────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_creator_saved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  creator_user_id  uuid;
  project_name     text;
  biz_name         text;
BEGIN
  -- Find the creator's auth user_id from their creator profile
  SELECT user_id INTO creator_user_id
  FROM   public.creator_profiles
  WHERE  id = NEW.creator_profile_id;

  IF creator_user_id IS NULL THEN RETURN NEW; END IF;

  -- Project name
  SELECT name INTO project_name
  FROM   public.projects
  WHERE  id = NEW.project_id;

  -- Business name
  SELECT COALESCE(bp.company_name, p.name, 'A business')
  INTO   biz_name
  FROM   public.profiles p
  LEFT JOIN public.business_profiles bp ON bp.user_id = p.id
  WHERE  p.id = NEW.saved_by
  LIMIT  1;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    creator_user_id,
    'saved_to_project',
    biz_name || ' saved you to a project',
    project_name,
    '/opportunities'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_saved_creator_insert
  AFTER INSERT ON public.project_saved_creators
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_creator_saved();

-- ─── 2. Creator verified (instagram_connected → true) → notify creator ────────

CREATE OR REPLACE FUNCTION public.notify_on_creator_verified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only fire when instagram_connected transitions from false/null → true
  IF (OLD.instagram_connected IS DISTINCT FROM TRUE) AND NEW.instagram_connected = TRUE THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'verified',
      'Your Instagram account is verified',
      'Your follower count is now confirmed. Your MRKT verification status has been updated.',
      '/verification'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_instagram_verified
  AFTER UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_creator_verified();
