import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft, Users, Edit, Calendar, DollarSign,
  Globe, Package, Target, Megaphone, Clock, Sparkles, CheckCircle2,
  ArrowUpRight, X, Bookmark, BookmarkCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { computeMatchScore, type CreatorInput } from "@/lib/matchScore";
import { MatchScoreBadge, MatchScoreBreakdownPanel } from "@/components/ui/MatchScoreBadge";
import { formatFollowers as fmtFollowers } from "@/types/creator";
import { VerifiedBadge } from "@/components/app/VerifiedBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/campaigns/$campaignId/")({
  head: () => ({ meta: [{ title: "Campaign — MRKT" }] }),
  component: CampaignDetailPage,
});

// ─── Design tokens ─────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignDetail = {
  id:                         string;
  title:                      string;
  description:                string | null;
  status:                     string;
  is_published:               boolean;
  business_name:              string | null;
  business_industry:          string | null;
  business_location:          string | null;
  compensation_type:          string;
  compensation_amount_fixed:  number | null;
  compensation_budget_min:    number | null;
  compensation_budget_max:    number | null;
  required_platforms:         string[];
  required_niches:            string[];
  required_content_types:     string[];
  required_country:           string | null;
  required_language:          string | null;
  target_niche:               string | null;
  min_followers:              number | null;
  max_followers:              number | null;
  deadline:                   string | null;
  campaign_length_days:       number | null;
  deliverable_count:          number | null;
  content_rights:             string | null;
  additional_requirements:    string | null;
  user_id:                    string;
  campaign_applications:      Array<{ id: string; status: string }>;
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: C.textMuted, bg: "oklch(1 0 0 / 6%)"  },
  active:    { label: "Active",    color: C.green,     bg: C.greenMuted          },
  paused:    { label: "Paused",    color: C.yellow,    bg: C.yellowMuted         },
  closed:    { label: "Closed",    color: C.textMuted, bg: "oklch(1 0 0 / 6%)"  },
  completed: { label: "Completed", color: C.green,     bg: C.greenMuted          },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "oklch(1 0 0 / 6%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: C.textMuted }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: C.textMuted, fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 13, color: C.textSecondary }}>{children}</div>
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span style={{ background: "oklch(1 0 0 / 7%)", border: `1px solid ${C.border}`, borderRadius: 99, padding: "4px 11px", fontSize: 11.5, color: C.textSecondary, fontWeight: 500 }}>
      {label}
    </span>
  );
}

function formatBudget(c: CampaignDetail): string {
  if (c.compensation_amount_fixed) return `$${c.compensation_amount_fixed.toLocaleString()} fixed`;
  if (c.compensation_budget_min && c.compensation_budget_max)
    return `$${c.compensation_budget_min.toLocaleString()} – $${c.compensation_budget_max.toLocaleString()}`;
  return c.compensation_type === "gifted" ? "Gifted product" : c.compensation_type.replace(/_/g, " ");
}

function formatFollowers(min: number | null, max: number | null): string {
  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return "Any size";
}

// ─── Booked creator type ──────────────────────────────────────────────────────

type BookedCreator = {
  id: string;
  estimated_rate: string | null;
  booked_at: string | null;
  contact_method: string | null;
  creator_profiles: {
    id: string;
    display_name: string;
    niche: string | null;
    profile_image_url: string | null;
    follower_count: number | null;
    platforms: string[];
  } | null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function CampaignDetailPage() {
  const { user }        = useAuth();
  const navigate        = useNavigate();
  const { campaignId }  = Route.useParams();

  const [campaign,       setCampaign]       = useState<CampaignDetail | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [isOwner,        setIsOwner]        = useState(false);
  const [isCreator,      setIsCreator]      = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<CreatorInput | null>(null);
  const [hasApplied,     setHasApplied]     = useState(false);
  const [isSaved,        setIsSaved]        = useState(false);
  const [applyNote,      setApplyNote]      = useState("");
  const [showApply,      setShowApply]      = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [topCreators,    setTopCreators]    = useState<Array<CreatorInput & { id: string; display_name: string; profile_image_url: string | null; location: string | null; niche: string | null; follower_count: number | null; is_verified?: boolean }>>([]);
  const [bookedCreators, setBookedCreators] = useState<BookedCreator[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // required_content_types, target_niche, max_followers,
      // campaign_length_days, deliverable_count, content_rights, and
      // additional_requirements do not exist as columns on campaigns (verified
      // against generated types) — every one of these fields was previously
      // requested in a single concatenated select string, which made the
      // ENTIRE query error on every load (a single invalid column fails the
      // whole select), silently redirecting every viewer away from this page.
      // Select only real columns here; the UI already renders each of the
      // missing fields conditionally, so defaulting them to null/[] below
      // just hides those sections until a schema migration backs them for
      // real, rather than continuing to break the page outright.
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          "id,title,description,status,is_published,user_id,business_name,business_industry,business_location,compensation_type,compensation_amount_fixed,compensation_budget_min,compensation_budget_max,required_platforms,required_niches,required_country,required_language,min_followers,deadline,campaign_applications(id,status)"
        )
        .eq("id", campaignId)
        .single();

      if (error || !data) { navigate({ to: "/campaigns" }); return; }
      const owner = data.user_id === user.id;
      setIsOwner(owner);
      setCampaign({
        ...data,
        required_content_types:  [],
        target_niche:            null,
        max_followers:           null,
        campaign_length_days:    null,
        deliverable_count:       null,
        content_rights:          null,
        additional_requirements: null,
      } as CampaignDetail);
      setLoading(false);

      // Detect role and load creator-specific context
      const { data: profileData } = await supabase.from("profiles").select("onboarding_path,account_type").eq("id", user.id).maybeSingle();
      const creatorRole = profileData?.onboarding_path === "creator" || profileData?.account_type === "creator";
      setIsCreator(creatorRole);

      if (creatorRole && !owner) {
        // Load creator profile for match score
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: cp } = await supabase.from("creator_profiles").select(
          "platforms,niche,categories,audience_location,location,location_city,location_country,follower_count,primary_language,accepts_paid,accepts_gifted,accepts_affiliate,preferred_content_types"
        ).eq("user_id", user.id).maybeSingle();
        if (cp) setCreatorProfile(cp as CreatorInput);

        // Check applied + saved status
        const [appRes, saveRes] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase.from("campaign_applications").select("id").eq("user_id", user.id).eq("campaign_id", data.id).maybeSingle(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase.from("campaign_saves").select("id").eq("user_id", user.id).eq("campaign_id", data.id).maybeSingle(),
        ]);
        setHasApplied(!!appRes.data);
        setIsSaved(!!saveRes.data);
      }

      // Only fetch owner-specific data
      if (owner) {
        // Recommended creators (top 80 for scoring)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: creatorsData } = await supabase
          .from("creator_profiles")
          .select(
            "id,display_name,niche,categories,platforms,profile_image_url,follower_count,location,location_city,location_country,audience_location,primary_language,accepts_paid,accepts_gifted,accepts_affiliate,preferred_content_types,is_verified"
          )
          .eq("is_public", true)
          .eq("status", "active")
          .limit(80);
        if (creatorsData) setTopCreators(creatorsData);

        // Booked creators linked to this campaign via pipeline
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: bookedData } = await supabase
          .from("project_saved_creators")
          .select(`
            id, estimated_rate, booked_at, contact_method,
            creator_profiles ( id, display_name, niche, profile_image_url, follower_count, platforms )
          `)
          .eq("campaign_id", campaignId)
          .eq("status", "booked");
        if (bookedData) setBookedCreators(bookedData as BookedCreator[]);
      }
    })();
  }, [user, campaignId, navigate]);

  // Creator match score for this campaign
  const creatorMatchBreakdown = useMemo(() => {
    if (!creatorProfile || !campaign) return null;
    return computeMatchScore(creatorProfile, {
      required_platforms: campaign.required_platforms ?? [],
      required_niches:    campaign.required_niches ?? [],
      business_industry:  campaign.business_industry,
      required_country:   campaign.required_country,
      required_language:  campaign.required_language,
      min_followers:      campaign.min_followers,
      compensation_type:  campaign.compensation_type,
    });
  }, [creatorProfile, campaign]);

  async function handleApply() {
    if (!user || !campaign) return;
    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cp } = await supabase.from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!cp) { toast.error("Complete your creator profile first."); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("campaign_applications").insert({
        creator_profile_id: cp.id,
        campaign_id:        campaign.id,
        user_id:            user.id,
        campaign_brand:     campaign.business_name ?? undefined,
        campaign_title:     campaign.title,
        status:             "pending",
        cover_note:         applyNote.trim() || null,
      });
      if (error) throw error;
      setHasApplied(true);
      setShowApply(false);
      setApplyNote("");
      toast.success("Application submitted! Track it in My Applications.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleSave() {
    if (!user || !campaign) return;
    const next = !isSaved;
    setIsSaved(next);
    try {
      if (next) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from("campaign_saves").insert({ user_id: user.id, campaign_id: campaign.id });
        toast.success("Saved to your opportunities.");
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from("campaign_saves").delete().eq("user_id", user.id).eq("campaign_id", campaign.id);
        toast("Removed from saved.");
      }
    } catch {
      setIsSaved(!next);
      toast.error("Could not save. Try again.");
    }
  }

  // Recommended creators — top 6 sorted by match score (must be before any early return)
  const recommended = useMemo(() => {
    if (!topCreators.length || !campaign) return [];
    const campaignInput = {
      required_platforms: campaign.required_platforms ?? [],
      required_niches:    campaign.required_niches ?? [],
      business_industry:  campaign.business_industry,
      required_country:   campaign.required_country,
      required_language:  campaign.required_language,
      min_followers:      campaign.min_followers,
      compensation_type:  campaign.compensation_type,
    };
    return topCreators
      .map((c) => ({
        creator: c,
        score:   computeMatchScore(c, campaignInput).total,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [topCreators, campaign]);

  if (loading) return (
    <div className="h-full flex items-center justify-center" style={{ background: C.bg }}>
      <div className="h-5 w-5 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 12%)" }} />
    </div>
  );

  if (!campaign) return null;

  const apps          = campaign.campaign_applications;
  const totalApps     = apps.length;
  const pendingCount  = apps.filter(a => a.status === "pending").length;
  const acceptedCount = apps.filter(a => a.status === "accepted").length;

  return (
    <>
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.bg }}>

      {/* Top bar */}
      <div
        className="h-[52px] px-6 flex items-center gap-3 shrink-0"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <button
          onClick={() => navigate({ to: isCreator ? "/opportunities" : "/campaigns" })}
          className="flex items-center gap-1.5 text-[12px] transition-colors"
          style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontFamily: "inherit" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> {isCreator ? "Opportunities" : "Campaigns"}
        </button>
        <span style={{ color: C.textMuted, fontSize: 12 }}>/</span>
        <span className="text-[12px] font-medium" style={{ color: C.textSecondary }}>{campaign.title}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Creator CTAs */}
          {isCreator && !isOwner && (
            <>
              {creatorMatchBreakdown && (
                <MatchScoreBadge score={creatorMatchBreakdown.total} showLabel />
              )}
              <button
                onClick={handleToggleSave}
                className="flex items-center gap-1.5 text-[12px] font-medium"
                style={{
                  padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  background: isSaved ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 5%)",
                  border: `1px solid ${isSaved ? "oklch(1 0 0 / 28%)" : C.border}`,
                  color: isSaved ? C.chrome : C.textMuted,
                }}
              >
                {isSaved ? <BookmarkCheck style={{ width: 13, height: 13 }} /> : <Bookmark style={{ width: 13, height: 13 }} />}
                {isSaved ? "Saved" : "Save"}
              </button>
              {hasApplied ? (
                <div
                  className="flex items-center gap-1.5 text-[13px] font-medium"
                  style={{ padding: "7px 14px", borderRadius: 8, background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.border}`, color: C.textMuted }}
                >
                  <CheckCircle2 style={{ width: 14, height: 14 }} /> Applied
                </div>
              ) : (
                <button
                  onClick={() => setShowApply(true)}
                  className="flex items-center gap-1.5 text-[13px] font-medium btn-primary"
                  style={{ padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Apply <ArrowUpRight style={{ width: 14, height: 14 }} />
                </button>
              )}
            </>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => navigate({ to: `/campaigns/${campaignId}/applicants` as "/" })}
                className="flex items-center gap-1.5 text-[13px] font-medium"
                style={{
                  padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  background: pendingCount > 0 ? "oklch(1 0 0 / 12%)" : "oklch(1 0 0 / 6%)",
                  border: `1px solid ${pendingCount > 0 ? "oklch(1 0 0 / 30%)" : C.border}`,
                  color: pendingCount > 0 ? C.accent : C.textSecondary,
                }}
              >
                <Users style={{ width: 14, height: 14 }} />
                {pendingCount > 0 ? `Review ${pendingCount} new` : `Applicants (${totalApps})`}
              </button>
              <button
                onClick={() => navigate({ to: `/campaigns/${campaignId}/edit` as "/" })}
                className="flex items-center gap-1.5 text-[13px] font-medium"
                style={{
                  padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.border}`, color: C.textSecondary,
                }}
              >
                <Edit style={{ width: 14, height: 14 }} /> Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 100px" }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div className="flex items-center gap-2 mb-2.5">
              <StatusBadge status={campaign.status} />
              {!campaign.is_published && (
                <span style={{ fontSize: 11, color: C.yellow, fontWeight: 500 }}>· Unpublished</span>
              )}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px", lineHeight: 1.2 }}>
              {campaign.title}
            </h1>
            {campaign.business_name && (
              <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>
                {campaign.business_name}
                {campaign.business_industry && ` · ${campaign.business_industry}`}
                {campaign.business_location  && ` · ${campaign.business_location}`}
              </p>
            )}
          </div>

          {/* Applicant stats */}
          <div className="flex gap-2.5 mb-8 flex-wrap">
            {[
              { label: "Total Applicants", value: totalApps,     color: C.textPrimary },
              { label: "Pending Review",   value: pendingCount,  color: pendingCount  > 0 ? C.yellow : C.textMuted },
              { label: "Accepted",         value: acceptedCount, color: acceptedCount > 0 ? C.green  : C.textMuted },
            ].map(s => (
              <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 20px", minWidth: 120, flex: "1 1 0" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {campaign.description && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 24 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.24em", color: C.textMuted, fontWeight: 600, marginBottom: 10 }}>Campaign Brief</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: C.textSecondary, margin: 0 }}>{campaign.description}</p>
            </div>
          )}

          {/* Details */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "4px 24px", marginBottom: 24 }}>
            <DetailRow icon={<DollarSign style={{ width: 15, height: 15 }} />} label="Compensation">
              {formatBudget(campaign)}
            </DetailRow>
            {campaign.required_platforms?.length > 0 && (
              <DetailRow icon={<Globe style={{ width: 15, height: 15 }} />} label="Platforms">
                <div className="flex flex-wrap gap-1.5">{campaign.required_platforms.map(p => <Chip key={p} label={p} />)}</div>
              </DetailRow>
            )}
            {campaign.required_content_types?.length > 0 && (
              <DetailRow icon={<Package style={{ width: 15, height: 15 }} />} label="Content Types">
                <div className="flex flex-wrap gap-1.5">{campaign.required_content_types.map(t => <Chip key={t} label={t} />)}</div>
              </DetailRow>
            )}
            {(campaign.min_followers || campaign.max_followers) && (
              <DetailRow icon={<Users style={{ width: 15, height: 15 }} />} label="Creator Size">
                {formatFollowers(campaign.min_followers, campaign.max_followers)}
              </DetailRow>
            )}
            {campaign.target_niche && (
              <DetailRow icon={<Target style={{ width: 15, height: 15 }} />} label="Target Niche">
                {campaign.target_niche}
              </DetailRow>
            )}
            {campaign.deadline && (
              <DetailRow icon={<Calendar style={{ width: 15, height: 15 }} />} label="Application Deadline">
                {new Date(campaign.deadline).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </DetailRow>
            )}
            {campaign.campaign_length_days && (
              <DetailRow icon={<Clock style={{ width: 15, height: 15 }} />} label="Campaign Duration">
                {campaign.campaign_length_days} days
              </DetailRow>
            )}
            {campaign.deliverable_count && (
              <DetailRow icon={<Megaphone style={{ width: 15, height: 15 }} />} label="Deliverables">
                {campaign.deliverable_count} piece{campaign.deliverable_count > 1 ? "s" : ""} of content
              </DetailRow>
            )}
            {campaign.content_rights && (
              <DetailRow icon={<Package style={{ width: 15, height: 15 }} />} label="Content Rights">
                {campaign.content_rights.replace(/_/g, " ")}
              </DetailRow>
            )}
            {campaign.additional_requirements && (
              <DetailRow icon={<Target style={{ width: 15, height: 15 }} />} label="Additional Requirements">
                {campaign.additional_requirements}
              </DetailRow>
            )}
          </div>

          {/* CTA */}
          {isOwner && (
            <button
              onClick={() => navigate({ to: `/campaigns/${campaignId}/applicants` as "/" })}
              className="inline-flex items-center gap-2 text-[14px] font-medium"
              style={{
                padding: "12px 24px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                background: pendingCount > 0 ? "oklch(1 0 0 / 14%)" : "oklch(1 0 0 / 7%)",
                border: `1px solid ${pendingCount > 0 ? "oklch(1 0 0 / 30%)" : C.border}`,
                color: pendingCount > 0 ? C.green : C.textSecondary,
              }}
            >
              <Users style={{ width: 16, height: 16 }} />
              {totalApps === 0 ? "No applicants yet" : `View all ${totalApps} applicant${totalApps > 1 ? "s" : ""}`}
            </button>
          )}

          {/* Booked Creators */}
          {isOwner && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 style={{ width: 14, height: 14, color: C.green }} />
                  <h2 style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.18em", margin: 0 }}>
                    Booked Creators
                    {bookedCreators.length > 0 && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: C.greenMuted, color: C.green, borderRadius: 99, padding: "1px 8px" }}>
                        {bookedCreators.length}
                      </span>
                    )}
                  </h2>
                </div>
                <Link
                  to="/pipeline"
                  style={{ fontSize: 11, color: C.textMuted, textDecoration: "none" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                >
                  Manage pipeline →
                </Link>
              </div>

              {bookedCreators.length === 0 ? (
                <div
                  style={{
                    background: C.surface, border: `1px dashed ${C.border}`,
                    borderRadius: 14, padding: "20px 24px", textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 8px" }}>No booked creators yet</p>
                  <p style={{ fontSize: 11, color: "oklch(1 0 0 / 28%)", margin: 0 }}>
                    In your{" "}
                    <Link to="/pipeline" style={{ color: C.textMuted, textDecoration: "underline" }}>Pipeline</Link>
                    , move a creator to <strong style={{ color: C.textSecondary }}>Booked</strong> and link this campaign to see them here.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {bookedCreators.map(bc => {
                    const cp = bc.creator_profiles;
                    if (!cp) return null;
                    return (
                      <div
                        key={bc.id}
                        className="card-lift"
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          background: C.surface, border: `1px solid ${C.border}`,
                          borderRadius: 12, padding: "12px 16px",
                        }}
                      >
                        {cp.profile_image_url ? (
                          <img src={cp.profile_image_url} alt={cp.display_name} className="img-fade" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid oklch(1 0 0 / 10%)" }} onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "oklch(0.78 0.005 0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.7)" }}>
                            {cp.display_name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {cp.display_name}
                          </div>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {cp.niche && <span>{cp.niche}</span>}
                            {cp.follower_count && <span>· {fmtFollowers(cp.follower_count)}</span>}
                            {bc.booked_at && <span style={{ color: C.green }}>· Booked {new Date(bc.booked_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                          </div>
                        </div>
                        {bc.estimated_rate && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, whiteSpace: "nowrap" }}>
                            {bc.estimated_rate}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 10, fontWeight: 700, background: C.greenMuted,
                            color: C.green, borderRadius: 99, padding: "3px 10px",
                          }}
                        >
                          Booked
                        </span>
                        <button
                          onClick={() => navigate({ to: `/creators/${cp.id}` as "/" })}
                          style={{ fontSize: 11, color: C.textMuted, background: "oklch(1 0 0 / 6%)", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", borderRadius: 6 }}
                        >
                          View
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Creator: Match Score Breakdown */}
          {isCreator && !isOwner && creatorMatchBreakdown && (
            <div style={{ marginTop: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Sparkles style={{ width: 14, height: 14, color: C.chrome }} />
                <h2 style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.18em", margin: 0 }}>
                  Why you match
                </h2>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px" }}>
                <MatchScoreBreakdownPanel breakdown={creatorMatchBreakdown} />
                {!hasApplied && (
                  <button
                    onClick={() => setShowApply(true)}
                    className="btn-primary"
                    style={{ marginTop: 16, width: "100%", borderRadius: 10, height: 42, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    Apply to this campaign <ArrowUpRight style={{ width: 16, height: 16 }} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Recommended Creators */}
          {isOwner && recommended.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Sparkles style={{ width: 14, height: 14, color: C.chrome }} />
                <h2 style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.18em", margin: 0 }}>
                  Recommended Creators
                </h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recommended.map(({ creator, score }, idx) => (
                  <div
                    key={creator.id}
                    className="card-lift"
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 12, padding: "12px 16px",
                    }}
                  >
                    {/* Rank */}
                    <div style={{ width: 20, textAlign: "center", fontSize: 11, fontWeight: 700, color: C.textMuted, flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    {/* Avatar */}
                    {creator.profile_image_url ? (
                      <img
                        src={creator.profile_image_url}
                        alt={creator.display_name}
                        loading="lazy"
                        className="img-fade"
                        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid oklch(1 0 0 / 10%)" }}
                        onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
                      />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "oklch(0.78 0.005 0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.75)" }}>
                        {creator.display_name[0]?.toUpperCase()}
                      </div>
                    )}
                    {/* Name + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{creator.display_name}</span>
                        {creator.is_verified && <VerifiedBadge type="creator" size="xs" />}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, display: "flex", gap: 6 }}>
                        {creator.niche && <span>{creator.niche}</span>}
                        {creator.follower_count && <span>· {fmtFollowers(creator.follower_count)}</span>}
                      </div>
                    </div>
                    {/* Score */}
                    <MatchScoreBadge score={score} size="sm" />
                    {/* View */}
                    <button
                      onClick={() => navigate({ to: `/creators/${creator.id}` as "/" })}
                      style={{ fontSize: 11, color: C.textMuted, background: "oklch(1 0 0 / 6%)", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", borderRadius: 6 } as React.CSSProperties}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate({ to: "/find-creators" })}
                style={{ marginTop: 12, fontSize: 12, color: C.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Browse all creators →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Creator Apply Modal */}
    {showApply && campaign && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "oklch(0 0 0 / 75%)", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowApply(false); }}
      >
        <div
          className="w-full max-w-md rounded-2xl overflow-hidden modal-in"
          style={{ background: "oklch(0.09 0 0)", border: `1px solid oklch(1 0 0 / 14%)`, boxShadow: "0 24px 64px oklch(0 0 0 / 70%)" }}
        >
          <div style={{ padding: "24px 24px 16px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.24em", color: "oklch(1 0 0 / 30%)", marginBottom: 4 }}>
                  {campaign.business_name}
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{campaign.title}</h2>
              </div>
              <button
                onClick={() => setShowApply(false)}
                style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "oklch(1 0 0 / 5%)", border: "none", cursor: "pointer", color: C.textMuted, flexShrink: 0 }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
          <div style={{ padding: 24 }}>
            <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.24em", color: "oklch(1 0 0 / 32%)", marginBottom: 8, fontWeight: 600 }}>
              Cover note <span style={{ color: "oklch(1 0 0 / 22%)" }}>(optional)</span>
            </label>
            <textarea
              value={applyNote}
              onChange={(e) => setApplyNote(e.target.value)}
              placeholder="Tell the brand why you're a great fit. Mention your audience, relevant experience, or creative ideas…"
              rows={4}
              style={{ width: "100%", borderRadius: 12, padding: "12px 16px", fontSize: 13, lineHeight: 1.6, resize: "none", outline: "none", fontFamily: "inherit", background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.border}`, color: C.textPrimary, boxSizing: "border-box" }}
            />
            <div style={{ textAlign: "right", marginTop: 4, fontSize: 10, color: "oklch(1 0 0 / 26%)" }}>{applyNote.length}/500</div>
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "oklch(1 0 0 / 5%)", border: `1px solid oklch(1 0 0 / 14%)`, fontSize: 11.5, color: C.textMuted }}>
              Your creator profile — including your audience, platforms, and portfolio — will be shared with this brand.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setShowApply(false)}
                style={{ flex: 1, borderRadius: 99, height: 40, fontSize: 13, fontWeight: 500, background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.border}`, color: C.textMuted, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={submitting}
                className="btn-primary"
                style={{ flex: 1, borderRadius: 99, height: 40, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {submitting ? "Submitting…" : <><span>Submit application</span><ArrowUpRight style={{ width: 14, height: 14 }} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
