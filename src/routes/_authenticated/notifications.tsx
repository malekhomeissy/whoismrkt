import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { trackMarketplaceEvent } from "@/lib/marketplaceEvents";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  fetchNotifications, markNotificationRead, markAllNotificationsRead,
  type AppNotification,
} from "@/lib/notifications";
import {
  Bell, MessageSquare, UserPlus, Star,
  ThumbsUp, ThumbsDown, Info, CheckCheck, Zap, Eye, Mail,
  Bookmark, ShieldCheck, FileText, RotateCcw, Sparkles, ArrowRightLeft,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — MRKT" }] }),
  component: NotificationsPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Type config ──────────────────────────────────────────────────────────────

type NotifMeta = { icon: React.ReactNode; iconBg: string; label: string };

function notifMeta(type: string): NotifMeta {
  const sz = "h-4 w-4";
  switch (type) {
    case "new_message":
      return {
        icon:   <MessageSquare className={sz} style={{ color: "oklch(0.72 0.10 224)" }} />,
        iconBg: "oklch(0.62 0.10 224 / 12%)",
        label:  "Message",
      };
    case "new_applicant":
      return {
        icon:   <UserPlus className={sz} style={{ color: "oklch(0.72 0.10 224)" }} />,
        iconBg: "oklch(0.62 0.10 224 / 12%)",
        label:  "New Applicant",
      };
    case "reviewing":
      return {
        icon:   <Eye className={sz} style={{ color: "oklch(0.70 0.08 68)" }} />,
        iconBg: "oklch(0.78 0.14 76 / 12%)",
        label:  "Under Review",
      };
    case "contacted":
      return {
        icon:   <Mail className={sz} style={{ color: "oklch(0.70 0.08 68)" }} />,
        iconBg: "oklch(0.78 0.14 76 / 12%)",
        label:  "Contacted",
      };
    case "shortlisted":
      return {
        icon:   <Star className={sz} style={{ color: "oklch(0.72 0.10 224)" }} />,
        iconBg: "oklch(0.62 0.10 224 / 12%)",
        label:  "Shortlisted",
      };
    case "accepted":
      return {
        icon:   <ThumbsUp className={sz} style={{ color: "oklch(0.62 0.12 158)" }} />,
        iconBg: "oklch(0.72 0.18 152 / 12%)",
        label:  "Selected",
      };
    case "rejected":
      return {
        icon:   <ThumbsDown className={sz} style={{ color: "oklch(0.52 0.15 24)" }} />,
        iconBg: "oklch(0.52 0.15 24 / 10%)",
        label:  "Update",
      };
    case "match_recommendation":
      return {
        icon:   <Zap className={sz} style={{ color: "oklch(0.72 0.10 224)" }} />,
        iconBg: "oklch(0.62 0.10 224 / 12%)",
        label:  "Match",
      };
    case "saved_to_project":
      return {
        icon:   <Bookmark className={sz} style={{ color: "oklch(0.70 0.08 68)" }} />,
        iconBg: "oklch(0.78 0.14 76 / 12%)",
        label:  "Saved",
      };
    case "verified":
      return {
        icon:   <ShieldCheck className={sz} style={{ color: "oklch(0.72 0.10 224)" }} />,
        iconBg: "oklch(0.62 0.10 224 / 12%)",
        label:  "Verified",
      };
    case "contract_sent":
      return {
        icon:   <FileText className={sz} style={{ color: "oklch(0.70 0.08 68)" }} />,
        iconBg: "oklch(0.78 0.14 76 / 12%)",
        label:  "Contract",
      };
    case "deliverable_approved":
      return {
        icon:   <ThumbsUp className={sz} style={{ color: "oklch(0.62 0.12 158)" }} />,
        iconBg: "oklch(0.72 0.18 152 / 12%)",
        label:  "Approved",
      };
    case "revision_requested":
      return {
        icon:   <RotateCcw className={sz} style={{ color: "oklch(0.70 0.08 68)" }} />,
        iconBg: "oklch(0.78 0.14 76 / 12%)",
        label:  "Revision",
      };
    case "pipeline_moved":
      return {
        icon:   <ArrowRightLeft className={sz} style={{ color: "oklch(0.72 0.10 224)" }} />,
        iconBg: "oklch(0.62 0.10 224 / 12%)",
        label:  "Pipeline",
      };
    case "new_opportunity":
      return {
        icon:   <Zap className={sz} style={{ color: "oklch(0.82 0.18 58)" }} />,
        iconBg: "oklch(0.82 0.18 58 / 12%)",
        label:  "Opportunity",
      };
    case "weekly_ai_insight":
      return {
        icon:   <Sparkles className={sz} style={{ color: "oklch(0.72 0.10 224)" }} />,
        iconBg: "oklch(0.62 0.10 224 / 14%)",
        label:  "AI Insight",
      };
    default:
      return {
        icon:   <Info className={sz} style={{ color: "oklch(1 0 0 / 40%)" }} />,
        iconBg: "oklch(1 0 0 / 7%)",
        label:  "Info",
      };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)     return "just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function bucketLabel(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000;
  if (diff < 1)  return "Today";
  if (diff < 7)  return "This Week";
  if (diff < 30) return "This Month";
  return "Earlier";
}

// ─── Single notification row ──────────────────────────────────────────────────

function NotifRow({
  n,
  onRead,
}: {
  n: AppNotification;
  onRead: (n: AppNotification) => void;
}) {
  const meta = notifMeta(n.type);

  return (
    <button
      onClick={() => onRead(n)}
      className="w-full text-left flex items-start gap-4 px-6 py-4 transition-all duration-100"
      style={{
        background:   "transparent",
        borderBottom: `1px solid ${C.borderSubtle}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = C.raisedHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {/* Icon */}
      <div
        className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center mt-0.5"
        style={{ background: meta.iconBg }}
      >
        {meta.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p
              className="text-[13.5px] leading-snug mb-0.5"
              style={{
                color:      n.read ? C.textSecondary : C.textPrimary,
                fontWeight: n.read ? 400 : 500,
              }}
            >
              {n.title}
            </p>
            {n.body && (
              <p
                className="text-[12px] leading-relaxed line-clamp-2"
                style={{ color: C.textMuted }}
              >
                {n.body}
              </p>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
            <span className="text-[11px] whitespace-nowrap" style={{ color: C.textMuted }}>
              {relativeTime(n.created_at)}
            </span>
            {!n.read && (
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: C.accent }}
              />
            )}
          </div>
        </div>

        {/* Type chip */}
        <div className="mt-1.5">
          <span
            className="inline-block text-[10px] uppercase tracking-[0.15em] font-medium rounded-full px-2 py-0.5"
            style={{ background: meta.iconBg, color: C.textTertiary }}
          >
            {meta.label}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 px-6 py-4" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
      <div className="skeleton shrink-0 h-9 w-9 rounded-xl" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="skeleton" style={{ height: 13, width: "55%" }} />
        <div className="skeleton" style={{ height: 11, width: "75%" }} />
        <div className="skeleton" style={{ height: 10, width: 60, borderRadius: 99 }} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

function NotificationsPage() {
  const { user }        = useAuth();
  const navigate        = useNavigate();
  const [items,         setItems]        = useState<AppNotification[]>([]);
  const [loading,       setLoading]      = useState(true);
  const [loadingMore,   setLoadingMore]  = useState(false);
  const [hasMore,       setHasMore]      = useState(false);
  const [page,          setPage]         = useState(0);
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchNotifications(user.id, PAGE_SIZE);
    setItems(data);
    setHasMore(data.length === PAGE_SIZE);
    setPage(0);
    setLoading(false);

    // Auto-mark all unread as read the moment the page loads.
    // Fire an event so AppShell zeros its badge immediately.
    const hasUnread = data.some((n) => !n.read);
    if (hasUnread) {
      await markAllNotificationsRead(user.id);
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      window.dispatchEvent(new CustomEvent("mrkt:notifications-read"));
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime: new notification → prepend
  useEffect(() => {
    if (!user) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel("notif-page")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as AppNotification;
        setItems((prev) => [n, ...prev]);
      })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  async function handleRead(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(n.id);
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    if (user) {
      trackMarketplaceEvent({
        actorUserId: user.id,
        eventType: "notification_clicked",
        metadata: { notification_id: n.id, notification_type: n.type, link: n.link },
      });
    }
    if (n.link) navigate({ to: n.link as "/" });
  }

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    window.dispatchEvent(new CustomEvent("mrkt:notifications-read"));
  }

  async function loadMore() {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const data = await fetchNotifications(user.id, PAGE_SIZE, nextPage * PAGE_SIZE);
    setItems(prev => [...prev, ...data]);
    setHasMore(data.length === PAGE_SIZE);
    setPage(nextPage);
    setLoadingMore(false);
  }

  const unreadCount = items.filter((n) => !n.read).length;

  // Group by bucket
  const buckets = items.reduce<Record<string, AppNotification[]>>((acc, n) => {
    const label = bucketLabel(n.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(n);
    return acc;
  }, {});
  const BUCKET_ORDER = ["Today", "This Week", "This Month", "Earlier"];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
      >
        <div className="flex items-center gap-3">
          <Bell className="h-4.5 w-4.5" style={{ color: C.accent }} />
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: C.textPrimary }}>
            Notifications
          </h1>
          {unreadCount > 0 && !loading && (
            <span
              className="text-[10px] font-bold rounded-full px-2 py-0.5"
              style={{ background: "oklch(0.62 0.10 224)", color: "oklch(1 0 0 / 95%)" }}
            >
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all duration-100"
            style={{ color: C.accent }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(1 0 0 / 8%) transparent" }}>
        {loading ? (
          <div>
            {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-8">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: C.surface, border: `1px solid ${C.borderSubtle}` }}
            >
              <Bell className="h-6 w-6" style={{ color: C.textMuted }} />
            </div>
            <p className="text-[14px] font-medium mb-1" style={{ color: C.textSecondary }}>
              You're all caught up
            </p>
            <p className="text-[12.5px]" style={{ color: C.textMuted }}>
              Notifications for messages, applications, and updates will appear here.
            </p>
          </div>
        ) : (
          BUCKET_ORDER.filter((b) => buckets[b]?.length).map((bucket) => (
            <div key={bucket}>
              {/* Bucket label */}
              <div
                className="px-6 py-2 sticky top-0 z-10"
                style={{
                  background:   "oklch(0.065 0 0 / 92%)",
                  backdropFilter: "blur(8px)",
                  borderBottom: `1px solid ${C.borderSubtle}`,
                }}
              >
                <span
                  className="text-[10.5px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: C.textMuted }}
                >
                  {bucket}
                </span>
              </div>

              {/* Rows */}
              {buckets[bucket].map((n) => (
                <NotifRow key={n.id} n={n} onRead={handleRead} />
              ))}
            </div>
          ))
        )}
        {hasMore && !loading && (
          <div className="flex justify-center py-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-[13px] font-medium px-5 py-2 rounded-lg"
              style={{
                background: "oklch(1 0 0 / 6%)",
                border: `1px solid ${C.borderSubtle}`,
                color: C.textSecondary,
                cursor: loadingMore ? "default" : "pointer",
                opacity: loadingMore ? 0.5 : 1,
              }}
            >
              {loadingMore ? "Loading…" : "Load older notifications"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
