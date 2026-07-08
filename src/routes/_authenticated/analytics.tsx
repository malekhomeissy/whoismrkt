// ─────────────────────────────────────────────────────────────────────────────
// /analytics — Creator Analytics Dashboard
// Only visible to creator accounts. Shows performance metrics, visibility
// score, profile completion, and recent activity feed.
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { trackMarketplaceEvent } from "@/lib/marketplaceEvents";
import type { ReactNode } from "react";
import {
  ArrowLeft, Eye, Bookmark, Zap, FolderOpen,
  TrendingUp, CheckCircle2, Clock, AlertCircle,
  ChevronRight, ArrowUpRight, ShieldCheck, Star,
  RefreshCw, Target, Users,
} from "lucide-react";
import { TRUST_TIER_CONFIG } from "@/lib/matchScore";
import type { CreatorTrustScore } from "@/lib/matchScore";
import { TrustScoreBadge } from "@/components/ui/TrustScoreBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/site/Logo";

import type { CreatorProfile } from "@/types/creator";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — MRKT" }] }),
  component: AnalyticsPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

import { computeVisibilityScore, type VisibilityResult } from "@/lib/visibilityScore";

// ─── Profile Completion ───────────────────────────────────────────────────────

import { computeCreatorCompletion } from "@/lib/profileCompletion";

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
      style={{
        padding: "20px 22px",
        background: C.surface,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 16,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: C.accentMuted, border: `1px solid ${C.aiBlueBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 14,
      }}>
        <span style={{ color: C.aiBlue }}>{icon}</span>
      </div>
      <div
        className="display-num leading-none mb-2"
        style={{ color: C.textPrimary, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: C.textTertiary, marginBottom: 4 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: C.textQuaternary, lineHeight: 1.4 }}>{sub}</div>
      )}
    </div>
  );
}

function VisibilityCard({ score, suggestions }: VisibilityResult) {
  const scoreColor =
    score >= 80 ? "oklch(0.62 0.12 158)"
    : score >= 60 ? "oklch(0.72 0.10 224)"
    : score >= 40 ? "oklch(0.70 0.08 68)"
    : "oklch(0.52 0.15 24)";
  const scoreLabel =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Building";

  // SVG ring dimensions
  const R = 54; const CX = 70; const CY = 70;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - score / 100);

  return (
    <div className="relative overflow-hidden">
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)",
        width: 200, height: 200, borderRadius: "50%",
        background: `radial-gradient(circle, ${scoreColor.replace(")", " / 8%)")} 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div className="flex items-start gap-6">
        {/* Ring */}
        <div className="shrink-0 relative" style={{ width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
            {/* Track */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none" stroke="oklch(1 0 0 / 6%)" strokeWidth="10"
            />
            {/* Fill */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={scoreColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className="score-ring-fill"
              style={{
                transition: "stroke-dashoffset 1.2s cubic-bezier(0.34, 1.2, 0.64, 1)",
                filter: `drop-shadow(0 0 8px ${scoreColor.replace(")", " / 35%)")})`,
              }}
            />
          </svg>
          {/* Number overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="score-num-in" style={{
              fontSize: "2.25rem",
              fontWeight: 800,
              fontFamily: "'Inter Tight', 'Inter', sans-serif",
              color: C.textPrimary,
              letterSpacing: "-0.05em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}>
              {score}
            </span>
            <span style={{ fontSize: 10, color: "oklch(1 0 0 / 30%)", marginTop: 2, fontWeight: 500 }}>/ 100</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-1">
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3em", color: "oklch(1 0 0 / 24%)", marginBottom: 8 }}>
            Visibility Score
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 8,
              background: scoreColor.replace(")", " / 12%)"),
              border: `1px solid ${scoreColor.replace(")", " / 22%)")}`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: scoreColor }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>{scoreLabel}</span>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: "oklch(1 0 0 / 40%)", lineHeight: 1.5, marginBottom: 16 }}>
            You're more discoverable than <strong style={{ color: "oklch(1 0 0 / 70%)", fontWeight: 600 }}>{Math.min(99, score + 4)}%</strong> of creators.
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{ background: "oklch(1 0 0 / 6%)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${score}%`, background: scoreColor, transition: "width 1.2s cubic-bezier(0.34, 1.2, 0.64, 1)" }}
            />
          </div>
          <div style={{ fontSize: 11, color: "oklch(1 0 0 / 24%)" }}>{score} out of 100</div>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 ? (
        <div className="mt-5 space-y-0" style={{ borderTop: "1px solid oklch(1 0 0 / 6%)", paddingTop: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.28em", color: "oklch(1 0 0 / 22%)", marginBottom: 12 }}>
            Actions to improve
          </div>
          {suggestions.map((s) => (
            <div
              key={s}
              className="flex items-center gap-3 py-2.5"
              style={{ borderBottom: `1px solid oklch(1 0 0 / 5%)` }}
            >
              <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.70 0.08 68 / 10%)", border: "1px solid oklch(0.70 0.08 68 / 22%)" }}>
                <AlertCircle className="h-3 w-3" style={{ color: "oklch(0.70 0.08 68)" }} />
              </div>
              <span className="text-[12.5px] flex-1" style={{ color: C.textTertiary }}>{s}</span>
              <Link to="/creator-onboarding" className="ml-auto shrink-0">
                <ChevronRight className="h-3.5 w-3.5" style={{ color: C.textMuted }} />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 mt-5 py-3" style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}>
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "oklch(0.62 0.12 158)" }} />
          <span className="text-[12.5px]" style={{ color: C.textTertiary }}>
            Your profile is fully optimised for discovery.
          </span>
        </div>
      )}
    </div>
  );
}

function CompletionCard({ pct, creatorProfileId }: { pct: number; creatorProfileId: string }) {
  const barColor = pct === 100 ? C.green : pct >= 70 ? C.aiBlue : C.amber;
  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div style={{ fontFamily: "'Inter Tight', 'Inter', sans-serif", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, color: barColor, fontVariantNumeric: "tabular-nums" }}>
          {pct}%
        </div>
        <Link
          to="/creator-onboarding"
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[12px] font-medium transition-all duration-150"
          style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textTertiary }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.aiBlueBorder; (e.currentTarget as HTMLElement).style.color = C.aiBlue; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
        >
          Edit <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: C.borderSubtle }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: barColor, transition: "width 0.9s cubic-bezier(0.34, 1.2, 0.64, 1)" }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 12, color: C.textTertiary }}>
          {pct < 100 ? `${100 - pct}% remaining — complete your profile to boost visibility` : "Profile fully complete"}
        </div>
        <Link
          to={`/creators/${creatorProfileId}` as "/"}
          className="inline-flex items-center gap-1 transition-colors duration-150 shrink-0 ml-4"
          style={{ fontSize: 11, color: C.textMuted }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
        >
          View public profile <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </>
  );
}

const EVENT_ICONS: Record<string, ReactNode> = {
  profile_viewed:        <Eye className="h-3 w-3" />,
  appeared_in_matching:  <Zap className="h-3 w-3" />,
  saved_to_project:      <Bookmark className="h-3 w-3" />,
  profile_updated:       <CheckCircle2 className="h-3 w-3" />,
};

const EVENT_COLORS: Record<string, string> = {
  profile_viewed:        C.aiBlue,
  appeared_in_matching:  C.accent,
  saved_to_project:      C.green,
  profile_updated:       C.chrome,
};

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center">
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

function TrustScoreCard({ trust }: { trust: CreatorTrustScore | null }) {
  if (!trust) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderSubtle}` }}
          >
            <ShieldCheck className="h-4.5 w-4.5" style={{ color: C.textQuaternary }} />
          </div>
          <div>
            <div className="text-[13px] font-medium mb-1" style={{ color: C.textSecondary }}>
              Trust Score not yet computed
            </div>
            <div className="text-[11.5px]" style={{ color: C.textMuted }}>
              Complete your first campaign to start building your Trust Score. It improves your match score with brands.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cfg = TRUST_TIER_CONFIG[trust.tier];

  const rows: Array<{ label: string; value: number; icon: ReactNode; description: string }> = [
    {
      label:       "Campaign Completion",
      value:       Math.round(trust.completion_rate * 100),
      icon:        <CheckCircle2 className="h-3 w-3" />,
      description: "Contracts accepted and successfully delivered",
    },
    {
      label:       "Content Approval",
      value:       Math.round(trust.approval_rate * 100),
      icon:        <Target className="h-3 w-3" />,
      description: "Deliverables approved without major revisions",
    },
    {
      label:       "Average Rating",
      value:       Math.round((trust.avg_rating / 5) * 100),
      icon:        <Star className="h-3 w-3" />,
      description: `${trust.avg_rating.toFixed(1)} / 5.0 from ${trust.total_reviews} review${trust.total_reviews !== 1 ? "s" : ""}`,
    },
    {
      label:       "Repeat Collaborations",
      value:       Math.round(trust.repeat_rate * 100),
      icon:        <RefreshCw className="h-3 w-3" />,
      description: "Brands who have worked with you more than once",
    },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
    >
      {/* Header */}
      <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <ShieldCheck className="h-4 w-4" style={{ color: cfg.color }} />
          </div>
          <div>
            <div className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>
              Creator Trust Score
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>
              {trust.total_campaigns} campaign{trust.total_campaigns !== 1 ? "s" : ""} · {trust.total_reviews} review{trust.total_reviews !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[2.4rem] font-bold tracking-tight leading-none mb-1"
            style={{ color: cfg.color, fontVariantNumeric: "tabular-nums" }}>
            {trust.score}
          </div>
          <TrustScoreBadge score={trust.score} tier={trust.tier} size="sm" showScore={false} />
        </div>
      </div>

      {/* Score bar */}
      <div className="px-5 pt-4 pb-1">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 6%)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${trust.score}%`, background: cfg.color }}
          />
        </div>
      </div>

      {/* Component breakdown */}
      <div className="p-5 space-y-0">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center gap-3.5 py-3"
            style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
          >
            <div
              className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}` }}
            >
              <span style={{ color: C.textQuaternary }}>{row.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-medium" style={{ color: C.textSecondary }}>{row.label}</span>
                <span className="text-[12px] font-semibold tabular-nums shrink-0 ml-3"
                  style={{ color: row.value >= 70 ? "oklch(0.62 0.12 158)" : row.value >= 45 ? "oklch(0.72 0.10 224)" : "oklch(1 0 0 / 45%)" }}>
                  {row.value}%
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 6%)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${row.value}%`,
                    background: row.value >= 70 ? "oklch(0.62 0.12 158)" : row.value >= 45 ? "oklch(0.72 0.10 224)" : "oklch(0.52 0.15 24)",
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
              <div className="mt-1 text-[10.5px]" style={{ color: C.textQuaternary }}>{row.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Match boost callout */}
      {trust.tier !== "new" && (
        <div className="px-5 pb-5">
          <div
            className="rounded-xl p-3.5 flex items-start gap-2.5"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <Users className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: cfg.color }} />
            <div className="text-[11.5px]" style={{ color: cfg.color }}>
              Your <strong>{cfg.label}</strong> tier adds <strong>+{TRUST_TIER_CONFIG[trust.tier].matchModifier} pts</strong> to your match score with brands — making you appear higher in campaign recommendations.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  const bar = (w: string, h = "h-3") => (
    <div className={`${h} rounded-full animate-pulse`}
      style={{ background: "oklch(1 0 0 / 8%)", width: w }} />
  );
  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
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
  const [trustScore,       setTrustScore]        = useState<CreatorTrustScore | null>(null);

  const trackedRef = useRef(false);
  useEffect(() => {
    if (!user || trackedRef.current) return;
    trackedRef.current = true;
    trackMarketplaceEvent({ actorUserId: user.id, eventType: "weekly_report_opened" });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      // 1. Check account type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await supabase
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
      const { data: cp } = await supabase
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

      // 3. Fetch analytics events, saves, and trust score — parallel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trustRes = await supabase
        .from("creator_trust_scores")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (trustRes.data) setTrustScore(trustRes.data as CreatorTrustScore);

      const [eventsRes, savesRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase
          .from("creator_analytics_events")
          .select("id,event_type,meta,created_at")
          .eq("creator_profile_id", creatorId)
          .order("created_at", { ascending: false })
          .limit(100),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase
          .from("project_saved_creators")
          .select("id,project_id,created_at")
          .eq("creator_profile_id", creatorId)
          .order("created_at", { ascending: false }),
      ]);

      const events: AnalyticsEvent[] = (eventsRes.data ?? []) as unknown as AnalyticsEvent[];
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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.canvas, overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "44px 36px 80px" }}>
          <PageSkeleton />
        </div>
      </div>
    );
  }

  if (notCreator) {
    return (
      <div style={{ minHeight: "100vh", background: C.canvas, overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "44px 36px 80px", textAlign: "center" }}>
          <div style={{ fontSize: 13, marginBottom: 16, color: C.textTertiary }}>
            Creator Analytics is only available for creator accounts.
          </div>
          <Link
            to="/chat"
            style={{ fontSize: 12, color: C.textMuted, transition: "color 150ms" }}
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
      <div style={{ minHeight: "100vh", background: C.canvas, overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "44px 36px 80px", textAlign: "center" }}>
          <div style={{ fontSize: 13, marginBottom: 16, color: C.textTertiary }}>
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
  const completion  = computeCreatorCompletion(creatorProfile).score;

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, color: C.textPrimary, overflowY: "auto" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "44px 36px 80px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: C.accentMuted, border: `1px solid ${C.aiBlueBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <TrendingUp size={17} style={{ color: C.aiBlue }} />
            </div>
            <h1 style={{
              fontSize: "clamp(1.8rem, 2.5vw, 2.25rem)", fontWeight: 700,
              color: C.textPrimary, letterSpacing: "-0.04em", lineHeight: 1.05,
              fontFamily: "'Inter Tight', 'Inter', sans-serif",
            }}>Analytics</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <p style={{ fontSize: 14, color: C.textTertiary }}>
              {profileViews > 0 ? `${profileViews} profile views this period.` : visibility.score >= 70 ? "Looking strong." : "Let's grow your reach."}
            </p>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 8,
              background: creatorProfile.status === "active" ? "oklch(0.62 0.12 158 / 10%)" : "oklch(1 0 0 / 5%)",
              border: `1px solid ${creatorProfile.status === "active" ? "oklch(0.62 0.12 158 / 22%)" : "oklch(1 0 0 / 10%)"}`,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: creatorProfile.status === "active" ? "oklch(0.62 0.12 158)" : "oklch(1 0 0 / 28%)" }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: creatorProfile.status === "active" ? "oklch(0.62 0.12 158)" : "oklch(1 0 0 / 38%)" }}>
                {creatorProfile.status === "active" ? "Live on MRKT" : "Profile not live"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Performance ── */}
        <div style={{ padding: "24px 26px", background: C.surface, border: `1px solid ${C.borderSubtle}`, borderRadius: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16 }}>
            Performance
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Eye className="h-3.5 w-3.5" />} label="Profile Views" value={profileViews} sub="Times your profile was viewed" />
            <StatCard icon={<Bookmark className="h-3.5 w-3.5" />} label="Saved by Businesses" value={savedByCount} sub="Times saved to a project" />
            <StatCard icon={<Zap className="h-3.5 w-3.5" />} label="Matching Appearances" value={matchAppearances} sub="Appeared in AI matching results" />
            <StatCard icon={<FolderOpen className="h-3.5 w-3.5" />} label="Projects Interested In" value={projectsCount} sub="Distinct projects you're in" />
          </div>
        </div>

        {/* ── Trust & Reputation ── */}
        <div style={{ padding: "24px 26px", background: C.surface, border: `1px solid ${C.borderSubtle}`, borderRadius: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16 }}>
            Trust & Reputation
          </div>
          <TrustScoreCard trust={trustScore} />
        </div>

        {/* ── Discovery ── */}
        <div style={{ padding: "24px 26px", background: C.surface, border: `1px solid ${C.borderSubtle}`, borderRadius: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16 }}>
            Visibility Score
          </div>
          <VisibilityCard {...visibility} />
        </div>

        {/* ── Profile Completion ── */}
        <div style={{ padding: "24px 26px", background: C.surface, border: `1px solid ${C.borderSubtle}`, borderRadius: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16 }}>
            Profile Completion
          </div>
          <CompletionCard pct={completion} creatorProfileId={creatorProfile.id} />
        </div>

        {/* ── Activity Feed ── */}
        <div style={{ padding: "24px 26px", background: C.surface, border: `1px solid ${C.borderSubtle}`, borderRadius: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16 }}>
            Recent Activity
          </div>
          <ActivityFeed items={activity} />
        </div>

        {/* ── Quick links ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            to="/creator-onboarding"
            className="inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-[12px] font-medium transition-all duration-150"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, color: C.textTertiary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.aiBlueBorder; (e.currentTarget as HTMLElement).style.color = C.aiBlue; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
          >
            Edit Profile <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link
            to={`/creators/${creatorProfile.id}` as "/"}
            className="inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-[12px] font-medium transition-all duration-150"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, color: C.textTertiary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.aiBlueBorder; (e.currentTarget as HTMLElement).style.color = C.aiBlue; }}
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
