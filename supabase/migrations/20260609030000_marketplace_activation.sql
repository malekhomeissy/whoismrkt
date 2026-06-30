-- ─────────────────────────────────────────────────────────────────────────────
-- Marketplace Activation Sprint
--
-- 1. Add 'contacted' status to campaign_applications
-- 2. Update notification trigger:
--    - Add 'reviewing' and 'contacted' notifications
--    - Fix links → /applications (was /opportunities)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Add 'contacted' to campaign_applications status ───────────────────────

ALTER TABLE public.campaign_applications
  DROP CONSTRAINT IF EXISTS campaign_applications_status_check;

ALTER TABLE public.campaign_applications
  ADD CONSTRAINT campaign_applications_status_check
    CHECK (status IN ('pending','reviewing','contacted','shortlisted','rejected','accepted'));

-- ─── 2. Updated application status notification trigger ──────────────────────
-- Now covers: reviewing, contacted, shortlisted, accepted, rejected
-- All creator-facing links now point to /applications so creators can track status.

CREATE OR REPLACE FUNCTION public.notify_on_application_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  notif_type  text;
  notif_title text;
  notif_link  text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'reviewing' THEN
      notif_type  := 'reviewing';
      notif_title := 'Your application is under review — ' || NEW.campaign_title;
      notif_link  := '/applications';
    WHEN 'contacted' THEN
      notif_type  := 'contacted';
      notif_title := 'A brand reached out about your ' || NEW.campaign_title || ' application';
      notif_link  := '/applications';
    WHEN 'shortlisted' THEN
      notif_type  := 'shortlisted';
      notif_title := 'You''ve been shortlisted for ' || NEW.campaign_title;
      notif_link  := '/applications';
    WHEN 'accepted' THEN
      notif_type  := 'accepted';
      notif_title := 'You''ve been selected for ' || NEW.campaign_title;
      notif_link  := '/applications';
    WHEN 'rejected' THEN
      notif_type  := 'rejected';
      notif_title := 'Application update for ' || NEW.campaign_title;
      notif_link  := '/applications';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.user_id, notif_type, notif_title, NULL, notif_link);
  RETURN NEW;
END;
$$;
