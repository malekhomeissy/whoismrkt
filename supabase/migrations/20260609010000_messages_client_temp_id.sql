-- Add client_temp_id to messages table for reliable optimistic-UI deduplication.
--
-- Problem solved: when a Supabase realtime INSERT event fires before React has
-- committed the optimistic setMessages() update, the realtime handler sees the
-- OLD state (without the temp message) and appends a duplicate row.
--
-- Solution: the client generates a UUID before inserting, stores it in the row,
-- and the realtime event carries it back. The handler matches by client_temp_id
-- regardless of React state timing. A synchronous ref registry covers the edge
-- case where even React state hasn't committed yet.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS client_temp_id text;

-- Partial index — only non-null values, keeps the index small
CREATE INDEX IF NOT EXISTS idx_messages_client_temp_id
  ON public.messages (client_temp_id)
  WHERE client_temp_id IS NOT NULL;
