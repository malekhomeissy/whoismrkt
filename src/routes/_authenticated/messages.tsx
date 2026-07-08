import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MessageSquare, Search, CheckCheck } from "lucide-react";
import { VerifiedBadge } from "@/components/app/VerifiedBadge";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — MRKT" }] }),
  component: MessagesLayout,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConversationRow = {
  id:               string;
  campaign_id:      string | null;
  last_message:     string | null;
  last_message_at:  string | null;
  last_sender_id:   string | null;
  updated_at:       string;
  last_read_at:     string | null;
  other_user_id:    string | null;
  other_name:       string;
  other_avatar:     string | null;
  other_verified:   boolean;
  other_type:       "creator" | "business" | "unknown";
  unread:           boolean;
  unread_count:     number;
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

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now  = new Date();
  const diffMin = (now.getTime() - date.getTime()) / 60000;
  if (diffMin < 1)     return "now";
  if (diffMin < 60)    return `${Math.round(diffMin)}m`;
  if (diffMin < 1440)  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffMin < 10080) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Conversation item ────────────────────────────────────────────────────────

function ConvItem({ conv, isActive }: { conv: ConversationRow; isActive: boolean }) {
  const initial = conv.other_name[0]?.toUpperCase() ?? "?";

  return (
    <Link
      to="/messages/$conversationId"
      params={{ conversationId: conv.id }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative"
      style={{
        background: isActive ? C.active : "transparent",
        border:     isActive ? `1px solid ${C.borderSubtle}` : "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 4%)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {conv.other_avatar ? (
          <img
            src={conv.other_avatar}
            alt={conv.other_name}
            className="h-9 w-9 rounded-full object-cover img-fade"
            style={{ border: "1px solid oklch(1 0 0 / 10%)" }}
            onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
          />
        ) : (
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-[12px] font-bold"
            style={{ background: avatarBg(conv.other_name), color: "oklch(0.065 0 0)" }}
          >
            {initial}
          </div>
        )}
        {conv.unread && (
          <div
            className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
            style={{ background: C.accent, borderColor: C.sidebar }}
          />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-[13px] font-medium truncate"
              style={{ color: conv.unread ? C.textPrimary : C.textSecondary }}
            >
              {conv.other_name}
            </span>
            {conv.other_verified && conv.other_type !== "unknown" && (
              <VerifiedBadge type={conv.other_type} size="xs" className="shrink-0" />
            )}
          </span>
          {conv.last_message_at && (
            <span className="text-[10px] shrink-0" style={{ color: C.textMuted }}>
              {relativeTime(conv.last_message_at)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {conv.last_sender_id && (
            <CheckCheck
              className="h-3 w-3 shrink-0"
              style={{ color: conv.unread ? C.textMuted : C.accent }}
            />
          )}
          <span
            className="text-[11.5px] truncate"
            style={{ color: conv.unread ? C.textTertiary : C.textMuted, fontWeight: conv.unread ? 500 : 400 }}
          >
            {conv.last_message ?? "No messages yet"}
          </span>
        </div>
      </div>

      {/* Unread count badge */}
      {conv.unread_count > 0 && (
        <div
          className="shrink-0 min-w-[18px] h-[18px] rounded-full px-1 flex items-center justify-center text-[9px] font-bold"
          style={{ background: C.accent, color: "oklch(0.065 0 0)" }}
        >
          {conv.unread_count > 99 ? "99+" : conv.unread_count}
        </div>
      )}
    </Link>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function MessagesLayout() {
  const { user }         = useAuth();
  const routerState      = useRouterState();
  const pathname         = routerState.location.pathname;
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading,        setLoading]       = useState(true);
  const [search,         setSearch]        = useState("");

  const activeConvId = pathname.startsWith("/messages/")
    ? pathname.split("/messages/")[1]?.split("/")?.[0]
    : null;

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Step 1: my participations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: myParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at, unread_count")
      .eq("user_id", user.id);

    if (!myParts?.length) { setConversations([]); setLoading(false); return; }

    const convIds = (myParts as Array<{ conversation_id: string; last_read_at: string | null; unread_count: number }>)
      .map(p => p.conversation_id);

    // Step 2: conversations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, campaign_id, last_message, last_message_at, last_sender_id, updated_at")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    if (!convs?.length) { setConversations([]); setLoading(false); return; }

    // Step 3: other participants
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: otherParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds)
      .neq("user_id", user.id);

    type MyPart    = { conversation_id: string; last_read_at: string | null; unread_count: number };
    type OtherPart = { conversation_id: string; user_id: string };
    type ConvData  = { id: string; campaign_id: string | null; last_message: string | null; last_message_at: string | null; last_sender_id: string | null; updated_at: string };
    type ProfData  = { id: string; name: string | null; email: string | null };
    type CrData    = { user_id: string; display_name: string; profile_image_url: string | null; is_verified?: boolean };
    type BizData   = { user_id: string; company_name: string | null; logo_url: string | null; is_verified?: boolean };

    const myPartsTyped:    MyPart[]    = myParts as MyPart[];
    const otherPartsTyped: OtherPart[] = ((otherParts ?? []) as OtherPart[]);
    const convsTyped:      ConvData[]  = (convs as ConvData[]);

    const otherUserIds: string[] = Array.from(new Set<string>(otherPartsTyped.map(p => p.user_id)));

    // Step 4: profiles + creator_profiles + business_profiles in parallel
    const [profilesRes, creatorProfsRes, bizProfsRes] = await Promise.all([
      supabase.from("profiles").select("id, name, email").in("id", otherUserIds),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase
        .from("creator_profiles")
        .select("user_id, display_name, profile_image_url, is_verified")
        .in("user_id", otherUserIds),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase
        .from("business_profiles")
        .select("user_id, company_name, logo_url, is_verified")
        .in("user_id", otherUserIds),
    ]);

    const profilesTyped: ProfData[] = (profilesRes.data ?? []) as ProfData[];
    const creatorsTyped: CrData[]   = (creatorProfsRes.data ?? []) as CrData[];
    const bizsTyped:     BizData[]  = (bizProfsRes.data ?? []) as BizData[];

    // Build typed maps
    const profileMap   = new Map<string, ProfData>(profilesTyped.map(p => [p.id, p]));
    const creatorMap   = new Map<string, CrData>(creatorsTyped.map(p => [p.user_id, p]));
    const bizMap       = new Map<string, BizData>(bizsTyped.map(p => [p.user_id, p]));
    const otherPartMap = new Map<string, string>(otherPartsTyped.map(p => [p.conversation_id, p.user_id]));
    const myPartMap    = new Map<string, MyPart>(myPartsTyped.map(p => [p.conversation_id, p]));

    const result: ConversationRow[] = convsTyped.map(conv => {
      const otherUserId: string | null = otherPartMap.get(conv.id) ?? null;
      const creator  = otherUserId ? creatorMap.get(otherUserId) : null;
      const biz      = otherUserId ? bizMap.get(otherUserId)     : null;
      const profile  = otherUserId ? profileMap.get(otherUserId) : null;
      const myPart   = myPartMap.get(conv.id);
      const lastReadAt = myPart?.last_read_at ?? null;
      const unreadCt   = myPart?.unread_count ?? 0;
      const unread     = !!(
        conv.last_message_at &&
        conv.last_sender_id !== user.id &&
        (!lastReadAt || new Date(conv.last_message_at) > new Date(lastReadAt))
      );

      // Resolution: creator display_name → business company_name → profile name → email → Unknown
      const resolvedName =
        creator?.display_name?.trim()  ||
        biz?.company_name?.trim()      ||
        profile?.name?.trim()          ||
        profile?.email?.split("@")[0]  ||
        "Unknown";

      // Avatar: creator profile image → business logo → null
      const resolvedAvatar    = creator?.profile_image_url ?? biz?.logo_url ?? null;
      // Verified state + role type for badge
      const resolvedVerified  = creator?.is_verified ?? biz?.is_verified ?? false;
      const resolvedType: "creator" | "business" | "unknown" =
        creator ? "creator" : biz ? "business" : "unknown";

      return {
        id:              conv.id,
        campaign_id:     conv.campaign_id,
        last_message:    conv.last_message,
        last_message_at: conv.last_message_at,
        last_sender_id:  conv.last_sender_id,
        updated_at:      conv.updated_at,
        last_read_at:    lastReadAt,
        other_user_id:   otherUserId,
        other_name:      resolvedName,
        other_avatar:    resolvedAvatar,
        other_verified:  resolvedVerified,
        other_type:      resolvedType,
        unread,
        unread_count:    unreadCt,
      };
    });

    setConversations(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime: refresh list when new message arrives
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-list")
      .on(
        "postgres_changes" as Parameters<typeof supabase.channel>[0] extends string ? never : never,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { event: "INSERT", schema: "public", table: "messages" } as any,
        () => { loadConversations(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = search.trim()
    ? conversations.filter(c => c.other_name.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <div className="h-full flex overflow-hidden" style={{ background: C.canvas }}>

      {/* ── Left: conversation list ─────────────────────────────────────── */}
      {/* Mobile: full-width when no conv selected, hidden when conv open   */}
      {/* Desktop: always 280px sidebar                                      */}
      <div
        className={`${activeConvId ? "hidden md:flex" : "flex"} flex-col w-full md:w-[280px] md:flex-none`}
        style={{ background: C.sidebar, borderRight: `1px solid ${C.borderSubtle}` }}
      >
        {/* Header */}
        <div className="px-4 py-4 shrink-0" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4" style={{ color: C.accent }} />
            <h1 className="text-[15px] font-semibold" style={{ color: C.textPrimary }}>
              Messages
            </h1>
            {totalUnread > 0 && (
              <span
                className="text-[9.5px] font-bold rounded-full px-1.5 py-0.5 ml-auto"
                style={{ background: C.accent, color: "oklch(0.065 0 0)" }}
              >
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" style={{ color: C.textMuted }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-7 pr-3 h-8 rounded-lg text-[12px] outline-none"
              style={{
                background: "oklch(1 0 0 / 5%)",
                border:     `1px solid ${C.borderSubtle}`,
                color:      C.textSecondary,
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                  <div className="skeleton h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton" style={{ height: 12, width: "60%" }} />
                    <div className="skeleton" style={{ height: 10, width: "80%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <MessageSquare className="h-6 w-6 mb-2" style={{ color: C.textMuted }} />
              <p className="text-[11.5px]" style={{ color: C.textMuted }}>
                {search ? "No conversations found" : "No messages yet"}
              </p>
            </div>
          ) : (
            filtered.map(conv => (
              <ConvItem key={conv.id} conv={conv} isActive={conv.id === activeConvId} />
            ))
          )}
        </div>
      </div>

      {/* ── Right: chat window (Outlet) ─────────────────────────────────── */}
      {/* Mobile: full-width when conv selected, hidden on list view        */}
      {/* Desktop: always flex-1                                             */}
      <div className={`${activeConvId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col overflow-hidden`} style={{ background: C.canvas }}>
        <Outlet />
      </div>
    </div>
  );
}
