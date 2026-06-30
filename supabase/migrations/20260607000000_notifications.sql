-- ─────────────────────────────────────────────────────────────────────────────
-- MRKT Notification System
-- Triggered by: new messages, new applications, application status changes
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Table ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  title      text        NOT NULL,
  body       text,
  link       text,
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, read, created_at DESC);

-- ─── 2. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Triggers run as SECURITY DEFINER so they bypass this INSERT policy.
-- The WITH CHECK (true) lets the function insert for any user_id.
CREATE POLICY "System inserts notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── 3. Trigger: new message → notify all other participants ──────────────────

CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec         RECORD;
  sender_name text;
BEGIN
  -- Resolve sender display name (creator → business → profile fallback)
  SELECT COALESCE(cp.display_name, bp.company_name, p.name, 'Someone')
  INTO   sender_name
  FROM   public.profiles p
  LEFT JOIN public.creator_profiles  cp ON cp.user_id = p.id
  LEFT JOIN public.business_profiles bp ON bp.user_id = p.id
  WHERE  p.id = NEW.sender_id
  LIMIT  1;

  -- Insert one notification per other participant
  FOR rec IN
    SELECT user_id
    FROM   public.conversation_participants
    WHERE  conversation_id = NEW.conversation_id
      AND  user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      rec.user_id,
      'new_message',
      sender_name || ' sent you a message',
      LEFT(NEW.content, 120),
      '/messages/' || NEW.conversation_id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

-- ─── 4. Trigger: new application → notify business owner ─────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_new_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  biz_user_id  uuid;
  creator_name text;
BEGIN
  -- Who owns the campaign?
  SELECT user_id INTO biz_user_id
  FROM   public.campaigns
  WHERE  id = NEW.campaign_id;

  IF biz_user_id IS NULL THEN RETURN NEW; END IF;

  -- Creator display name
  SELECT COALESCE(cp.display_name, p.name, 'A creator')
  INTO   creator_name
  FROM   public.profiles p
  LEFT JOIN public.creator_profiles cp ON cp.user_id = p.id
  WHERE  p.id = NEW.user_id
  LIMIT  1;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    biz_user_id,
    'new_applicant',
    creator_name || ' applied to your campaign',
    NEW.campaign_title,
    '/campaigns/' || NEW.campaign_id || '/applicants'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_application_insert
  AFTER INSERT ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_application();

-- ─── 5. Trigger: application status change → notify creator ──────────────────

CREATE OR REPLACE FUNCTION public.notify_on_application_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  notif_type  text;
  notif_title text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'shortlisted' THEN
      notif_type  := 'shortlisted';
      notif_title := 'You''ve been shortlisted for ' || NEW.campaign_title;
    WHEN 'accepted' THEN
      notif_type  := 'accepted';
      notif_title := 'You''ve been accepted for ' || NEW.campaign_title;
    WHEN 'rejected' THEN
      notif_type  := 'rejected';
      notif_title := 'Application update for ' || NEW.campaign_title;
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.user_id, notif_type, notif_title, NULL, '/opportunities');
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_application_status
  AFTER UPDATE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_application_status();

-- ─── 6. Realtime ─────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
