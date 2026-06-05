// ─────────────────────────────────────────────────────────────────────────────
// /analytics — Creator Analytics Dashboard
// Only visible to creator accounts. Shows performance metrics, visibility
// score, profile completion, and recent activity feed.
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft, Eye, Bookmark, Zap, FolderOpen,
  TrendingUp, CheckCircle2, Clock, AlertCircle,
  ChevronRight, ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

import type { CreatorProfile } from "@/types/creator";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — MRKT" }] }),
  component: AnalyticsPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  canvas:         "#000",
  base:           "oklch(0.075 0 0)",
  surface:        "oklch(0.11 0 0)",
  raised:         "oklch(0.15 0 0)",
  high:           "oklch(0.19 0 0)",
  borderSubtle:   "oklch(1 0 0 / 9%)",
  borderNormal:   "oklch(1 0 0 / 13%)",
  borderStrong:   "oklch(1 0 0 / 20%)",
  shadowCard:     "inset 0 1px 0 oklch(1 0 0 / 11%), 0 2px 8px oklch(0 0 0 / 55%), 0 1px 2px oklch(0 0 0 / 40%)",
  textPrimary:    "oklch(1 0 0 / 92%)",
  textSecondary:  "oklch(1 0 0 / 68%)",
  textTertiary:   "oklch(1 0 0 / 46%)",
  textQuaternary: "oklch(1 0 0 / 30%)",
  textMuted:      "oklch(1 0 0 / 20%)",
  chrome:         "oklch(0.82 0.005 250)",
  accent:         "oklch(0.72 0.14 152)",
} as const;

// ─── Visibility Score ─────────────────────────────────────────────────────────
//
// Score is 0–100. Each check contributes a fixed number of points.
// The weighting reflects what most impacts discoverability in AI matching.
//
// | Check                      | Points | Rationale                          |
// |----------------------------|--------|------------------------------------|
// | Profile is active/live     |   20   | Must be live to appear in matching |
// | Profile photo uploaded     |   10   | Visual trust signal for businesses |
// | Bio filled                 |   15   | Describes creator to AI + humans   |
// | Categories selected        |   15   | Core matching signal               |
// | Platforms selected         |   15   | Core matching signal               |
// | Audience data completed    |   10   | Improves match quality             |
// | Portfolio links added      |   10   | Social proof for businesses        |
// | Rate range set             |    5   | Helps businesses qualify fit       |
// | Total                      |  100   |                                    |
//
// To adjust: change the `pts` value on any check below. The total must sum to 100.

interface VisibilityResult {
  score: number;
  suggestions: string[];
}

function computeVisibilityScore(cp: CreatorProfile): VisibilityResult {
  const checks: Array<{ pts: number; met: boolean; suggestion: string }> = [
    {
      pts:        20,
      met:        cp.status === "active",
      suggestion: "Publish your profile so it appears in matching results",
    },
    {
      pts:        10,
      met:        !!cp.profile_image_url,
      suggestion: "Upload a profile photo",
    },
    {
      pts:        15,
      met:        !!(cp.bio && cp.bio.trim().length > 10),
      suggestion: "Write a bio that describes what you create",
    },
    {
      pts:        15,
      met:        cp.categories.length > 0,
      suggestion: "Select at least one creator category",
    },
    {
      pts:        15,
      met:        cp.platforms.length > 0,
      suggestion: "Add the platforms where you create content",
    },
    {
      pts:        10,
      met:        !!(cp.audience_location || cp.audience_age_range || cp.audience_gender_split || cp.primary_language),
      suggestion: "Complete your audience information",
    },
    {
      pts:        10,
      met:        !!(cp.featured_link_1 || cp.featured_link_2 || cp.featured_link_3),
      suggestion: "Add portfolio links to showcase your work",
    },
    {
      pts:         5,
      met:         !!cp.rate_range,
      suggestion:  "Set a rate range so brands can evaluate fit",
    },
  ];

  const score       = checks.reduce((s, c) => s + (c.met ? c.pts : 0), 0);
  const suggestions = checks.filter((c) => !c.met).map((c) => c.suggestion);
  return { score, suggestions };
}

// ─── Profile Completion ───────────────────────────────────────────────────────

function computeProfileCompletion(cp: CreatorProfile): number {
  const checks = [
    !!cp.display_name,
    !!cp.profile_image_url,
    !!(cp.bio && cp.bio.trim().length > 10),
    cp.categories.length > 0,
    cp.platforms.length > 0,
    !!(cp.instagram_handle || cp.tiktok_handle || cp.youtube_handle),
    !!(cp.audience_location || cp.audience_age_range),
    !!(cp.featured_link_1 || cp.featured_link_2 || cp.featured_link_3),
    !!cp.rate_range,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsEvent {
  id: string;
  event_type: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

interface SaveEvent {
  id: string;
  created_at: string;
  project_id: string | null;
}

interface ActivityItem {
  id: string;
  type: "profile_viewed" | "appeared_in_matching" | "saved_to_project" | "profile_updated";
  label: string;
  detail?: string;
  created_at: string;
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub,
}: {
  icon: ReactNode; label: string; value: number | string; sub?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="h-8 w-8 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderSubtle}` }}
        >
          <span style={{ color: C.textQuaternary }}>{icon}</span>
        </div>
      </div>
      <div className="text-[2rem] font-bold tracking-tight leading-none mb-1.5"
        style={{ color: C.chrome, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-0.5" style={{ color: C.textQuaternary }}>
        {label}
      </div>
      {sub && (
        <div className="text-[11px] mt-1" style={{ color: C.textMuted }}>{sub}</div>
      )}
    </div>
  );
}

function VisibilityCard({ score, suggestions }: VisibilityResult) {
  const scoreColor =
    score >= 80 ? "oklch(0.72 0.14 152)"
    : score >= 50 ? "oklch(0.78 0.12 60)"
    : "oklch(0.65 0.18 25)";

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-1" style={{ color: C.textQuaternary }}>
            Visibility Score
          </div>
          <div className="text-[11px]" style={{ color: C.textMuted }}>
            How discoverable you are in MRKT matching
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[2.8rem] font-bold tracking-tight leading-none" style={{ color: scoreColor, fontVariantNumeric: "tabular-nums" }}>
            {score}
          </div>
          <div className="text-[11px]" style={{ color: C.textMuted }}>out of 100</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-5" style={{ background: "oklch(1 0 0 / 6%)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: scoreColor }}
        />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 ? (
        <div className="space-y-0">
          <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-3" style={{ color: C.textQuaternary }}>
            Improve your score
          </div>
          {suggestions.map((s) => (
            <div
              key={s}
              className="flex items-center gap-3 py-2.5"
              style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
            >
              <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.78 0.12 60 / 12%)", border: "1px solid oklch(0.78 0.12 60 / 25%)" }}>
                <AlertCircle className="h-3 w-3" style={{ color: "oklch(0.78 0.12 60)" }} />
              </div>
              <span className="text-[12.5px]" style={{ color: C.textTertiary }}>{s}</span>
              <Link to="/creator-onboarding" className="ml-auto shrink-0">
                <ChevronRight className="h-3.5 w-3.5" style={{ color: C.textMuted }} />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: C.accent }} />
          <span className="text-[12.5px]" style={{ color: C.textTertiary }}>
            Your profile is fully optimised for discovery.
          </span>
        </div>
      )}
    </div>
  );
}

function CompletionCard({ pct, creatorProfileId }: { pct: number; creatorProfileId: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-1" style={{ color: C.textQuaternary }}>
            Profile Completion
          </div>
          <div className="text-[2rem] font-bold tracking-tight leading-none" style={{ color: C.chrome, fontVariantNumeric: "tabular-nums" }}>
            {pct}%
          </div>
        </div>
        <Link
          to="/creator-onboarding"
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[12px] font-medium transition-all duration-150"
          style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textPrimary; (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}
        >
          Edit Profile <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 6%)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? C.accent : C.chrome,
          }}
        />
      </div>
      <div className="mt-2.5 text-[11px]" style={{ color: C.textMuted }}>
        {pct < 100 ? `${100 - pct}% left — complete your profile to maximise visibility.` : "Profile fully complete."}
      </div>
      <Link
        to={`/creators/${creatorProfileId}` as "/"}
        className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] transition-colors duration-150"
        style={{ color: C.textMuted }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
      >
        View public profile <ArrowUpRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

const EVENT_ICONS: Record<string, ReactNode> = {
  profile_viewed:        <Eye className="h-3 w-3" />,
  appeared_in_matching:  <Zap className="h-3 w-3" />,
  saved_to_project:      <Bookmark className="h-3 w-3" />,
  profile_updated:       <CheckCircle2 className="h-3 w-3" />,
};

const EVENT_COLORS: Record<string, string> = {
  profile_viewed:        "oklch(0.65 0.14 250)",
  appeared_in_matching:  "oklch(0.72 0.14 152)",
  saved_to_project:      "oklch(0.78 0.12 60)",
  profile_updated:       "oklch(0.82 0.005 250)",
};

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <Clock className="h-6 w-6 mx-auto mb-3" style={{ color: C.textMuted }} />
        <div className="text-[12.5px]" style={{ color: C.textMuted }}>
          Activity will appear here as businesses view and save your profile.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item) => {
        const color = EVENT_COLORS[item.type] ?? C.textMuted;
        return (
          <div
            key={item.id}
            className="flex items-center gap-3.5 py-3"
            style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
          >
            <div
              className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: `${color.replace(")", " / 10%)")}`,
                border: `1px solid ${color.replace(")", " / 22%)")}`,
              }}
            >
              <span style={{ color }}>{EVENT_ICONS[item.type]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px]" style={{ color: C.textSecondary }}>{item.label}</div>
              {item.detail && (
                <div className="text-[11px] mt-0.5 truncate" style={{ color: C.textMuted }}>{item.detail}</div>
              )}
            </div>
            <div className="text-[10.5px] shrink-0 tabular-nums" style={{ color: C.textQuaternary }}>
              {relativeTime(item.created_at)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PageSkeleton() {
  const bar = (w: string, h = "h-3") => (
    <div className={`${h} rounded-full animate-pulse`}
      style={{ background: "oklch(1 0 0 / 8%)", width: w }} />
  );
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="space-y-2">{bar("140px", "h-5")}{bar("80px")}</div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl p-5 space-y-4 animate-pulse"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}` }}>
            {bar("40px", "h-8")}{bar("60%")}{bar("80%")}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

function AnalyticsPage() {
  const { user } = useAuth();
  const nav      = useNavigate();

  const [loading,          setLoading]          = useState(true);
  const [notCreator,       setNotCreator]        = useState(false);
  const [creatorProfile,   setCreatorProfile]    = useState<CreatorProfile | null>(null);
  const [profileViews,     setProfileViews]      = useState(0);
  const [matchAppearances, setMatchAppearances]  = useState(0);
  const [savedByCount,     setSavedByCount]      = useState(0);
  const [projectsCount,    setProjectsCount]     = useState(0);
  const [activity,         setActivity]          = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      // 1. Check account type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("account_type,onboarding_path")
        .eq("id", user!.id)
        .single();

      const isCreator =
        profile?.account_type === "creator" || profile?.onboarding_path === "creator";

      if (!isCreator) {
        setNotCreator(true);
        setLoading(false);
        return;
      }

      // 2. Load creator profile
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cp } = await (supabase as any)
        .from("creator_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!cp) {
        setLoading(false);
        return;
      }
      setCreatorProfile(cp as CreatorProfile);

      const creatorId = cp.id as string;

      // 3. Fetch analytics events (views + matching appearances) + saves — parallel
      const [eventsRes, savesRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("creator_analytics_events")
          .select("id,event_type,meta,created_at")
          .eq("creator_profile_id", creatorId)
          .order("created_at", { ascending: false })
          .limit(100),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("project_saved_creators")
          .select("id,project_id,created_at")
          .eq("creator_profile_id", creatorId)
          .order("created_at", { ascending: false }),
      ]);

      const events: AnalyticsEvent[] = eventsRes.data ?? [];
      const saves:  SaveEvent[]      = savesRes.data  ?? [];

      // 4. Compute metric counts
      const views    = events.filter((e) => e.event_type === "profile_viewed").length;
      const matching = events.filter((e) => e.event_type === "appeared_in_matching").length;
      const savedBy  = saves.length;
      const projects = new Set(saves.map((s) => s.project_id).filter(Boolean)).size;

      setProfileViews(views);
      setMatchAppearances(matching);
      setSavedByCount(savedBy);
      setProjectsCount(projects);

      // 5. Build activity feed — merge events + saves, sort newest first
      const activityItems: ActivityItem[] = [];

      for (const e of events.slice(0, 40)) {
        const meta = e.meta as Record<string, string> | null;
        let label  = "";
        let detail: string | undefined;

        if (e.event_type === "profile_viewed") {
          label  = "Your profile was viewed";
        } else if (e.event_type === "appeared_in_matching") {
          label  = "You appeared in AI matching";
          detail = meta?.project_name ? `${meta.project_name}` : undefined;
        } else if (e.event_type === "saved_to_project") {
          label  = "Saved to a project";
          detail = meta?.project_name ? `${meta.project_name}` : undefined;
        } else if (e.event_type === "profile_updated") {
          label  = "Profile updated";
        }

        if (label) {
          activityItems.push({
            id:         e.id,
            type:       e.event_type as ActivityItem["type"],
            label,
            detail,
            created_at: e.created_at,
          });
        }
      }

      setActivity(activityItems.slice(0, 20));
      setLoading(false);
    }

    load();
  }, [user]);

  const topBar = (
    <div className="h-[52px] px-6 flex items-center gap-2 shrink-0" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
      <span className="text-[12px]" style={{ color: C.textMuted }}>Account</span>
      <span className="text-[12px]" style={{ color: C.textMuted }}>/</span>
      <span className="text-[12px] font-medium" style={{ color: C.textSecondary }}>Analytics</span>
    </div>
  );

  if (loading) {
    return (
      <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas }}>
        {topBar}
        <div className="flex-1 overflow-y-auto"><PageSkeleton /></div>
      </div>
    );
  }

  if (notCreator) {
    return (
      <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas }}>
        {topBar}
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="text-[13px] mb-4" style={{ color: C.textTertiary }}>
            Creator Analytics is only available for creator accounts.
          </div>
          <Link
            to="/chat"
            className="text-[12px] transition-colors duration-150"
            style={{ color: C.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!creatorProfile) {
    return (
      <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas }}>
        {topBar}
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="text-[13px] mb-4" style={{ color: C.textTertiary }}>
            Set up your creator profile first to see your analytics.
          </div>
          <Link
            to="/creator-onboarding"
            className="btn-primary inline-flex items-center gap-2 rounded-full px-6 h-9 text-[12.5px] font-medium"
          >
            Build Creator Profile <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const visibility  = computeVisibilityScore(creatorProfile);
  const completion  = computeProfileCompletion(creatorProfile);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas, color: C.textPrimary }}>
      {topBar}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 pb-20 space-y-8">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-1.5"
            style={{ color: C.textQuaternary }}>
            Creator Dashboard
          </div>
          <h1 className="text-[1.6rem] font-bold tracking-tight leading-tight"
            style={{ color: C.textPrimary }}>
            Analytics
          </h1>
          <p className="mt-1.5 text-[13px]" style={{ color: C.textMuted }}>
            {creatorProfile.display_name} · {creatorProfile.status === "active" ? "Live on MRKT Connect" : "Profile not yet live"}
          </p>
        </div>

        {/* ── Metric cards ─────────────────────────────────────────── */}
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-4"
            style={{ color: C.textQuaternary }}>
            Performance
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Eye className="h-3.5 w-3.5" />}
              label="Profile Views"
              value={profileViews}
              sub="Times your profile was viewed"
            />
            <StatCard
              icon={<Bookmark className="h-3.5 w-3.5" />}
              label="Saved by Businesses"
              value={savedByCount}
              sub="Times saved to a project"
            />
            <StatCard
              icon={<Zap className="h-3.5 w-3.5" />}
              label="Matching Appearances"
              value={matchAppearances}
              sub="Appeared in AI matching results"
            />
            <StatCard
              icon={<FolderOpen className="h-3.5 w-3.5" />}
              label="Projects Interested In"
              value={projectsCount}
              sub="Distinct projects you're in"
            />
          </div>
        </div>

        {/* ── Visibility Score ──────────────────────────────────────── */}
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-4"
            style={{ color: C.textQuaternary }}>
            Discovery
          </div>
          <VisibilityCard {...visibility} />
        </div>

        {/* ── Profile Completion ────────────────────────────────────── */}
        <CompletionCard pct={completion} creatorProfileId={creatorProfile.id} />

        {/* ── Activity Feed ─────────────────────────────────────────── */}
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-4"
            style={{ color: C.textQuaternary }}>
            Recent Activity
          </div>
          <div
            className="rounded-2xl px-5 py-2"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
          >
            <ActivityFeed items={activity} />
          </div>
        </div>

        {/* ── Quick links ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            to="/creator-onboarding"
            className="inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-[12px] font-medium transition-all duration-150"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, color: C.textTertiary, boxShadow: C.shadowCard }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
          >
            Edit Profile <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link
            to={`/creators/${creatorProfile.id}` as "/"}
            className="inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-[12px] font-medium transition-all duration-150"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, color: C.textTertiary, boxShadow: C.shadowCard }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
          >
            View Public Profile <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}

// (PageHeader kept but unused — AppShell provides global nav)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PageHeader() {
  return (
    <header
      className="h-[56px] px-5 flex items-center gap-4 shrink-0 sticky top-0 z-10"
      style={{
        background: "oklch(0 0 0 / 80%)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid oklch(1 0 0 / 8%)`,
      }}
    >
      <Link to="/chat"><Logo /></Link>
      <Link
        to="/chat"
        className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] transition-colors duration-150"
        style={{ color: "oklch(1 0 0 / 35%)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 68%)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 35%)"; }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </Link>
    </header>
  );
}
