-- ─────────────────────────────────────────────────────────────────────────────
-- MRKT Messaging System
-- Direct creator ↔ business conversations, optional campaign context.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. conversations ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid        REFERENCES public.campaigns(id) ON DELETE SET NULL,
  last_message    text,
  last_message_at timestamptz,
  last_sender_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_updated_idx ON public.conversations (updated_at DESC);
CREATE INDEX IF NOT EXISTS conversations_campaign_idx ON public.conversations (campaign_id) WHERE campaign_id IS NOT NULL;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Participants can view their conversations
CREATE POLICY "Participant can view conversation"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

-- Authenticated users can create conversations
CREATE POLICY "Authenticated can create conversation"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Participants can update the conversation (updated_at, last_message via trigger)
CREATE POLICY "Participant can update conversation"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

-- ─── 2. conversation_participants ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id)           ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  last_read_at    timestamptz          DEFAULT now(),
  unread_count    integer     NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS cp_user_idx ON public.conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS cp_conv_idx ON public.conversation_participants (conversation_id);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Users can see all participants of conversations they're in
CREATE POLICY "Participant can view participants"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
        AND cp2.user_id = auth.uid()
    )
  );

-- Authenticated users can be added as participants
CREATE POLICY "Authenticated can add participant"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own participation row (last_read_at, unread_count)
CREATE POLICY "Update own participation"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- ─── 3. messages ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid        NOT NULL REFERENCES auth.users(id)           ON DELETE CASCADE,
  content         text        NOT NULL CHECK (length(trim(content)) > 0),
  attachment_url  text,
  attachment_type text        CHECK (attachment_type IN ('pdf','png','jpg','jpeg','gif','webp')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conv_time_idx ON public.messages (conversation_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Participants can read messages in their conversations
CREATE POLICY "Participant can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Participants can send messages (sender must be the current user)
CREATE POLICY "Participant can send message"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- ─── 4. Trigger: update conversation on new message ───────────────────────────

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Update conversation metadata
  UPDATE public.conversations
  SET
    last_message    = NEW.content,
    last_message_at = NEW.created_at,
    last_sender_id  = NEW.sender_id,
    updated_at      = NEW.created_at
  WHERE id = NEW.conversation_id;

  -- Increment unread count for all participants except the sender
  UPDATE public.conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- ─── 5. find_or_create_conversation RPC ──────────────────────────────────────
-- Returns the conversation ID between the current user and p_other_user_id.
-- Creates a new conversation + participants if none exists.
-- Optional campaign context: if supplied, matches campaign_id too.

CREATE OR REPLACE FUNCTION public.find_or_create_conversation(
  p_other_user_id  uuid,
  p_campaign_id    uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  my_id    uuid := auth.uid();
  conv_id  uuid;
BEGIN
  -- Guard: cannot message yourself
  IF my_id = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create a conversation with yourself';
  END IF;

  -- Find an existing 1:1 conversation between these two users
  -- Matches on campaign_id (NULL = NULL via IS NOT DISTINCT FROM)
  SELECT cp1.conversation_id INTO conv_id
  FROM   public.conversation_participants cp1
  JOIN   public.conversation_participants cp2
         ON  cp1.conversation_id = cp2.conversation_id
         AND cp2.user_id = p_other_user_id
  JOIN   public.conversations c
         ON  c.id = cp1.conversation_id
         AND c.campaign_id IS NOT DISTINCT FROM p_campaign_id
  WHERE  cp1.user_id = my_id
  AND    (
    SELECT COUNT(*) FROM public.conversation_participants
    WHERE  conversation_id = cp1.conversation_id
  ) = 2
  ORDER  BY c.created_at DESC
  LIMIT  1;

  IF conv_id IS NULL THEN
    -- Create new conversation
    INSERT INTO public.conversations (campaign_id)
    VALUES (p_campaign_id)
    RETURNING id INTO conv_id;

    -- Add both participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conv_id, my_id), (conv_id, p_other_user_id);
  END IF;

  RETURN conv_id;
END;
$$;

-- ─── 6. Realtime — enable for messaging tables ────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
