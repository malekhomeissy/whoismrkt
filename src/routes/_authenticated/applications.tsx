import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Clock, CheckCircle2, Star, XCircle, Zap,
  Calendar, ArrowUpRight, DollarSign, Layers, Upload,
} from "lucide-react";
import { ReviewModal } from "@/components/app/ReviewModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import type { CompensationType } from "@/types/campaign";
import { formatBudget } from "@/types/campaign";
import { computeMatchScore, type CreatorInput } from "@/lib/matchScore";
import { MatchScoreBadge } from "@/components/ui/MatchScoreBadge";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: [{ title: "My Applications — MRKT" }] }),
  component: ApplicationsPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Status system ────────────────────────────────────────────────────────────

type AppStatus = "pending" | "reviewing" | "shortlisted" | "accepted" | "rejected";
type PipelineTab = "all" | "active" | "approved" | "declined";

const STATUS_CONFIG: Record<AppStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  pending:     { label: "Submitted",    color: "oklch(0.70 0.08 68)",  bg: "oklch(0.78 0.14 76 / 12%)",  border: "oklch(0.78 0.14 76 / 26%)",  icon: Clock        },
  reviewing:   { label: "Under Review", color: "oklch(0.70 0.08 68)",  bg: "oklch(0.78 0.14 76 / 12%)",  border: "oklch(0.78 0.14 76 / 26%)",  icon: Clock        },
  shortlisted: { label: "Shortlisted",  color: "oklch(0.72 0.10 224)", bg: "oklch(0.62 0.10 224 / 12%)", border: "oklch(0.62 0.10 224 / 26%)", icon: Star         },
  accepted:    { label: "Approved",     color: "oklch(0.62 0.12 158)", bg: "oklch(0.72 0.18 152 / 14%)", border: "oklch(0.72 0.18 152 / 30%)", icon: CheckCircle2 },
  rejected:    { label: "Declined",     color: "oklch(0.52 0.15 24)",  bg: "oklch(0.52 0.15 24 / 10%)",  border: "oklch(0.52 0.15 24 / 24%)",  icon: XCircle      },
};

function StatusBadge({ status }: { status: AppStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApplicationRow {
  id: string;
  campaign_id: string;
  campaign_title: string;
  campaign_brand: string;
  status: AppStatus;
  cover_note: string | null;
  created_at: string;
  // Enriched from campaigns join
  compensation_type?: CompensationType;
  compensation_amount_fixed?: number | null;
  compensation_budget_min?: number | null;
  compensation_budget_max?: number | null;
  required_platforms?: string[];
  required_niches?: string[];
  required_country?: string | null;
  required_language?: string | null;
  min_followers?: number | null;
  business_industry?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deliverables?: any[];
  campaign_owner_id?: string | null;
  matchScore: number;
}

// ─── Application card ─────────────────────────────────────────────────────────

function AppCard({
  app,
  hasReviewed,
  onReview,
}: {
  app: ApplicationRow;
  hasReviewed: boolean;
  onReview: () => void;
}) {
  const isApproved  = app.status === "accepted";
  const isDeclined  = app.status === "rejected";

  const budget = (() => {
    if (!app.compensation_type) return null;
    if (app.compensation_type === "gifted") return "Gifted";
    if (app.compensation_type !== "paid") return null;
    if (app.compensation_amount_fixed) return `$${app.compensation_amount_fixed.toLocaleString()}`;
    if (app.compensation_budget_max)   return `Up to $${app.compensation_budget_max.toLocaleString()}`;
    if (app.compensation_budget_min)   return `From $${app.compensation_budget_min.toLocaleString()}`;
    return null;
  })();

  const platforms = app.required_platforms?.slice(0, 3) ?? [];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: isApproved ? "oklch(1 0 0 / 4%)" : isDeclined ? "transparent" : C.surface,
        border: `1px solid ${isApproved ? "oklch(1 0 0 / 20%)" : isDeclined ? "oklch(1 0 0 / 5%)" : C.border}`,
        opacity: isDeclined ? 0.65 : 1,
      }}
    >
      {/* Approved highlight bar */}
      {isApproved && (
        <div
          className="px-5 py-2.5 flex items-center gap-2 text-[11px] font-semibold"
          style={{ background: "oklch(1 0 0 / 8%)", borderBottom: `1px solid oklch(1 0 0 / 18%)`, color: C.green }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          This brand has selected you for collaboration
        </div>
      )}

      <div className="p-5">
        {/* Header: brand + status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.24em] font-medium mb-1" style={{ color: C.faint }}>
              {app.campaign_brand}
            </div>
            <h3
              className="font-display text-[1.05rem] font-bold leading-snug tracking-tight truncate"
              style={{ color: isDeclined ? C.muted : C.text }}
            >
              {app.campaign_title}
            </h3>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] mb-3.5" style={{ color: C.faint }}>
          <span className="flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" />
            Applied {new Date(app.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {budget && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-2.5 w-2.5" />
              {budget}
            </span>
          )}
          {platforms.length > 0 && (
            <span className="flex items-center gap-1">
              <Layers className="h-2.5 w-2.5" />
              {platforms.join(" · ")}
            </span>
          )}
          {app.matchScore > 0 && (
            <MatchScoreBadge score={app.matchScore} showLabel />
          )}
        </div>

        {/* Cover note preview */}
        {app.cover_note && !isDeclined && (
          <p className="text-[12px] leading-relaxed line-clamp-2 mb-3.5 italic" style={{ color: C.muted }}>
            "{app.cover_note}"
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
          <Link
            to={`/campaigns/${app.campaign_id}` as "/"}
            className="text-[12px] flex items-center gap-1 transition-opacity"
            style={{ color: C.faint }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.faint; }}
          >
            View campaign <ArrowUpRight className="h-3 w-3" />
          </Link>

          {isApproved && (
            <Link
              to={`/deliverables/${app.id}` as "/"}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium rounded-full px-3 h-7 transition-all"
              style={{ background: "oklch(0.82 0.005 0 / 10%)", border: "1px solid oklch(0.82 0.005 0 / 22%)", color: C.chrome }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.82 0.005 0 / 16%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.82 0.005 0 / 10%)"; }}
            >
              <Upload className="h-3 w-3" /> Deliverables
            </Link>
          )}
          {isApproved && app.campaign_owner_id && (
            hasReviewed ? (
              <span className="text-[11px] font-medium" style={{ color: C.amber }}>★ Reviewed</span>
            ) : (
              <button
                onClick={onReview}
                className="text-[11px] font-medium transition-colors"
                style={{ color: C.amber, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.75"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              >
                ★ Rate this brand
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline tab bar ─────────────────────────────────────────────────────────

function TabBar({
  active, onChange, counts,
}: {
  active: PipelineTab;
  onChange: (t: PipelineTab) => void;
  counts: Record<PipelineTab, number>;
}) {
  const tabs: { id: PipelineTab; label: string }[] = [
    { id: "all",      label: "All"       },
    { id: "active",   label: "Active"    },
    { id: "approved", label: "Approved"  },
    { id: "declined", label: "Declined"  },
  ];

  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
      {tabs.map(({ id, label }) => {
        const isActive = active === id;
        const count    = counts[id];
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 16px", borderRadius: 10,
              border: `1px solid ${isActive ? C.borderNormal : "transparent"}`,
              background: isActive ? C.surface : "transparent",
              color: isActive ? C.textPrimary : C.textTertiary,
              fontSize: 13, fontWeight: isActive ? 600 : 500,
              cursor: "pointer", transition: "all 130ms ease",
            }}
            onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}}
            onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}}
          >
            {label}
            {count > 0 && (
              <span
                style={{
                  borderRadius: 99, fontSize: 10, fontWeight: 700,
                  padding: "1px 6px",
                  background: id === "approved" ? C.greenMuted : id === "declined" ? C.redMuted : isActive ? C.accentMuted : "oklch(1 0 0 / 6%)",
                  color: id === "approved" ? C.green : id === "declined" ? C.red : isActive ? C.aiBlue : C.textMuted,
                  border: `1px solid ${id === "approved" ? C.greenBorder : id === "declined" ? C.redBorder : isActive ? C.aiBlueBorder : C.borderSubtle}`,
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3 py-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="space-y-2">
              <div className="skeleton" style={{ height: 10, width: 80, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 20, width: 240, borderRadius: 6 }} />
            </div>
            <div className="skeleton" style={{ height: 26, width: 100, borderRadius: 99 }} />
          </div>
          <div className="flex gap-4 mb-3">
            {[90, 70, 80].map((w, j) => (
              <div key={j} className="skeleton" style={{ height: 11, width: w, borderRadius: 4 }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: 11, width: "70%", borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ApplicationsPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [apps,             setApps]             = useState<ApplicationRow[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [tab,              setTab]              = useState<PipelineTab>("all");
  const [reviewedIds,      setReviewedIds]      = useState<Set<string>>(new Set());
  const [reviewTarget,     setReviewTarget]     = useState<ApplicationRow | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        // Role guard
        const { data: profile } = await supabase
          .from("profiles")
          .select("account_type,onboarding_path")
          .eq("id", user.id)
          .single();

        const isBusiness =
          profile?.account_type === "brand" || profile?.account_type === "business" ||
          profile?.onboarding_path === "business_creator" || profile?.onboarding_path === "business_marketing";

        if (isBusiness) { navigate({ to: "/pipeline" }); return; }

        // Parallel: applications + creator profile
        const [appsRes, cpRes] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from("campaign_applications")
            .select("id,campaign_id,campaign_title,campaign_brand,status,cover_note,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from("creator_profiles")
            .select("platforms,niche,categories,audience_location,location,location_city,location_country,follower_count,primary_language,accepts_paid,accepts_gifted,accepts_affiliate,preferred_content_types")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        const rawApps: Omit<ApplicationRow, "matchScore">[] = appsRes.data ?? [];
        const creatorProfile: CreatorInput | null = cpRes.data ?? null;

        if (rawApps.length === 0) {
          setApps([]);
          setLoading(false);
          return;
        }

        // Fetch campaign details for enrichment
        const campaignIds = [...new Set(rawApps.map((a) => a.campaign_id))];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: campaigns } = await (supabase as any)
          .from("campaigns")
          .select("id,compensation_type,compensation_amount_fixed,compensation_budget_min,compensation_budget_max,required_platforms,required_niches,required_country,required_language,min_followers,business_industry,user_id,deliverables:campaign_deliverables(*)")
          .in("id", campaignIds);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const campaignMap: Record<string, any> = {};
        for (const c of (campaigns ?? [])) campaignMap[c.id] = c;

        // Fetch reviews for accepted applications
        const acceptedCampaignIds = rawApps
          .filter((a) => a.status === "accepted")
          .map((a) => a.campaign_id);

        let reviewed = new Set<string>();
        if (acceptedCampaignIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: reviews } = await (supabase as any)
            .from("reviews")
            .select("campaign_id")
            .eq("reviewer_id", user.id)
            .in("campaign_id", acceptedCampaignIds);
          reviewed = new Set((reviews ?? []).map((r: { campaign_id: string }) => r.campaign_id));
        }
        setReviewedIds(reviewed);

        // Enrich applications
        const enriched: ApplicationRow[] = rawApps.map((a) => {
          const c = campaignMap[a.campaign_id];
          let matchScore = 0;
          if (creatorProfile && c) {
            matchScore = computeMatchScore(creatorProfile, {
              required_platforms: c.required_platforms ?? [],
              required_niches:    c.required_niches ?? [],
              business_industry:  c.business_industry,
              required_country:   c.required_country,
              required_language:  c.required_language,
              min_followers:      c.min_followers,
              compensation_type:  c.compensation_type,
              deliverables:       c.deliverables ?? [],
            }).total;
          }
          return {
            ...a,
            compensation_type:        c?.compensation_type,
            compensation_amount_fixed: c?.compensation_amount_fixed,
            compensation_budget_min:  c?.compensation_budget_min,
            compensation_budget_max:  c?.compensation_budget_max,
            required_platforms:       c?.required_platforms,
            required_niches:          c?.required_niches,
            required_country:         c?.required_country,
            required_language:        c?.required_language,
            min_followers:            c?.min_followers,
            business_industry:        c?.business_industry,
            deliverables:             c?.deliverables,
            campaign_owner_id:        c?.user_id ?? null,
            matchScore,
          };
        });

        setApps(enriched);
      } catch (err) {
        toast.error("Could not load applications.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  // ── Tab filtering ────────────────────────────────────────────────────────────
  const ACTIVE_STATUSES  = new Set<AppStatus>(["pending", "reviewing", "shortlisted"]);
  const APPROVED_STATUSES = new Set<AppStatus>(["accepted"]);
  const DECLINED_STATUSES = new Set<AppStatus>(["rejected"]);

  const filtered = useMemo(() => {
    switch (tab) {
      case "active":   return apps.filter((a) => ACTIVE_STATUSES.has(a.status));
      case "approved": return apps.filter((a) => APPROVED_STATUSES.has(a.status));
      case "declined": return apps.filter((a) => DECLINED_STATUSES.has(a.status));
      default:         return apps;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, tab]);

  // Within "active" tab, sort by: shortlisted > reviewing > pending
  const sorted = useMemo(() => {
    if (tab !== "active") return filtered;
    const order: Record<AppStatus, number> = { shortlisted: 0, reviewing: 1, pending: 2, accepted: 3, rejected: 4 };
    return [...filtered].sort((a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99));
  }, [filtered, tab]);

  const counts: Record<PipelineTab, number> = useMemo(() => ({
    all:      apps.length,
    active:   apps.filter((a) => ACTIVE_STATUSES.has(a.status)).length,
    approved: apps.filter((a) => APPROVED_STATUSES.has(a.status)).length,
    declined: apps.filter((a) => DECLINED_STATUSES.has(a.status)).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [apps]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.canvas, color: C.textPrimary, overflowY: "auto" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 36px 80px" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: C.accentMuted, border: `1px solid ${C.aiBlueBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Upload size={17} style={{ color: C.aiBlue }} />
            </div>
            <h1 style={{
              fontSize: "clamp(1.8rem, 2.5vw, 2.25rem)", fontWeight: 700,
              color: C.textPrimary, letterSpacing: "-0.04em", lineHeight: 1.05,
              fontFamily: "'Inter Tight', 'Inter', sans-serif",
            }}>My Applications</h1>
          </div>
          <p style={{ fontSize: 14, color: C.textTertiary }}>
            Track every campaign you've applied to and follow its status.{" "}
            <Link to="/contracts" style={{ color: C.textSecondary, textDecoration: "none" }}>
              View contracts →
            </Link>
          </p>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : apps.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center mb-5"
              style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.border}` }}
            >
              <Zap className="h-6 w-6" style={{ color: C.faint }} />
            </div>
            <p className="text-[1rem] font-semibold mb-2" style={{ color: C.muted }}>
              No applications yet.
            </p>
            <p className="text-[13px] mb-6 max-w-xs" style={{ color: C.faint }}>
              Browse open campaigns and hit Apply. Once you do, your applications will appear here with live status updates.
            </p>
            <Link
              to="/opportunities"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all"
              style={{ background: "oklch(1 0 0 / 8%)", border: `1px solid ${C.border}`, color: C.text }}
            >
              Browse opportunities <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <>
            {/* Pipeline tabs */}
            <TabBar active={tab} onChange={setTab} counts={counts} />

            {/* Cards */}
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[0.9375rem]" style={{ color: C.muted }}>
                  {tab === "active" && "No active applications."}
                  {tab === "approved" && "No approved applications yet."}
                  {tab === "declined" && "No declined applications."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    hasReviewed={reviewedIds.has(app.campaign_id)}
                    onReview={() => setReviewTarget(app)}
                  />
                ))}
              </div>
            )}

            {/* Hint: declined shown at bottom of "All" tab */}
            {tab === "all" && counts.declined > 0 && counts.active + counts.approved > 0 && (
              <p className="text-center text-[11px] mt-6" style={{ color: C.faint }}>
                {counts.declined} declined application{counts.declined === 1 ? "" : "s"} shown above
              </p>
            )}
          </>
        )}

      </div>

      {/* Review modal */}
      {reviewTarget && reviewTarget.campaign_owner_id && (
        <ReviewModal
          open={true}
          onClose={() => setReviewTarget(null)}
          type="creator_reviews_business"
          campaignId={reviewTarget.campaign_id}
          reviewedUserId={reviewTarget.campaign_owner_id}
          reviewedName={reviewTarget.campaign_brand}
          reviewerId={user!.id}
          onSuccess={() => {
            setReviewedIds((prev) => new Set([...prev, reviewTarget.campaign_id]));
            setReviewTarget(null);
            toast.success("Review submitted!");
          }}
        />
      )}
    </div>
  );
}
