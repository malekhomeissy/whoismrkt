import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  Sparkles, ArrowUpRight, MapPin, Users, MessageSquare,
  ChevronDown, Zap, Star, Loader2,
} from "lucide-react";
import { formatFollowers, platformShort, platformColor } from "@/types/creator";
import { computeMatchScore, type CampaignInput, type MatchScoreBreakdown, type CreatorTrustScore } from "@/lib/matchScore";
import { MatchScoreBadge, MatchScoreBreakdownPanel } from "@/components/ui/MatchScoreBadge";
import { VerifiedBadge } from "@/components/app/VerifiedBadge";
import { findOrCreateConversation } from "@/lib/messaging";

export const Route = createFileRoute("/_authenticated/matches")({
  head: () => ({ meta: [{ title: "MRKT Matches — Your Best Creator Fits" }] }),
  component: MatchesPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type Campaign = {
  id: string;
  title: string;
  compensation_type: string;
  required_platforms: string[];
  required_niches: string[];
  business_industry: string | null;
  required_country: string | null;
  required_language: string | null;
  min_followers: number | null;
};

type Creator = {
  id: string;
  user_id: string | null;
  display_name: string;
  niche: string | null;
  categories: string[];
  platforms: string[];
  location: string | null;
  location_city: string | null;
  location_country: string | null;
  profile_image_url: string | null;
  follower_count: number | null;
  audience_location: string | null;
  primary_language: string | null;
  accepts_paid: boolean;
  accepts_gifted: boolean;
  accepts_affiliate: boolean;
  preferred_content_types: string[];
  is_verified?: boolean;
  avg_rating?: number | null;
};

type ScoredCreator = {
  creator: Creator;
  breakdown: MatchScoreBreakdown;
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "oklch(0.32 0 0)", "oklch(0.28 0 0)",
  "oklch(0.36 0 0)", "oklch(0.25 0 0)",
  "oklch(0.30 0 0)", "oklch(0.34 0 0)",
];
function avatarBg(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

// ─── Match tier label ─────────────────────────────────────────────────────────

function tierLabel(score: number): string {
  if (score >= 90) return "Best Fit";
  if (score >= 75) return "Strong Fit";
  if (score >= 55) return "Good Fit";
  return "Possible Fit";
}

// ─── Creator match card ───────────────────────────────────────────────────────

function CreatorMatchCard({
  creator, breakdown, rank, campaign, onMessage,
}: {
  creator: Creator;
  breakdown: MatchScoreBreakdown;
  rank: number;
  campaign: Campaign | null;
  onMessage: (creator: Creator) => void;
}) {
  const [expanded,      setExpanded]      = useState(false);
  const [aiReasoning,   setAiReasoning]   = useState<string | null>(null);
  const [loadingReason, setLoadingReason] = useState(false);
  const name = creator.display_name;
  const tier = tierLabel(breakdown.total);
  const isBestFit = breakdown.total >= 90;

  async function loadReasoning() {
    if (aiReasoning || loadingReason) return;
    setLoadingReason(true);
    try {
      const prompt = `Explain in 2-3 concise sentences why this creator is a strong match for this campaign. Be specific about the reasons.

Creator: ${creator.display_name}
Niche: ${creator.niche ?? "general"}
Platforms: ${creator.platforms.join(", ")}
Followers: ${creator.follower_count?.toLocaleString() ?? "unknown"}
Location: ${creator.location_country ?? creator.location ?? "unknown"}
Categories: ${creator.categories.join(", ")}

Campaign: ${campaign?.title ?? "unnamed"}
Industry: ${campaign?.business_industry ?? "unknown"}
Required platforms: ${campaign?.required_platforms?.join(", ") ?? "any"}
Required niches: ${campaign?.required_niches?.join(", ") ?? "any"}

Match score: ${breakdown.total}% (Platform: ${breakdown.platform}%, Niche: ${breakdown.niche}%, Audience: ${breakdown.audience}%, Location: ${breakdown.location}%, Requirements: ${breakdown.requirements}%)

Return only the explanation text, no JSON, no headers.`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: { task_type: "match_score_reason", prompt },
      });

      if (error) throw new Error(error.message);
      setAiReasoning((data?.response as string)?.trim() ?? null);
    } catch (err) {
      console.warn("AI reasoning failed:", err);
      setAiReasoning(null);
    } finally {
      setLoadingReason(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: C.surface,
        border: `1px solid ${isBestFit ? "oklch(1 0 0 / 18%)" : C.border}`,
        boxShadow: isBestFit ? "0 0 0 1px oklch(1 0 0 / 6%), 0 4px 24px oklch(0 0 0 / 30%)" : "none",
      }}
    >
      {/* Top accent for best fits */}
      {isBestFit && (
        <div className="h-[2px] w-full" style={{ background: C.accent }} />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4 mb-4">
          {/* Rank */}
          <div
            className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{ background: rank <= 3 ? C.accentMuted : C.raised, color: rank <= 3 ? C.accent : C.textMuted }}
          >
            {rank}
          </div>

          {/* Avatar */}
          <div className="shrink-0 relative">
            {creator.profile_image_url ? (
              <img
                src={creator.profile_image_url}
                alt={name}
                className="h-12 w-12 rounded-xl object-cover"
                style={{ border: `1px solid ${C.border}` }}
              />
            ) : (
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-[17px] font-bold"
                style={{ background: avatarBg(name), color: "oklch(1 0 0 / 80%)" }}
              >
                {name[0]?.toUpperCase()}
              </div>
            )}
            {creator.is_verified && (
              <div className="absolute -bottom-1 -right-1">
                <VerifiedBadge size="sm" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-semibold text-[14px] truncate" style={{ color: C.textPrimary }}>{name}</span>
              <span
                className="text-[9px] uppercase tracking-[0.18em] font-bold rounded-full px-2 py-0.5"
                style={{
                  background: isBestFit ? C.accentMuted : "oklch(1 0 0 / 5%)",
                  color: isBestFit ? C.accent : C.textMuted,
                  border: `1px solid ${isBestFit ? C.accentBorder : C.border}`,
                }}
              >
                {tier}
              </span>
            </div>
            {creator.niche && (
              <p className="text-[12px] truncate" style={{ color: C.textSecondary }}>{creator.niche}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: C.textMuted }}>
              {creator.follower_count && (
                <span className="flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" />
                  {formatFollowers(creator.follower_count)}
                </span>
              )}
              {(creator.location_city || creator.location) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" />
                  {creator.location_city || creator.location}
                </span>
              )}
              {creator.avg_rating && (
                <span className="flex items-center gap-1">
                  <Star className="h-2.5 w-2.5 fill-current" style={{ color: "oklch(0.84 0 0)" }} />
                  {creator.avg_rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Match score */}
          <div className="shrink-0">
            <MatchScoreBadge score={breakdown.total} showLabel />
          </div>
        </div>

        {/* Platforms */}
        {creator.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {creator.platforms.map((p) => (
              <span
                key={p}
                className="text-[10px] rounded-full px-2.5 py-0.5 font-medium uppercase tracking-[0.12em]"
                style={{ background: `${platformColor(p)}15`, color: platformColor(p), border: `1px solid ${platformColor(p)}30` }}
              >
                {platformShort(p)}
              </span>
            ))}
            {creator.categories.slice(0, 3).map((cat) => (
              <span key={cat} className="text-[10px] rounded-full px-2.5 py-0.5" style={{ background: "oklch(1 0 0 / 4%)", color: C.textMuted, border: `1px solid ${C.border}` }}>
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Score breakdown (collapsible) */}
        <div className="mb-4">
          <button
            onClick={() => { setExpanded((v) => { const next = !v; if (next) loadReasoning(); return next; }); }}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
            style={{ color: C.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.accent; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            <Sparkles className="h-3 w-3" />
            Why this match?
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded && (
            <div className="mt-2 space-y-3">
              <MatchScoreBreakdownPanel breakdown={breakdown} />
              {/* AI reasoning */}
              {loadingReason && (
                <div className="flex items-center gap-2 text-[11px]" style={{ color: C.textMuted }}>
                  <Loader2 className="h-3 w-3 animate-spin" /> Analyzing match…
                </div>
              )}
              {aiReasoning && (
                <div
                  className="rounded-xl p-3"
                  style={{ background: "oklch(0.72 0.10 224 / 6%)", border: "1px solid oklch(0.55 0.18 260 / 15%)" }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3 w-3" style={{ color: "oklch(0.72 0.10 224)" }} />
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: "oklch(0.72 0.10 224)" }}>
                      AI Strategist
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: "oklch(1 0 0 / 60%)" }}>{aiReasoning}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onMessage(creator)}
            className="flex items-center gap-1.5 rounded-full px-4 h-8 text-[12px] font-medium transition-all"
            style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.border}`, color: C.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
          >
            <MessageSquare className="h-3 w-3" /> Message
          </button>
          <Link
            to={`/creator/${creator.id}` as "/"}
            className="flex items-center gap-1.5 rounded-full px-4 h-8 text-[12px] font-medium transition-all"
            style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.border}`, color: C.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
          >
            View profile <ArrowUpRight className="h-3 w-3" />
          </Link>
          <div className="ml-auto text-[11px]" style={{ color: C.textFaint }}>
            {breakdown.total}% match
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function MatchesPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [campaigns,       setCampaigns]       = useState<Campaign[]>([]);
  const [creators,        setCreators]        = useState<Creator[]>([]);
  const [trustScores,     setTrustScores]     = useState<Record<string, CreatorTrustScore>>({});
  const [loading,         setLoading]         = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [minScore,        setMinScore]        = useState(50);
  const [messaging,       setMessaging]       = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        // Gate: creators go to /opportunities
        const { data: p } = await supabase.from("profiles").select("onboarding_path,account_type").eq("id", user.id).maybeSingle();
        const isCreator = p?.onboarding_path === "creator" || p?.account_type === "creator";
        if (isCreator) { navigate({ to: "/opportunities" }); return; }

        const [campaignRes, creatorsRes] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase
            .from("campaigns")
            .select("id,title,compensation_type,required_platforms,required_niches,business_industry,required_country,required_language,min_followers")
            .eq("user_id", user.id)
            .in("status", ["active", "draft"])
            .order("created_at", { ascending: false }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase
            .from("creator_profiles")
            .select(
              "id,user_id,display_name,niche,categories,platforms,location,location_city,location_country,profile_image_url,follower_count,audience_location,primary_language,accepts_paid,accepts_gifted,accepts_affiliate,preferred_content_types,is_verified,avg_rating"
            )
            .eq("is_public", true)
            .eq("status", "active")
            .limit(200),
        ]);

        const camps: Campaign[] = campaignRes.data ?? [];
        setCampaigns(camps);
        if (camps.length > 0) setSelectedCampaign(camps[0]);

        const loadedCreators: Creator[] = creatorsRes.data ?? [];
        setCreators(loadedCreators);

        // Fetch trust scores for all loaded creators
        const userIds = loadedCreators.map((c) => c.user_id).filter(Boolean) as string[];
        if (userIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: trustData } = await supabase
            .from("creator_trust_scores")
            .select("*")
            .in("user_id", userIds);
          if (trustData) {
            const map: Record<string, CreatorTrustScore> = {};
            for (const ts of trustData) map[ts.user_id] = ts as CreatorTrustScore;
            setTrustScores(map);
          }
        }
      } catch {
        toast.error("Could not load matches.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  const campaignInput = useMemo((): CampaignInput | null => {
    if (!selectedCampaign) return null;
    return {
      required_platforms: selectedCampaign.required_platforms ?? [],
      required_niches:    selectedCampaign.required_niches ?? [],
      business_industry:  selectedCampaign.business_industry,
      required_country:   selectedCampaign.required_country,
      required_language:  selectedCampaign.required_language,
      min_followers:      selectedCampaign.min_followers,
      compensation_type:  selectedCampaign.compensation_type,
    };
  }, [selectedCampaign]);

  const scored = useMemo((): ScoredCreator[] => {
    if (!campaignInput || creators.length === 0) return [];
    return creators
      .map((c) => {
        const trust = c.user_id ? trustScores[c.user_id] ?? null : null;
        return { creator: c, breakdown: computeMatchScore(c as Parameters<typeof computeMatchScore>[0], campaignInput, trust) };
      })
      .filter((r) => r.breakdown.total >= minScore)
      .sort((a, b) => b.breakdown.total - a.breakdown.total);
  }, [creators, campaignInput, minScore, trustScores]);

  const tierCounts = useMemo(() => ({
    best:     scored.filter((r) => r.breakdown.total >= 90).length,
    strong:   scored.filter((r) => r.breakdown.total >= 75 && r.breakdown.total < 90).length,
    good:     scored.filter((r) => r.breakdown.total >= 55 && r.breakdown.total < 75).length,
    possible: scored.filter((r) => r.breakdown.total < 55).length,
  }), [scored]);

  async function handleMessage(creator: Creator) {
    if (!user || !creator.user_id) { toast.error("Cannot message this creator."); return; }
    setMessaging(true);
    try {
      const convId = await findOrCreateConversation(user.id, creator.user_id);
      navigate({ to: `/messages/${convId}` as "/" });
    } catch {
      toast.error("Could not open conversation.");
    } finally {
      setMessaging(false);
    }
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas }}>
        <div className="h-[52px] shrink-0" style={{ borderBottom: `1px solid ${C.border}` }} />
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-4xl mx-auto px-6 py-10 space-y-4">
            <div className="mb-8 space-y-3">
              <div className="skeleton" style={{ height: 30, width: "40%" }} />
              <div className="skeleton" style={{ height: 14, width: "60%" }} />
            </div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-4">
                  <div className="skeleton h-12 w-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton" style={{ height: 14, width: "30%" }} />
                    <div className="skeleton" style={{ height: 11, width: "50%" }} />
                  </div>
                  <div className="skeleton" style={{ height: 26, width: 60, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas, color: C.textPrimary }}>

      {/* Top bar */}
      <div className="h-[52px] px-6 flex items-center justify-between shrink-0 gap-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: C.textFaint }}>MRKT</span>
          <span className="text-[12px]" style={{ color: C.textFaint }}>/</span>
          <span className="text-[12px] font-medium" style={{ color: C.textMuted }}>MRKT Matches</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" style={{ color: C.accent }} />
          <span className="text-[11px]" style={{ color: C.textFaint }}>
            {scored.length} creators matched
          </span>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-10">
            <div className="text-[9.5px] uppercase tracking-[0.32em] mb-4 font-medium" style={{ color: C.textFaint }}>
              MRKT Intelligence
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.04em] leading-[1.06] mb-3">
              MRKT Matches.
            </h1>
            <p className="text-[1rem] font-light leading-relaxed" style={{ color: C.textMuted }}>
              Creators ranked by how well they fit your campaign — by platform, niche, audience, location, and requirements.
              Not random. Real matching.
            </p>
          </div>

          {/* No campaigns state */}
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.border}` }}
              >
                <Sparkles className="h-7 w-7" style={{ color: "oklch(1 0 0 / 20%)" }} />
              </div>
              <p className="text-[1rem] font-medium mb-2" style={{ color: C.textMuted }}>
                No active campaigns yet.
              </p>
              <p className="text-[13px] mb-6" style={{ color: C.textFaint }}>
                Create a campaign to see your personalized creator matches.
              </p>
              <Link
                to="/campaign-create"
                className="inline-flex items-center gap-2 rounded-full px-5 h-9 text-[13px] font-medium"
                style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}`, color: C.accent }}
              >
                <Zap className="h-3.5 w-3.5" /> Create campaign
              </Link>
            </div>
          ) : (
            <>
              {/* Campaign selector + score filter */}
              <div className="flex flex-wrap items-center gap-3 mb-8 p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[9.5px] uppercase tracking-[0.28em] mb-1.5 font-medium" style={{ color: C.textFaint }}>
                    Matching against
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {campaigns.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCampaign(c)}
                        className="px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all"
                        style={{
                          background: selectedCampaign?.id === c.id ? "oklch(1 0 0 / 12%)" : "oklch(1 0 0 / 4%)",
                          border: `1px solid ${selectedCampaign?.id === c.id ? "oklch(1 0 0 / 28%)" : C.border}`,
                          color: selectedCampaign?.id === c.id ? C.textPrimary : C.textMuted,
                        }}
                      >
                        {c.title}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="text-[9.5px] uppercase tracking-[0.28em] mb-1.5 font-medium" style={{ color: C.textFaint }}>
                    Min. score
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 50, 70, 85].map((s) => (
                      <button
                        key={s}
                        onClick={() => setMinScore(s)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                        style={{
                          background: minScore === s ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 4%)",
                          border: `1px solid ${minScore === s ? "oklch(1 0 0 / 25%)" : C.border}`,
                          color: minScore === s ? C.textPrimary : C.textMuted,
                        }}
                      >
                        {s === 0 ? "All" : `${s}%+`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tier summary */}
              {scored.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                  {[
                    { label: "Best Fit",     count: tierCounts.best,     threshold: "90%+" },
                    { label: "Strong Fit",   count: tierCounts.strong,   threshold: "75–89%" },
                    { label: "Good Fit",     count: tierCounts.good,     threshold: "55–74%" },
                    { label: "Possible Fit", count: tierCounts.possible, threshold: "< 55%" },
                  ].map(({ label, count, threshold }) => (
                    <div
                      key={label}
                      className="rounded-xl p-3 text-center"
                      style={{ background: C.surface, border: `1px solid ${C.border}` }}
                    >
                      <div className="font-display text-2xl font-bold mb-0.5" style={{ color: C.textPrimary }}>{count}</div>
                      <div className="text-[10.5px] font-medium" style={{ color: C.textMuted }}>{label}</div>
                      <div className="text-[10px]" style={{ color: C.textFaint }}>{threshold}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Creator list */}
              {scored.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <p className="text-[1rem] mb-2" style={{ color: C.textMuted }}>No creators match at {minScore}%+.</p>
                  <button
                    onClick={() => setMinScore(0)}
                    className="text-[13px] transition-colors"
                    style={{ color: C.textFaint, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.accent; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textFaint; }}
                  >
                    Lower the threshold →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {scored.map(({ creator, breakdown }, i) => (
                    <CreatorMatchCard
                      key={creator.id}
                      creator={creator}
                      breakdown={breakdown}
                      rank={i + 1}
                      campaign={selectedCampaign}
                      onMessage={handleMessage}
                    />
                  ))}
                </div>
              )}

              {/* Link to full creator search */}
              {scored.length > 0 && (
                <div className="mt-8 pt-6 text-center" style={{ borderTop: `1px solid ${C.border}` }}>
                  <p className="text-[13px] mb-3" style={{ color: C.textFaint }}>
                    Want to search with custom filters?
                  </p>
                  <Link
                    to="/find-creators"
                    className="inline-flex items-center gap-2 text-[13px] font-medium"
                    style={{ color: C.accent }}
                  >
                    Open Find Creators <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* Messaging overlay */}
      {messaging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "oklch(0 0 0 / 60%)" }}>
          <div className="rounded-2xl px-8 py-6 text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <p className="text-[14px]" style={{ color: C.textSecondary }}>Opening conversation…</p>
          </div>
        </div>
      )}
    </div>
  );
}
