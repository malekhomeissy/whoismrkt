-- ─────────────────────────────────────────────────────────────────────────────
-- Recreate a dedicated table for AI Strategist chat history.
--
-- The very first migration (20260505185530) created public.messages for this
-- exact purpose (chat_id, user_id, role, content). Migration 20260606150000
-- later assumed public.messages didn't exist yet and used
-- CREATE TABLE IF NOT EXISTS to define a completely different shape for it
-- (conversation_id, sender_id, attachment_*) — the real, live person-to-person
-- messaging table used by messages.tsx / messages.$conversationId.tsx today.
--
-- Because the table already existed, that CREATE TABLE IF NOT EXISTS was a
-- no-op against the live database, and messages ended up on the *original*
-- schema. When the messaging system rolled out, application code (chat.tsx)
-- kept querying `messages` with the old chat_id/role/user_id shape, which no
-- longer matches whatever the live table actually is. Regardless of exactly
-- how the two designs diverged, chat.tsx's read/write of AI chat history has
-- not matched the real `messages` schema, so conversation history has not
-- persisted across sessions (confirmed by regenerating types from the live
-- DB — messages only has id/conversation_id/sender_id/content/attachment_*/
-- created_at, no chat_id/user_id/role).
--
-- Fix: give AI chat history its own table instead of sharing `messages` with
-- an unrelated feature, matching the original 20260505185530 design.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    uuid        NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_chat_messages_chat_id_idx ON public.ai_chat_messages (chat_id, created_at);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own ai chat messages" ON public.ai_chat_messages;
CREATE POLICY "Own ai chat messages"
  ON public.ai_chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
