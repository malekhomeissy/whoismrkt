import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowUpRight, ExternalLink, Globe, Instagram,
  Youtube, MapPin, Calendar, Users, FileText,
  DollarSign, Gift, Percent, TrendingUp, Minus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import type { Campaign, CompensationType } from "@/types/campaign";
import { formatBudget, compensationColor, COMPENSATION_LABELS, COMPENSATION_DESCRIPTIONS, ASSET_TYPE_LABELS } from "@/types/campaign";
import { CATEGORY_LABELS } from "@/types/creator";

export const Route = createFileRoute("/campaigns/$campaignId")({
  head: () => ({ meta: [{ title: "Campaign — MRKT Connect" }] }),
  component: CampaignPage,
});

// ─────────────────────────────────────────────────────────────
// Compensation icon
// ─────────────────────────────────────────────────────────────

function CompIcon({ type, size = 20 }: { type: CompensationType; size?: number }) {
  const props = { style: { width: size, height: size } };
  switch (type) {
    case "paid":          return <DollarSign {...props} />;
    case "gifted":        return <Gift {...props} />;
    case "affiliate":     return <Percent {...props} />;
    case "revenue_share": return <TrendingUp {...props} />;
    case "unpaid":        return <Minus {...props} />;
  }
}

// ─────────────────────────────────────────────────────────────
// Compensation badge — the most visible element on the page
// ─────────────────────────────────────────────────────────────

function CompensationBadge({ campaign }: { campaign: Campaign }) {
  const colors = compensationColor(campaign.compensation_type);
  const isPaid = campaign.compensation_type === "paid";
  const budget = formatBudget(campaign);

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="h-8 w-8 rounded-xl flex items-center justify-center"
          style={{ background: colors.bg, color: colors.text }}
        >
          <CompIcon type={campaign.compensation_type} size={16} />
        </div>
        <span
          className="text-[11px] font-bold uppercase tracking-[0.24em]"
          style={{ color: colors.text }}
        >
          {COMPENSATION_LABELS[campaign.compensation_type]}
        </span>
      </div>

      {isPaid && (
        <div
          className="font-display text-3xl font-bold tracking-tight mt-1"
          style={{ color: "oklch(1 0 0 / 88%)" }}
        >
          {budget}
        </div>
      )}

      <p
        className="text-[12px] leading-relaxed mt-2"
        style={{ color: "oklch(1 0 0 / 42%)" }}
      >
        {COMPENSATION_DESCRIPTIONS[campaign.compensation_type]}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

function CampaignPage() {
  const { campaignId } = Route.useParams();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("campaigns")
        .select("*, deliverables:campaign_deliverables(*), assets:campaign_assets(*)")
        .eq("id", campaignId)
        .single();

      if (error || !data) { setNotFound(true); }
      else { setCampaign(data as Campaign); }
      setLoading(false);
    }
    load();
  }, [campaignId]);

  async function handleApply() {
    if (!user) { window.location.href = "/creator-onboarding"; return; }
    setApplying(true);
    try {
      // Check if creator profile exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("creator_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        window.location.href = "/creator-onboarding";
        return;
      }

      // Submit application
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("campaign_applications")
        .insert({
          creator_profile_id: profile.id,
          campaign_id: campaignId,
          campaign_brand: campaign?.business_name ?? "",
          campaign_title: campaign?.title ?? "",
          status: "pending",
        });

      if (!error) setApplied(true);
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 12%)" }} />
      </div>
    );
  }

  if (notFound || !campaign) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 text-center">
        <div>
          <div className="font-display text-6xl font-bold tracking-tight mb-4" style={{ color: "oklch(1 0 0 / 20%)" }}>404</div>
          <h2 className="font-display text-xl font-semibold mb-3">Campaign not found</h2>
          <p className="text-sm mb-8" style={{ color: "oklch(1 0 0 / 40%)" }}>
            This campaign doesn't exist or has been closed.
          </p>
          <Link to="/connect" className="btn-primary inline-flex items-center gap-2 rounded-full px-7 h-10 text-sm">
            Browse campaigns <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const deliverables = (campaign.deliverables ?? []).sort((a, b) => a.display_order - b.display_order);
  const assets = (campaign.assets ?? []).sort((a, b) => a.display_order - b.display_order);
  const colors = compensationColor(campaign.compensation_type);
  const isOwner = user?.id === campaign.user_id;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-12 px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(ellipse 85% 55% at 50% -5%, oklch(0.14 0 0) 0%, oklch(0 0 0) 58%)",
          }}
        />

        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] mb-8" style={{ color: "oklch(1 0 0 / 30%)" }}>
            <Link to="/connect" className="hover:text-foreground/60 transition-colors duration-150">MRKT Connect</Link>
            <span>/</span>
            <span>{campaign.business_name}</span>
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-10 items-start">

            {/* Left — campaign identity */}
            <div>
              {/* Compensation badge — MOST PROMINENT element */}
              <div className="flex items-center gap-3 mb-6">
                <span
                  className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.22em] rounded-full px-4 py-2"
                  style={{
                    color: colors.text,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <CompIcon type={campaign.compensation_type} size={14} />
                  {COMPENSATION_LABELS[campaign.compensation_type]}
                  {campaign.compensation_type === "paid" && (
                    <span className="ml-1">· {formatBudget(campaign)}</span>
                  )}
                </span>

                {/* Platform badges */}
                {campaign.required_platforms.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] uppercase tracking-[0.18em] rounded-full px-2.5 py-1 font-medium"
                    style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 40%)" }}
                  >
                    {p}
                  </span>
                ))}
              </div>

              {/* Business + title */}
              <div className="text-[12px] font-medium mb-2" style={{ color: "oklch(1 0 0 / 40%)" }}>
                {campaign.business_name}
                {campaign.business_industry && (
                  <span style={{ color: "oklch(1 0 0 / 28%)" }}> · {campaign.business_industry}</span>
                )}
              </div>
              <h1 className="font-display text-[clamp(2rem,5vw,4rem)] font-bold tracking-[-0.04em] leading-[1.06] mb-4">
                {campaign.title}
              </h1>
              {campaign.product_service && (
                <div className="text-[14px] mb-4" style={{ color: "oklch(1 0 0 / 48%)" }}>
                  {campaign.product_service}
                </div>
              )}

              {/* Meta strip */}
              <div className="flex flex-wrap items-center gap-4 text-[12px]" style={{ color: "oklch(1 0 0 / 36%)" }}>
                {campaign.business_location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {campaign.business_location}
                  </div>
                )}
                {campaign.deadline && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Deadline: {new Date(campaign.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                )}
                {campaign.min_followers && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {campaign.min_followers.toLocaleString()}+ followers
                  </div>
                )}
              </div>
            </div>

            {/* Right — sticky action panel */}
            <div className="space-y-4">
              {/* Compensation card */}
              <CompensationBadge campaign={campaign} />

              {/* Apply CTA */}
              {!isOwner && (
                applied ? (
                  <div
                    className="w-full h-12 rounded-full flex items-center justify-center gap-2 text-sm font-medium"
                    style={{ background: "oklch(0.72 0.14 152 / 10%)", border: "1px solid oklch(0.72 0.14 152 / 30%)", color: "oklch(0.72 0.14 152)" }}
                  >
                    Application Submitted ✓
                  </div>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="btn-primary w-full h-12 rounded-full text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {applying ? "Submitting…" : "Apply for This Campaign"}
                    {!applying && <ArrowUpRight className="h-4 w-4" />}
                  </button>
                )
              )}

              {isOwner && (
                <Link
                  to="/campaigns/$campaignId/edit"
                  params={{ campaignId }}
                  className="w-full h-12 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-150"
                  style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 12%)", color: "oklch(1 0 0 / 55%)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 75%)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 55%)"; }}
                >
                  Edit Campaign
                </Link>
              )}

              {!user && (
                <p className="text-center text-[11px]" style={{ color: "oklch(1 0 0 / 30%)" }}>
                  You'll need a{" "}
                  <Link to="/creator-onboarding" className="underline" style={{ color: "oklch(1 0 0 / 50%)" }}>
                    creator profile
                  </Link>
                  {" "}to apply
                </p>
              )}

              {/* Business links */}
              {(campaign.business_website || campaign.business_instagram || campaign.business_tiktok) && (
                <div
                  className="rounded-xl p-4 space-y-2.5"
                  style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
                >
                  <div className="text-[9.5px] uppercase tracking-[0.25em] font-medium mb-3" style={{ color: "oklch(1 0 0 / 28%)" }}>
                    Find them online
                  </div>
                  {campaign.business_website && (
                    <a href={campaign.business_website} target="_blank" rel="noreferrer"
                      className="flex items-center justify-between text-[12px] group"
                    >
                      <div className="flex items-center gap-2" style={{ color: "oklch(1 0 0 / 55%)" }}>
                        <Globe className="h-3.5 w-3.5" /> Website
                      </div>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "oklch(1 0 0 / 38%)" }} />
                    </a>
                  )}
                  {campaign.business_instagram && (
                    <a href={`https://instagram.com/${campaign.business_instagram}`} target="_blank" rel="noreferrer"
                      className="flex items-center justify-between text-[12px] group"
                    >
                      <div className="flex items-center gap-2" style={{ color: "oklch(1 0 0 / 55%)" }}>
                        <Instagram className="h-3.5 w-3.5" /> @{campaign.business_instagram}
                      </div>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "oklch(1 0 0 / 38%)" }} />
                    </a>
                  )}
                  {campaign.business_tiktok && (
                    <a href={`https://tiktok.com/@${campaign.business_tiktok}`} target="_blank" rel="noreferrer"
                      className="flex items-center justify-between text-[12px] group"
                    >
                      <div className="flex items-center gap-2" style={{ color: "oklch(1 0 0 / 55%)" }}>
                        <span className="text-[11px] font-bold" style={{ fontFamily: "monospace", color: "oklch(1 0 0 / 45%)" }}>TK</span>
                        @{campaign.business_tiktok}
                      </div>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "oklch(1 0 0 / 38%)" }} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid lg:grid-cols-[1fr_340px] gap-10">

          {/* Left column */}
          <div className="space-y-8">

            {/* Description */}
            <div className="hairline-t pt-8">
              <h2 className="font-display text-xl font-semibold tracking-tight mb-4" style={{ color: "oklch(1 0 0 / 82%)" }}>
                About this campaign
              </h2>
              <p className="text-[14px] leading-[1.8] whitespace-pre-line" style={{ color: "oklch(1 0 0 / 58%)" }}>
                {campaign.description}
              </p>
              {campaign.campaign_goal && (
                <div className="mt-5 flex items-start gap-2.5">
                  <span className="text-[10px] uppercase tracking-[0.22em] font-medium mt-0.5 shrink-0" style={{ color: "oklch(1 0 0 / 28%)" }}>
                    Goal
                  </span>
                  <span className="text-[13.5px]" style={{ color: "oklch(1 0 0 / 55%)" }}>
                    {campaign.campaign_goal}
                  </span>
                </div>
              )}
            </div>

            {/* Deliverables */}
            {deliverables.length > 0 && (
              <div className="hairline-t pt-8">
                <h2 className="font-display text-xl font-semibold tracking-tight mb-5" style={{ color: "oklch(1 0 0 / 82%)" }}>
                  Deliverables
                </h2>
                <div className="space-y-3">
                  {deliverables.map((del, i) => (
                    <div
                      key={del.id ?? i}
                      className="flex items-center gap-4 rounded-xl px-5 py-4"
                      style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
                    >
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center font-display text-sm font-semibold shrink-0"
                        style={{ background: "oklch(1 0 0 / 6%)", color: "oklch(1 0 0 / 55%)" }}
                      >
                        {del.quantity}×
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[13.5px]" style={{ color: "oklch(1 0 0 / 82%)" }}>
                          {del.content_type}
                        </div>
                        <div className="text-[11.5px] mt-0.5" style={{ color: "oklch(1 0 0 / 36%)" }}>
                          {del.platform}{del.notes && ` · ${del.notes}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            <div className="hairline-t pt-8">
              <h2 className="font-display text-xl font-semibold tracking-tight mb-5" style={{ color: "oklch(1 0 0 / 82%)" }}>
                Requirements
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Minimum followers", value: campaign.min_followers ? campaign.min_followers.toLocaleString() + "+" : null },
                  { label: "Country",           value: campaign.required_country },
                  { label: "Language",          value: campaign.required_language },
                  { label: "Deadline",          value: campaign.deadline ? new Date(campaign.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null },
                ].filter((r) => r.value).map((r) => (
                  <div
                    key={r.label}
                    className="rounded-xl px-4 py-3.5"
                    style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
                  >
                    <div className="text-[9.5px] uppercase tracking-[0.22em] font-medium mb-1" style={{ color: "oklch(1 0 0 / 28%)" }}>
                      {r.label}
                    </div>
                    <div className="text-[13.5px] font-medium" style={{ color: "oklch(1 0 0 / 74%)" }}>
                      {r.value}
                    </div>
                  </div>
                ))}

                {/* Required niches */}
                {campaign.required_niches.length > 0 && (
                  <div
                    className="sm:col-span-2 rounded-xl px-4 py-3.5"
                    style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
                  >
                    <div className="text-[9.5px] uppercase tracking-[0.22em] font-medium mb-2.5" style={{ color: "oklch(1 0 0 / 28%)" }}>
                      Creator niches
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {campaign.required_niches.map((n) => (
                        <span
                          key={n}
                          className="text-[11.5px] rounded-full px-3 py-1"
                          style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 55%)" }}
                        >
                          {CATEGORY_LABELS[n as keyof typeof CATEGORY_LABELS] ?? n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assets */}
            {assets.length > 0 && (
              <div className="hairline-t pt-8">
                <h2 className="font-display text-xl font-semibold tracking-tight mb-5" style={{ color: "oklch(1 0 0 / 82%)" }}>
                  Brand assets
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {assets.map((asset, i) => (
                    <a
                      key={asset.id ?? i}
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors duration-150 group"
                      style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 4%)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 2.5%)"; }}
                    >
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "oklch(1 0 0 / 6%)" }}
                      >
                        <FileText className="h-4 w-4" style={{ color: "oklch(1 0 0 / 42%)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium truncate" style={{ color: "oklch(1 0 0 / 78%)" }}>
                          {asset.name || ASSET_TYPE_LABELS[asset.asset_type]}
                        </div>
                        <div className="text-[10.5px]" style={{ color: "oklch(1 0 0 / 34%)" }}>
                          {ASSET_TYPE_LABELS[asset.asset_type]}
                        </div>
                      </div>
                      <ExternalLink
                        className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ color: "oklch(1 0 0 / 38%)" }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — sticky apply (desktop repeat) */}
          <div className="hidden lg:block">
            <div className="sticky top-28 space-y-4">
              <CompensationBadge campaign={campaign} />

              {isOwner && (
                <div className="space-y-2.5">
                  <Link
                    to="/campaigns/$campaignId/applicants"
                    params={{ campaignId }}
                    className="w-full h-12 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-150"
                    style={{ background: "oklch(0.72 0.14 152 / 10%)", border: "1px solid oklch(0.72 0.14 152 / 28%)", color: "oklch(0.72 0.14 152)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.14 152 / 16%)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.14 152 / 10%)"; }}
                  >
                    View Applicants
                  </Link>
                  <Link
                    to="/campaigns/$campaignId/edit"
                    params={{ campaignId }}
                    className="w-full h-10 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-150"
                    style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 12%)", color: "oklch(1 0 0 / 55%)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 75%)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 55%)"; }}
                  >
                    Edit Campaign
                  </Link>
                </div>
              )}

              {!isOwner && (
                applied ? (
                  <div
                    className="w-full h-12 rounded-full flex items-center justify-center gap-2 text-sm font-medium"
                    style={{ background: "oklch(0.72 0.14 152 / 10%)", border: "1px solid oklch(0.72 0.14 152 / 30%)", color: "oklch(0.72 0.14 152)" }}
                  >
                    Application Submitted ✓
                  </div>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="btn-primary w-full h-12 rounded-full text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {applying ? "Submitting…" : "Apply for This Campaign"}
                    {!applying && <ArrowUpRight className="h-4 w-4" />}
                  </button>
                )
              )}

              {!user && (
                <p className="text-center text-[11px]" style={{ color: "oklch(1 0 0 / 30%)" }}>
                  Need a{" "}
                  <Link to="/creator-onboarding" className="underline" style={{ color: "oklch(1 0 0 / 50%)" }}>
                    creator profile
                  </Link>
                  {" "}to apply
                </p>
              )}

              {/* Posted date */}
              <div className="text-center text-[10.5px]" style={{ color: "oklch(1 0 0 / 24%)" }}>
                Posted {new Date(campaign.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
