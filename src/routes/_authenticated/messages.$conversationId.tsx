import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { flushSync } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { markConversationRead } from "@/lib/messaging";
import { toast } from "sonner";
import { ArrowLeft, Send, Megaphone } from "lucide-react";
import { VerifiedBadge } from "@/components/app/VerifiedBadge";
import { trackMarketplaceEvent } from "@/lib/marketplaceEvents";
import { sendNotification } from "@/lib/notificationService";

export const Route = createFileRoute("/_authenticated/messages/$conversationId")({
  component: ChatWindow,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id:              string;
  conversation_id: string;
  sender_id:       string;
  content:         string;
  attachment_url:  string | null;
  attachment_type: string | null;
  created_at:      string;
  // Present once the `client_temp_id` DB migration is applied.
  // Set on the client for optimistic messages; echoed back by realtime.
  client_temp_id?: string | null;
};

type OtherUser = {
  user_id:    string;
  name:       string;
  avatar:     string | null;
  verified:   boolean;
  role:       "creator" | "business" | "unknown";
};

type Campaign = {
  id:    string;
  title: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "oklch(0.78 0.005 0)",  "oklch(0.75 0.005 0)",
  "oklch(0.32 0 0)", "oklch(0.35 0 0)",
  "oklch(0.60 0.005 0)",  "oklch(0.30 0 0)",
];
function avatarBg(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now  = new Date();
  const diffMin  = (now.getTime() - date.getTime()) / 60000;
  const diffDays = diffMin / 1440;

  if (diffDays < 1) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } else if (diffDays < 7) {
    return (
      date.toLocaleDateString("en-US", { weekday: "short" }) + " " +
      date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  }
  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function formatDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const now  = new Date();
  const diffDays = (now.getTime() - date.getTime()) / 86400000;

  if (diffDays < 1)   return "Today";
  if (diffDays < 2)   return "Yesterday";
  if (diffDays < 7)   return date.toLocaleDateString("en-US", { weekday: "long" });
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function sameDay(a: string, b: string): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth()    === db.getMonth()    &&
         da.getDate()     === db.getDate();
}

/**
 * Deduplicate a message array by real ID and client_temp_id.
 * Returns a sorted array (ascending created_at).
 * Used when loading from DB to prevent any pre-existing duplicates showing.
 */
function dedupeMessages(msgs: Message[]): Message[] {
  const seenIds     = new Set<string>();
  const seenTempIds = new Set<string>();
  const out: Message[] = [];

  for (const m of [...msgs].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (seenIds.has(m.id)) continue;
    if (m.client_temp_id && seenTempIds.has(m.client_temp_id)) continue;
    seenIds.add(m.id);
    if (m.client_temp_id) seenTempIds.add(m.client_temp_id);
    out.push(m);
  }
  return out;
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({
  msg,
  isOwn,
  showAvatar,
  otherUser,
}: {
  msg: Message;
  isOwn: boolean;
  showAvatar: boolean;
  otherUser: OtherUser | null;
}) {
  const initial = (otherUser?.name ?? "?")[0]?.toUpperCase();

  return (
    <div className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      {/* Other user avatar — only on first bubble in group */}
      {!isOwn && (
        <div style={{ width: 28, flexShrink: 0 }}>
          {showAvatar && (
            otherUser?.avatar ? (
              <img src={otherUser.avatar} alt={otherUser.name}
                className="h-7 w-7 rounded-full object-cover img-fade"
                style={{ border: "1px solid oklch(1 0 0 / 8%)" }}
                onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
              />
            ) : (
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: avatarBg(otherUser?.name ?? "?"), color: "oklch(0.065 0 0)" }}
              >
                {initial}
              </div>
            )
          )}
        </div>
      )}

      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        <div
          className="px-3.5 py-2.5 text-[13.5px] leading-relaxed"
          style={{
            background:   isOwn ? C.accent                      : C.raised,
            color:        isOwn ? "oklch(0.06 0 0)"        : C.textPrimary,
            borderRadius: isOwn ? "18px 18px 4px 18px"          : "18px 18px 18px 4px",
            border:       isOwn ? "none"                         : `1px solid ${C.borderSubtle}`,
            wordBreak:    "break-word",
          }}
        >
          {msg.content}
        </div>
        <div
          className="text-[10px] px-1"
          style={{ color: C.textMuted }}
        >
          {formatTime(msg.created_at)}
        </div>
      </div>
    </div>
  );
}

// ─── Day divider ──────────────────────────────────────────────────────────────

function DayDivider({ dateStr }: { dateStr: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: C.borderSubtle }} />
      <span className="text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: C.textMuted }}>
        {formatDivider(dateStr)}
      </span>
      <div className="flex-1 h-px" style={{ background: C.borderSubtle }} />
    </div>
  );
}

// ─── Chat window ──────────────────────────────────────────────────────────────

function ChatWindow() {
  const { user }           = useAuth();
  const navigate           = useNavigate();
  const { conversationId } = Route.useParams();

  const [messages,   setMessages]   = useState<Message[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [input,      setInput]      = useState("");
  const [otherUser,  setOtherUser]  = useState<OtherUser | null>(null);
  const [campaign,   setCampaign]   = useState<Campaign | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  // ── Guards ─────────────────────────────────────────────────────────────────
  //
  // sendingRef  — synchronous boolean: prevents double-send before React state
  //               updates (ref reads are synchronous, setState is not).
  //
  // pendingRef  — synchronous Map<clientTempId, tempId>: populated BEFORE the
  //               optimistic setMessages so the realtime handler can check it
  //               even if React hasn't committed the state update yet.
  //               This is what kills the race condition: realtime can fire
  //               between the INSERT reaching the DB and React committing the
  //               temp message — the ref is always up-to-date.
  const sendingRef = useRef(false);
  const pendingRef = useRef<Map<string, string>>(new Map()); // clientTempId → tempId

  // ── Scroll helpers ─────────────────────────────────────────────────────────

  function scrollToBottom(smooth = false) {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }

  function isNearBottom(): boolean {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  // ── Textarea auto-resize ───────────────────────────────────────────────────

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  // ── Load conversation data ─────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [convRes, msgsRes, otherPartsRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("conversations")
        .select("id, campaign_id")
        .eq("id", conversationId)
        .single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("messages")
        .select("id, conversation_id, sender_id, content, attachment_url, attachment_type, created_at, client_temp_id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id),
    ]);

    if (convRes.error || !convRes.data) {
      navigate({ to: "/messages" });
      return;
    }

    // Merge DB messages (deduplicated) with any still-pending optimistic temps.
    // Covers the edge case where load() is called while a send is in flight.
    setMessages(prev => {
      const dbMsgs    = dedupeMessages((msgsRes.data ?? []) as Message[]);
      const dbIds     = new Set(dbMsgs.map(m => m.id));
      const dbTempIds = new Set(
        dbMsgs
          .filter(m => m.client_temp_id != null)
          .map(m => m.client_temp_id as string)
      );
      // Keep optimistic temps not yet persisted
      const pending = prev.filter(m =>
        m.id.startsWith("temp-") &&
        !dbIds.has(m.id) &&
        (!m.client_temp_id || !dbTempIds.has(m.client_temp_id))
      );
      return [...dbMsgs, ...pending];
    });

    // Resolve other user
    const otherUserId = (otherPartsRes.data as Array<{ user_id: string }> | null)?.[0]?.user_id ?? null;
    if (otherUserId) {
      const [profileRes, creatorRes, bizRes] = await Promise.all([
        supabase.from("profiles").select("id, name, email").eq("id", otherUserId).single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("creator_profiles")
          .select("user_id, display_name, profile_image_url, is_verified")
          .eq("user_id", otherUserId)
          .maybeSingle(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("business_profiles")
          .select("user_id, company_name, logo_url, is_verified")
          .eq("user_id", otherUserId)
          .maybeSingle(),
      ]);

      type PRow = { name: string | null; email: string | null };
      type CRow = { display_name: string | null; profile_image_url: string | null; is_verified?: boolean };
      type BRow = { company_name: string | null; logo_url: string | null; is_verified?: boolean };

      const p = profileRes.data as PRow | null;
      const c = creatorRes.data as CRow | null;
      const b = bizRes.data as BRow | null;

      const resolvedName =
        c?.display_name?.trim()   ||
        b?.company_name?.trim()   ||
        p?.name?.trim()           ||
        (p?.email ? p.email.split("@")[0] : null) ||
        "MRKT User";

      const resolvedAvatar   = c?.profile_image_url ?? b?.logo_url ?? null;
      const resolvedVerified = c?.is_verified ?? b?.is_verified ?? false;
      const resolvedRole: "creator" | "business" | "unknown" =
        c ? "creator" : b ? "business" : "unknown";

      setOtherUser({ user_id: otherUserId, name: resolvedName, avatar: resolvedAvatar, verified: resolvedVerified, role: resolvedRole });
    }

    const campId = (convRes.data as { campaign_id: string | null })?.campaign_id;
    if (campId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: camp } = await (supabase as any)
        .from("campaigns")
        .select("id, title")
        .eq("id", campId)
        .single();
      if (camp) setCampaign(camp as Campaign);
    }

    setLoading(false);
    setTimeout(() => scrollToBottom(false), 50);
    await markConversationRead(conversationId, user.id);
  }, [user, conversationId, navigate]);

  // ── Single effect: exactly one subscription per conversation ───────────────
  //
  // Realtime subscription is set up before load() so no messages are missed
  // during the async data fetch. Cleanup removes the channel on unmount and
  // whenever conversationId changes (ensuring one active subscription at all times).

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`chat:${conversationId}:${user.id}`)  // unique per user+conversation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, {
        event:  "INSERT",
        schema: "public",
        table:  "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload: { new: Message }) => {
        if (!mounted) return;
        const newMsg        = payload.new as Message;
        const wasNearBottom = isNearBottom();

        setMessages(prev => {
          // ── Layer 1: exact real-ID match ─────────────────────────────
          // Normal path: insert.select() returned before realtime fired.
          // The temp was already swapped to the real ID — Layer 1 catches it.
          if (prev.some(m => m.id === newMsg.id)) return prev;

          // ── Layer 2: client_temp_id match (deterministic) ─────────────
          // Active once the DB migration adds the client_temp_id column.
          // Works regardless of React batch timing.
          if (newMsg.client_temp_id) {
            const idx = prev.findIndex(m => m.client_temp_id === newMsg.client_temp_id);
            if (idx !== -1) {
              // Found the matching temp — replace it in place
              const next = [...prev];
              next[idx]  = newMsg;
              return next;
            }
            // Not in React state yet — check the synchronous pending registry.
            // If we have a pending insert with this client_temp_id, the optimistic
            // setMessages (flushSync) may not have committed yet in extreme cases.
            // Suppress the append; the insert.select() swap will handle it.
            if (pendingRef.current.has(newMsg.client_temp_id)) return prev;
          }

          // ── Layer 3: content + 5-second time-window fallback ──────────
          // Belt-and-suspenders for when client_temp_id column is not yet added.
          // The flushSync in sendMessage() guarantees the temp IS in `prev`
          // by the time realtime fires (no race — INSERT can't reach the DB
          // before flushSync has committed the state).
          if (newMsg.sender_id === user.id) {
            const WINDOW_MS = 5_000;
            const newTime   = new Date(newMsg.created_at).getTime();
            const idx       = prev.findIndex(m =>
              m.id.startsWith("temp-")       &&
              m.sender_id === user.id        &&
              m.content   === newMsg.content &&
              Math.abs(new Date(m.created_at).getTime() - newTime) < WINDOW_MS
            );
            if (idx !== -1) {
              const next = [...prev];
              next[idx]  = newMsg;
              return next;
            }
          }

          // ── Layer 4: genuine new message from other user ──────────────
          const next = [...prev, newMsg];
          if (wasNearBottom) setTimeout(() => scrollToBottom(true), 30);
          if (newMsg.sender_id !== user.id) {
            markConversationRead(conversationId, user.id);
          }
          return next;
        });

        // Scroll for confirmed own messages
        if (newMsg.sender_id === user.id && wasNearBottom) {
          setTimeout(() => scrollToBottom(true), 30);
        }
      })
      .subscribe();

    load();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [load]); // load captures user + conversationId — changes cause clean re-subscribe

  // ── Send message ───────────────────────────────────────────────────────────
  //
  // Lifecycle:
  //   1. clientTempId registered in pendingRef (synchronous, before React state)
  //   2. flushSync forces React to commit the optimistic message NOW — before the
  //      INSERT reaches Supabase. This guarantees `prev` always contains the temp
  //      when the realtime event fires (Layer 3 always succeeds as a backstop).
  //   3. INSERT sent with client_temp_id payload (Layer 2 once DB column exists).
  //   4. insert.select() returns → swap temp → real in state.
  //   5. Realtime event fires → Layer 1 or Layer 2 catches it → no-op or in-place replace.
  //
  // Result: exactly one message in the list at all times. No flicker. No duplicate.

  async function sendMessage() {
    const content = input.trim();
    // Synchronous ref guard — prevents double-send before state update cycle
    if (!content || sendingRef.current || !user) return;

    sendingRef.current = true;
    setSending(true);
    setInput("");
    resizeTextarea();

    const clientTempId = crypto.randomUUID();
    const tempId       = `temp-${clientTempId}`;

    const tempMsg: Message = {
      id:              tempId,
      conversation_id: conversationId,
      sender_id:       user.id,
      content,
      attachment_url:  null,
      attachment_type: null,
      created_at:      new Date().toISOString(),
      client_temp_id:  clientTempId,
    };

    // Step 1 — register synchronously BEFORE any React state update
    pendingRef.current.set(clientTempId, tempId);

    // Step 2 — force React to commit the optimistic message synchronously.
    // The INSERT cannot reach Supabase before this call returns, so the realtime
    // event can never fire while `prev` lacks the temp message.
    flushSync(() => {
      setMessages(prev => [...prev, tempMsg]);
    });
    scrollToBottom(true);

    try {
      // Step 3 — insert. We include client_temp_id so that once the DB migration
      // is applied (supabase/migrations/20260609010000_messages_client_temp_id.sql),
      // the realtime event carries it back for Layer 2 deterministic dedup.
      // If the column doesn't exist yet, PostgREST returns a column-not-found error;
      // we retry without it so the message is never lost.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let insertRes = await (supabase as any)
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id:       user.id,
          content,
          client_temp_id:  clientTempId,
        })
        .select("id, conversation_id, sender_id, content, attachment_url, attachment_type, created_at, client_temp_id")
        .single();

      // Retry without client_temp_id if column doesn't exist yet (pre-migration)
      if (insertRes.error && (
        insertRes.error.code === "42703" ||
        (insertRes.error.message ?? "").toLowerCase().includes("client_temp_id")
      )) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        insertRes = await (supabase as any)
          .from("messages")
          .insert({ conversation_id: conversationId, sender_id: user.id, content })
          .select("id, conversation_id, sender_id, content, attachment_url, attachment_type, created_at")
          .single();
      }

      const { data: inserted, error } = insertRes;

      if (error) {
        toast.error("Message failed to send");
        pendingRef.current.delete(clientTempId);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        return;
      }

      // Step 4 — remove from pending registry, then swap temp → real
      pendingRef.current.delete(clientTempId);

      // Track + notify recipient
      if (otherUser?.user_id) {
        const senderName = user.email?.split("@")[0] ?? "MRKT User";
        trackMarketplaceEvent({
          actorUserId: user.id,
          eventType: "message_sent",
          metadata: { conversation_id: conversationId },
        });
        sendNotification({
          userId: otherUser.user_id,
          notificationType: "new_message",
          data: { sender_name: senderName, preview: content.slice(0, 100) },
          inApp: {
            title: `New message from ${senderName}`,
            body: content.slice(0, 80),
            link: `/messages/${conversationId}`,
          },
        });
      }

      setMessages(prev => {
        // Case A: realtime already replaced the temp (via Layer 2 or Layer 3)
        //         and the state now contains the real message.
        if (prev.some(m => m.id === inserted.id)) {
          return prev.filter(m => m.id !== tempId); // safety: remove any stale temp
        }
        // Case B: realtime hasn't fired yet (or was already handled by Layer 1).
        //         Swap temp → server-confirmed row in place.
        return prev.map(m => m.id === tempId ? (inserted as Message) : m);
      });
    } finally {
      sendingRef.current = false;
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // sendingRef.current check inside sendMessage() prevents double-fire
      sendMessage();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full flex flex-col" style={{ background: C.canvas }}>
        <div className="h-[52px] px-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          <div className="skeleton h-8 w-8 rounded-full shrink-0" />
          <div className="skeleton" style={{ height: 14, width: 120 }} />
        </div>
        <div className="flex-1 p-5 space-y-4 overflow-hidden">
          {[{ w: "55%", own: false }, { w: "40%", own: true }, { w: "65%", own: false }].map((s, i) => (
            <div key={i} className={`flex ${s.own ? "justify-end" : "justify-start"}`}>
              <div className="skeleton rounded-2xl" style={{ height: 40, width: s.w }} />
            </div>
          ))}
        </div>
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
          <div className="skeleton rounded-xl" style={{ height: 40 }} />
        </div>
      </div>
    );
  }

  // Group messages into day-divided, avatar-grouped items
  type MsgOrDivider = { type: "msg"; msg: Message; showAvatar: boolean } | { type: "divider"; dateStr: string };
  const grouped: MsgOrDivider[] = [];
  let prevDate:   string | null = null;
  let prevSender: string | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (!prevDate || !sameDay(msg.created_at, prevDate)) {
      grouped.push({ type: "divider", dateStr: msg.created_at });
      prevDate   = msg.created_at;
      prevSender = null;
    }

    const showAvatar = msg.sender_id !== user!.id && prevSender !== msg.sender_id;
    grouped.push({ type: "msg", msg, showAvatar });
    prevSender = msg.sender_id;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div
        className="h-[52px] px-4 flex items-center gap-3 shrink-0"
        style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
      >
        <Link
          to="/messages"
          className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{ background: C.surface, border: `1px solid ${C.borderSubtle}` }}
        >
          <ArrowLeft className="h-3.5 w-3.5" style={{ color: C.textMuted }} />
        </Link>

        {otherUser && (
          <div className="flex items-center gap-2.5">
            {otherUser.avatar ? (
              <img src={otherUser.avatar} alt={otherUser.name}
                className="h-7 w-7 rounded-full object-cover img-fade"
                style={{ border: "1px solid oklch(1 0 0 / 10%)" }}
                onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
              />
            ) : (
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: avatarBg(otherUser.name), color: "oklch(0.065 0 0)" }}
              >
                {otherUser.name[0]?.toUpperCase()}
              </div>
            )}
            <span className="flex items-center gap-1.5 font-medium text-[14px]" style={{ color: C.textPrimary }}>
              {otherUser.name}
              {otherUser.verified && otherUser.role !== "unknown" && (
                <VerifiedBadge type={otherUser.role} size="sm" />
              )}
            </span>
          </div>
        )}

        {campaign && (
          <a
            href={`/campaigns/${campaign.id}/`}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
            style={{
              background: C.accentBg,
              border:     `1px solid oklch(1 0 0 / 20%)`,
              color:      C.accent,
            }}
          >
            <Megaphone className="h-3 w-3" />
            {campaign.title}
          </a>
        )}
      </div>

      {/* ── Messages area ────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-1"
        style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(1 0 0 / 8%) transparent" }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-[13px] font-medium" style={{ color: C.textTertiary }}>Start the conversation</p>
            <p className="text-[11.5px] mt-1" style={{ color: C.textMuted }}>
              Say hello to {otherUser?.name ?? "them"} 👋
            </p>
          </div>
        ) : (
          grouped.map((item, i) =>
            item.type === "divider" ? (
              <DayDivider key={`div-${i}`} dateStr={item.dateStr} />
            ) : (
              <div key={item.msg.id} className="py-0.5">
                <Bubble
                  msg={item.msg}
                  isOwn={item.msg.sender_id === user!.id}
                  showAvatar={item.showAvatar}
                  otherUser={otherUser}
                />
              </div>
            )
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderTop: `1px solid ${C.borderSubtle}` }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl px-4 py-2.5"
          style={{ background: C.raised, border: `1px solid ${C.borderNormal}` }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
            onKeyDown={onKeyDown}
            placeholder={`Message ${otherUser?.name ?? "…"}`}
            rows={1}
            disabled={sending}
            className="flex-1 resize-none bg-transparent outline-none text-[13.5px] leading-relaxed"
            style={{
              color:      C.textPrimary,
              fontFamily: "inherit",
              minHeight:  "22px",
              maxHeight:  "120px",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
            style={{
              background: input.trim() && !sending ? C.accent : "oklch(1 0 0 / 6%)",
              border:     "none",
              cursor:     input.trim() && !sending ? "pointer" : "default",
            }}
          >
            <Send
              className="h-3.5 w-3.5"
              style={{ color: input.trim() && !sending ? "oklch(0.06 0 0)" : C.textMuted }}
            />
          </button>
        </div>
        <div className="mt-1.5 text-[10px] text-center" style={{ color: C.textMuted }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
