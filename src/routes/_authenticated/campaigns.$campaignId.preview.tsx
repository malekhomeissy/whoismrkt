import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  ExternalLink, Globe, Instagram,
  MapPin, Calendar, Users, FileText,
  DollarSign, Gift, Percent, TrendingUp, Minus,
  ArrowLeft, Eye, Zap, Target, Clock,
  BarChart3, Building2, CheckCircle2, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Campaign, CompensationType } from "@/types/campaign";
import {
  formatBudget, compensationColor,
  COMPENSATION_LABELS, COMPENSATION_DESCRIPTIONS, ASSET_TYPE_LABELS,
} from "@/types/campaign";
import { CATEGORY_LABELS } from "@/types/creator";

export const Route = createFileRoute("/_authenticated/campaigns/$campaignId/preview")({
  head: () => ({ meta: [{ title: "Campaign Preview — MRKT" }] }),
  component: CampaignPreviewPage,
});

// ── Design tokens ─────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ── Helpers ───────────────────────────────────────────────────────────────────

function CompIcon({ type, size = 16 }: { type: CompensationType; size?: number }) {
  const s = { width: size, height: size };
  switch (type) {
    case "paid":          return <DollarSign style={s} />;
    case "gifted":        return <Gift style={s} />;
    case "affiliate":     return <Percent style={s} />;
    case "revenue_share": return <TrendingUp style={s} />;
    case "unpaid":        return <Minus style={s} />;
  }
}

function daysLeft(deadline: string | null): number {
  if (!deadline) return 9999;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000));
}

function deadlineChip(deadline: string | null) {
  if (!deadline) return null;
  const d = daysLeft(deadline);
  const date = new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (d === 0) return { text: `Closed · ${date}`,       color: "oklch(0.52 0.15 24)",  bg: "oklch(0.52 0.15 24 / 10%)",  border: "oklch(0.52 0.15 24 / 22%)" };
  if (d <= 3)  return { text: `${d}d left · ${date}`,   color: "oklch(0.52 0.15 24)",  bg: "oklch(0.68 0.15 25 / 10%)",  border: "oklch(0.68 0.15 25 / 22%)" };
  if (d <= 10) return { text: `${d} days · ${date}`,    color: C.amber,                bg: C.amberBg,                    border: C.amberBorder };
  return        { text: `Due ${date}`,                   color: C.accent,               bg: C.accentBg,                   border: C.accentBorder };
}

// ── Match analysis (computed from campaign requirements) ──────────────────────

function useMatchAnalysis(campaign: Campaign) {
  return useMemo(() => {
    const platforms = campaign.required_platforms?.length ?? 0;
    const niches    = campaign.required_niches?.length ?? 0;
    const followers = campaign.min_followers ?? 0;

    // Platform coverage — fewer required platforms = broader pool
    const platformScore = platforms === 0 ? 93 : platforms === 1 ? 89 : platforms <= 3 ? 82 : 74;

    // Niche alignment — fewer required niches = more creators match
    const nicheScore = niches === 0 ? 86 : niches <= 2 ? 79 : niches <= 4 ? 68 : 58;

    // Geographic reach — no country restriction = global pool
    const audienceScore = !campaign.required_country ? 91 : 70;

    // Follower threshold — lower bar = more creators available
    const followerScore = followers === 0 ? 92 : followers <= 2000 ? 87 : followers <= 10000 ? 72 : 55;

    const overall = Math.round(
      platformScore * 0.30 +
      nicheScore    * 0.30 +
      audienceScore * 0.20 +
      followerScore * 0.20
    );

    // AI insight
    const parts: string[] = [];
    if (platforms > 0) parts.push(campaign.required_platforms.slice(0, 2).join(" & ") + " creators");
    if (campaign.required_country) parts.push(`in ${campaign.required_country}`);
    if (followers > 0) parts.push(`${followers >= 1000 ? (followers / 1000).toFixed(0) + "K" : followers}+ followers`);
    const targetDesc = parts.length ? parts.join(", ") : "creators across all categories";

    const insight = overall >= 82
      ? `Strong appeal — this campaign targets ${targetDesc} with broad market availability and a healthy applicant pool.`
      : overall >= 68
      ? `Targeted campaign for ${targetDesc}. Expand criteria slightly to increase your applicant volume.`
      : `Highly specific — targets ${targetDesc}. Narrow requirements may limit applications. Review to optimize reach.`;

    return {
      platform: platformScore,
      niche:    nicheScore,
      audience: audienceScore,
      followers: followerScore,
      overall,
      insight,
    };
  }, [campaign]);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SideCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: "18px 20px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: C.textMuted, marginBottom: 14, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function MatchBar({ label, score, color = C.accent }: { label: string; score: number; color?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: C.textSecondary }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{score}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: "oklch(1 0 0 / 6%)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${score}%`,
          borderRadius: 99,
          background: color,
          transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
    </div>
  );
}

// ── Compensation sidebar card ────────────────────────────────────────────────

function CompensationCard({ campaign }: { campaign: Campaign }) {
  const colors = compensationColor(campaign.compensation_type);
  const isPaid = campaign.compensation_type === "paid";
  const budget = formatBudget(campaign);

  return (
    <SideCard style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isPaid ? 10 : 6 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: "oklch(1 0 0 / 8%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: colors.text,
        }}>
          <CompIcon type={campaign.compensation_type} size={16} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: colors.text, textTransform: "uppercase" }}>
            {COMPENSATION_LABELS[campaign.compensation_type]}
          </div>
          {isPaid && (
            <div style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, lineHeight: 1.1, marginTop: 2 }}>
              {budget}
            </div>
          )}
        </div>
      </div>
      <p style={{ fontSize: 11.5, color: "oklch(1 0 0 / 40%)", lineHeight: 1.5, margin: 0 }}>
        {COMPENSATION_DESCRIPTIONS[campaign.compensation_type]}
      </p>
    </SideCard>
  );
}

// ── Match Analysis sidebar card ───────────────────────────────────────────────

function MatchAnalysisCard({ campaign }: { campaign: Campaign }) {
  const m = useMatchAnalysis(campaign);

  return (
    <SideCard>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: C.accentBg,
          border: `1px solid ${C.accentBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Zap style={{ width: 13, height: 13, color: C.accent }} />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: C.textPrimary }}>MRKT Match Analysis</span>
      </div>

      {/* Overall score */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "oklch(1 0 0 / 4%)",
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.accent, lineHeight: 1 }}>
          {m.overall}
          <span style={{ fontSize: 16, fontWeight: 600, color: "oklch(1 0 0 / 60%)" }}>%</span>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>Overall Match Score</div>
          <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 2 }}>
            {m.overall >= 82 ? "Strong targeting" : m.overall >= 68 ? "Moderate targeting" : "Narrow targeting"}
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <MatchBar label="Platform Coverage" score={m.platform} />
      <MatchBar label="Niche Alignment"   score={m.niche}     />
      <MatchBar label="Audience Reach"    score={m.audience}  />
      <MatchBar label="Follower Pool"     score={m.followers} />

      {/* AI insight */}
      <div style={{
        marginTop: 14,
        padding: "10px 12px",
        background: "oklch(1 0 0 / 3%)",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
      }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", color: C.textMuted, marginBottom: 5, textTransform: "uppercase" }}>
          AI Insight
        </div>
        <p style={{ fontSize: 11.5, color: C.textTertiary, lineHeight: 1.55, margin: 0 }}>
          {m.insight}
        </p>
      </div>
    </SideCard>
  );
}

// ── Campaign stats sidebar card ───────────────────────────────────────────────

function CampaignStatsCard({ campaign, appCount }: { campaign: Campaign; appCount: number }) {
  const dl = deadlineChip(campaign.deadline);
  const days = daysLeft(campaign.deadline);

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    active:    { label: "Active",    color: C.green,     bg: C.greenBg    },
    paused:    { label: "Paused",    color: C.amber,     bg: C.amberBg    },
    draft:     { label: "Draft",     color: C.textMuted, bg: "oklch(1 0 0 / 5%)" },
    closed:    { label: "Closed",    color: C.textMuted, bg: "oklch(1 0 0 / 5%)" },
    completed: { label: "Completed", color: C.green,     bg: C.greenBg    },
  };
  const st = statusCfg[campaign.status] ?? statusCfg.draft;

  const rows = [
    {
      icon: <Users style={{ width: 13, height: 13 }} />,
      label: "Applications",
      value: String(appCount),
      valueColor: appCount > 0 ? C.accent : C.textTertiary,
    },
    {
      icon: <Target style={{ width: 13, height: 13 }} />,
      label: "Status",
      value: st.label,
      valueColor: st.color,
      pill: true,
      pillBg: st.bg,
    },
    ...(campaign.deadline ? [{
      icon: <Clock style={{ width: 13, height: 13 }} />,
      label: "Deadline",
      value: dl?.text ?? "—",
      valueColor: dl?.color ?? C.textTertiary,
    }] : []),
    ...(campaign.min_followers ? [{
      icon: <BarChart3 style={{ width: 13, height: 13 }} />,
      label: "Min. Followers",
      value: campaign.min_followers >= 1000
        ? `${(campaign.min_followers / 1000).toFixed(0)}K+`
        : `${campaign.min_followers}+`,
      valueColor: C.textSecondary,
    }] : []),
    {
      icon: <Calendar style={{ width: 13, height: 13 }} />,
      label: "Posted",
      value: new Date(campaign.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      valueColor: C.textMuted,
    },
  ];

  return (
    <SideCard>
      <CardLabel>Campaign Stats</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {rows.map((row, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.textMuted }}>
              {row.icon}
              <span style={{ fontSize: 12, color: C.textTertiary }}>{row.label}</span>
            </div>
            {row.pill ? (
              <span style={{
                fontSize: 11, fontWeight: 600, color: row.valueColor,
                background: (row as typeof rows[1]).pillBg,
                padding: "2px 8px", borderRadius: 5,
              }}>
                {row.value}
              </span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 600, color: row.valueColor }}>{row.value}</span>
            )}
          </div>
        ))}
      </div>
    </SideCard>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function CampaignPreviewPage() {
  const { campaignId } = Route.useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [appCount, setAppCount]  = useState(0);
  const [loading, setLoading]    = useState(true);
  const [notFound, setNotFound]  = useState(false);

  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ data, error }, { count }] = await Promise.all([
        (supabase as any)
          .from("campaigns")
          .select("*, deliverables:campaign_deliverables(*), assets:campaign_assets(*)")
          .eq("id", campaignId)
          .single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("campaign_applications")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaignId),
      ]);

      if (error || !data) { setNotFound(true); }
      else {
        setCampaign(data as Campaign);
        setAppCount(count ?? 0);
      }
      setLoading(false);
    }
    load();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: C.bg }}>
        <div className="h-5 w-5 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 12%)" }} />
      </div>
    );
  }

  if (notFound || !campaign) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: C.bg }}>
        <AlertCircle style={{ width: 36, height: 36, color: C.textMuted }} />
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: C.textPrimary, marginBottom: 6 }}>
            Unable to load campaign preview.
          </h2>
          <p style={{ fontSize: 13, color: C.textTertiary }}>This campaign doesn't exist or couldn't be loaded.</p>
        </div>
        <button
          onClick={() => navigate({ to: "/campaigns" as "/" })}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "9px 18px", borderRadius: 10,
            background: "oklch(1 0 0 / 7%)", border: `1px solid ${C.border}`,
            color: C.textSecondary, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to Campaigns
        </button>
      </div>
    );
  }

  const deliverables = (campaign.deliverables ?? []).sort((a, b) => a.display_order - b.display_order);
  const assets       = (campaign.assets ?? []).sort((a, b) => a.display_order - b.display_order);
  const colors       = compensationColor(campaign.compensation_type);
  const dl           = deadlineChip(campaign.deadline);
  const brandInitial = (campaign.business_name ?? campaign.title ?? "?")[0].toUpperCase();

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.bg }}>

      {/* ── Preview banner ───────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        background: "oklch(0.12 0 0)",
        borderBottom: `1px solid ${C.border}`,
        padding: "9px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={() => navigate({ to: `/campaigns/${campaignId}` as "/" })}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: C.textTertiary, fontSize: 13, fontFamily: "inherit", padding: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to campaign
        </button>

        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: C.borderFaint,
          border: `1px solid ${C.borderSubtle}`,
          borderRadius: 7, padding: "4px 11px",
        }}>
          <Eye style={{ width: 12, height: 12, color: C.chrome }} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: C.chrome, letterSpacing: "0.03em" }}>
            Preview Mode
          </span>
          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 2 }}>
            — creator view
          </span>
        </div>

        <div style={{ width: 130 }} />
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{
          position: "relative",
          background: `
            radial-gradient(ellipse 90% 100% at 10% 50%, ${colors.text}06 0%, transparent 65%),
            radial-gradient(ellipse 70% 80% at 90% 0%, oklch(0.14 0 0) 0%, transparent 70%),
            oklch(0.06 0 0)
          `,
          borderBottom: `1px solid ${C.border}`,
          padding: "36px 48px 32px",
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "flex-start" }}>

              {/* Left — identity + title */}
              <div>
                {/* Brand identity */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  {/* Brand initial avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: `linear-gradient(135deg, ${colors.text}22 0%, ${colors.text}0a 100%)`,
                    border: `1px solid ${colors.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, fontWeight: 800, color: colors.text,
                    flexShrink: 0,
                  }}>
                    {brandInitial}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary }}>
                      {campaign.business_name}
                    </div>
                    {campaign.business_industry && (
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                        {campaign.business_industry}
                      </div>
                    )}
                  </div>
                  {/* Status badge */}
                  <div style={{
                    marginLeft: "auto",
                    fontSize: 11, fontWeight: 600,
                    padding: "3px 10px", borderRadius: 6,
                    background: campaign.status === "active" ? C.accentBg : "oklch(1 0 0 / 5%)",
                    border: `1px solid ${campaign.status === "active" ? C.accentBorder : C.border}`,
                    color: campaign.status === "active" ? C.accent : C.textMuted,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                  }}>
                    {campaign.status}
                  </div>
                </div>

                {/* Campaign title */}
                <h1 style={{
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: 800,
                  color: C.textPrimary,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.08,
                  margin: "0 0 10px",
                }}>
                  {campaign.title}
                </h1>

                {/* Description preview */}
                {(campaign.product_service || campaign.campaign_goal) && (
                  <p style={{ fontSize: 14, color: C.textSecondary, margin: "0 0 20px", lineHeight: 1.5, maxWidth: 540 }}>
                    {campaign.product_service ?? campaign.campaign_goal}
                  </p>
                )}

                {/* Metadata pills row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                  {/* Compensation pill */}
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600,
                    color: colors.text,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 7, padding: "5px 10px",
                  }}>
                    <CompIcon type={campaign.compensation_type} size={12} />
                    {COMPENSATION_LABELS[campaign.compensation_type]}
                    {campaign.compensation_type === "paid" && ` · ${formatBudget(campaign)}`}
                  </span>

                  {/* Platform pills */}
                  {campaign.required_platforms.map(p => (
                    <span key={p} style={{
                      fontSize: 12, fontWeight: 500,
                      color: C.textSecondary,
                      background: "oklch(1 0 0 / 5%)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 7, padding: "5px 10px",
                    }}>
                      {p}
                    </span>
                  ))}

                  {/* Location */}
                  {campaign.business_location && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 12, color: C.textTertiary,
                      background: "oklch(1 0 0 / 4%)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 7, padding: "5px 10px",
                    }}>
                      <MapPin style={{ width: 11, height: 11 }} />
                      {campaign.business_location}
                    </span>
                  )}

                  {/* Deadline */}
                  {dl && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 12, fontWeight: 500,
                      color: dl.color, background: dl.bg, border: `1px solid ${dl.border}`,
                      borderRadius: 7, padding: "5px 10px",
                    }}>
                      <Clock style={{ width: 11, height: 11 }} />
                      {dl.text}
                    </span>
                  )}

                  {/* Follower min */}
                  {campaign.min_followers && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 12, color: C.textTertiary,
                      background: "oklch(1 0 0 / 4%)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 7, padding: "5px 10px",
                    }}>
                      <Users style={{ width: 11, height: 11 }} />
                      {campaign.min_followers >= 1000
                        ? `${(campaign.min_followers / 1000).toFixed(0)}K+`
                        : `${campaign.min_followers}+`} followers
                    </span>
                  )}
                </div>
              </div>

              {/* Right — quick stats panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 160, alignItems: "flex-end" }}>
                {/* Application count */}
                <div style={{
                  background: "oklch(1 0 0 / 4%)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  textAlign: "center",
                  minWidth: 130,
                }}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: appCount > 0 ? C.textPrimary : C.textMuted, lineHeight: 1 }}>
                    {appCount}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, fontWeight: 500 }}>
                    {appCount === 1 ? "Application" : "Applications"}
                  </div>
                </div>

                {/* Preview mode — apply disabled */}
                <div style={{
                  width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: C.surface,
                  border: `1px solid ${C.borderFaint}`,
                  color: C.textMuted,
                  fontSize: 12.5, fontWeight: 500,
                  cursor: "not-allowed",
                  userSelect: "none",
                  minWidth: 130,
                }}>
                  <Eye style={{ width: 13, height: 13 }} />
                  Apply (Preview)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Two-column content ────────────────────────────────────────── */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 48px 80px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 32, alignItems: "flex-start" }}>

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* About */}
            <section style={{ paddingBottom: 32, borderBottom: `1px solid ${C.border}`, marginBottom: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 12, letterSpacing: "-0.02em" }}>
                About this campaign
              </h2>
              <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>
                {campaign.description}
              </p>
              {campaign.campaign_goal && (
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, letterSpacing: "0.2em",
                    color: C.textMuted, textTransform: "uppercase",
                    marginTop: 2, flexShrink: 0,
                  }}>Goal</span>
                  <span style={{ fontSize: 13.5, color: C.textSecondary }}>{campaign.campaign_goal}</span>
                </div>
              )}
            </section>

            {/* Deliverables */}
            {deliverables.length > 0 && (
              <section style={{ paddingBottom: 32, borderBottom: `1px solid ${C.border}`, marginBottom: 32 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 14, letterSpacing: "-0.02em" }}>
                  Deliverables
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {deliverables.map((del, i) => (
                    <div key={del.id ?? i} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: "12px 16px",
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: "oklch(1 0 0 / 6%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: C.textTertiary, flexShrink: 0,
                      }}>
                        {del.quantity}×
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: C.textPrimary }}>{del.content_type}</div>
                        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>
                          {del.platform}{del.notes && ` · ${del.notes}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Requirements */}
            <section style={{ paddingBottom: 32, borderBottom: assets.length > 0 ? `1px solid ${C.border}` : "none", marginBottom: assets.length > 0 ? 32 : 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 14, letterSpacing: "-0.02em" }}>
                Requirements
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Min. followers",  value: campaign.min_followers ? `${campaign.min_followers.toLocaleString()}+` : null },
                  { label: "Country",         value: campaign.required_country },
                  { label: "Language",        value: campaign.required_language },
                  { label: "Deadline",        value: campaign.deadline ? new Date(campaign.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "12px 14px",
                  }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.2em", color: C.textMuted, marginBottom: 4, textTransform: "uppercase" }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: C.textSecondary }}>{r.value}</div>
                  </div>
                ))}

                {campaign.required_niches.length > 0 && (
                  <div style={{
                    gridColumn: "1 / -1",
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "12px 14px",
                  }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.2em", color: C.textMuted, marginBottom: 8, textTransform: "uppercase" }}>
                      Creator niches
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {campaign.required_niches.map(n => (
                        <span key={n} style={{
                          fontSize: 11.5, color: C.textSecondary,
                          background: "oklch(1 0 0 / 5%)",
                          border: `1px solid ${C.border}`,
                          borderRadius: 6, padding: "3px 9px",
                        }}>
                          {CATEGORY_LABELS[n as keyof typeof CATEGORY_LABELS] ?? n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Brand assets */}
            {assets.length > 0 && (
              <section>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 14, letterSpacing: "-0.02em" }}>
                  Brand assets
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {assets.map((asset, i) => (
                    <a
                      key={asset.id ?? i}
                      href={asset.url} target="_blank" rel="noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        background: C.surface, border: `1px solid ${C.border}`,
                        borderRadius: 10, padding: "12px 14px",
                        textDecoration: "none", transition: "background 120ms ease",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.raised; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: "oklch(1 0 0 / 6%)", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <FileText style={{ width: 15, height: 15, color: C.textMuted }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {asset.name || ASSET_TYPE_LABELS[asset.asset_type]}
                        </div>
                        <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 1 }}>
                          {ASSET_TYPE_LABELS[asset.asset_type]}
                        </div>
                      </div>
                      <ExternalLink style={{ width: 12, height: 12, color: C.textMuted, flexShrink: 0 }} />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Business links */}
            {(campaign.business_website || campaign.business_instagram || campaign.business_tiktok) && (
              <section style={{ marginTop: 32, paddingTop: 32, borderTop: `1px solid ${C.border}` }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 12, letterSpacing: "-0.02em" }}>
                  Find them online
                </h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {campaign.business_website && (
                    <a href={campaign.business_website} target="_blank" rel="noreferrer" style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 12.5, color: C.textSecondary,
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: "7px 12px", textDecoration: "none",
                    }}>
                      <Globe style={{ width: 13, height: 13 }} /> Website
                      <ExternalLink style={{ width: 10, height: 10, color: C.textMuted }} />
                    </a>
                  )}
                  {campaign.business_instagram && (
                    <a href={`https://instagram.com/${campaign.business_instagram}`} target="_blank" rel="noreferrer" style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 12.5, color: C.textSecondary,
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: "7px 12px", textDecoration: "none",
                    }}>
                      <Instagram style={{ width: 13, height: 13 }} /> @{campaign.business_instagram}
                    </a>
                  )}
                  {campaign.business_tiktok && (
                    <a href={`https://tiktok.com/@${campaign.business_tiktok}`} target="_blank" rel="noreferrer" style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 12.5, color: C.textSecondary,
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: "7px 12px", textDecoration: "none",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>TK</span>
                      @{campaign.business_tiktok}
                    </a>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* ── Right sidebar (sticky) ─────────────────────────────────── */}
          <div style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <CompensationCard campaign={campaign} />
            <MatchAnalysisCard campaign={campaign} />
            <CampaignStatsCard campaign={campaign} appCount={appCount} />
          </div>
        </div>

      </div>
    </div>
  );
}
