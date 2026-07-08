import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Bookmark, BookmarkCheck, ArrowUpRight, X, Search,
  MapPin, Users, Calendar, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import type { Campaign, CompensationType } from "@/types/campaign";
import { formatBudget, compensationColor, COMPENSATION_LABELS } from "@/types/campaign";
import { computeMatchScore, type CreatorInput } from "@/lib/matchScore";
import { MatchScoreBadge, MatchScoreBreakdownPanel } from "@/components/ui/MatchScoreBadge";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({ meta: [{ title: "Saved Opportunities — MRKT" }] }),
  component: SavedPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Comp pill ────────────────────────────────────────────────────────────────

function CompPill({ type }: { type: CompensationType }) {
  const c = compensationColor(type);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
      style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {COMPENSATION_LABELS[type]}
    </span>
  );
}

// ─── Apply modal ──────────────────────────────────────────────────────────────

function ApplyModal({
  campaign, onClose, onSubmit, submitting,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSubmit: (note: string) => void;
  submitting: boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 75%)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden modal-in"
        style={{ background: "oklch(0.09 0 0)", border: `1px solid oklch(1 0 0 / 14%)`, boxShadow: "0 24px 64px oklch(0 0 0 / 70%)" }}
      >
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] mb-1" style={{ color: C.faint }}>{campaign.business_name}</div>
              <h2 className="font-display text-[1.1rem] font-bold" style={{ color: C.text }}>{campaign.title}</h2>
            </div>
            <button onClick={onClose} className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ background: C.surface, color: C.muted }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.24em] mb-2 font-medium" style={{ color: C.faint }}>
              Cover note <span style={{ color: C.muted }}>(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tell the brand why you're a great fit…"
              rows={4}
              className="w-full rounded-xl px-4 py-3 text-[13px] leading-relaxed resize-none outline-none"
              style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.border}`, color: C.text }}
            />
            <div className="text-right mt-1 text-[10px]" style={{ color: C.faint }}>{note.length}/500</div>
          </div>
          <div className="rounded-xl px-4 py-3 text-[11.5px]" style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid oklch(1 0 0 / 18%)`, color: C.muted }}>
            Your creator profile, audience, platforms, and portfolio will be shared with this brand.
          </div>
          <div className="flex gap-2.5">
            <button onClick={onClose} className="flex-1 rounded-full h-10 text-[13px] font-medium transition-all" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted }}>Cancel</button>
            <button onClick={() => onSubmit(note)} disabled={submitting} className="flex-1 btn-primary rounded-full h-10 text-[13px] font-medium inline-flex items-center justify-center gap-2">
              {submitting ? "Submitting…" : <>Submit application <ArrowUpRight className="h-3.5 w-3.5" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Saved Campaign Card ──────────────────────────────────────────────────────

function SavedCard({
  campaign, onUnsave, onApply, applied, breakdown,
}: {
  campaign: Campaign;
  onUnsave: (id: string) => void;
  onApply: (c: Campaign) => void;
  applied: boolean;
  breakdown: import("@/lib/matchScore").MatchScoreBreakdown;
}) {
  const budget = formatBudget(campaign);
  const posted = new Date(campaign.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div
      className="card-lift rounded-2xl overflow-hidden flex flex-col"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      {/* Header */}
      <div
        className="px-5 pt-4 pb-3.5 flex items-center justify-between gap-2"
        style={{ borderBottom: `1px solid ${C.border}`, background: campaign.compensation_type === "paid" ? "oklch(1 0 0 / 4%)" : "transparent" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <CompPill type={campaign.compensation_type} />
          {campaign.compensation_type === "paid" && (
            <span className="font-display text-[15px] font-bold" style={{ color: C.text }}>{budget}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MatchScoreBadge score={breakdown.total} showLabel />
          <button
            onClick={() => onUnsave(campaign.id)}
            className="h-7 w-7 rounded-full flex items-center justify-center transition-all duration-150"
            style={{ background: "oklch(1 0 0 / 12%)", border: `1px solid oklch(1 0 0 / 30%)`, color: C.chrome }}
            title="Remove from saved"
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 flex-1 flex flex-col">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase tracking-[0.24em] font-medium" style={{ color: C.faint }}>{campaign.business_name}</span>
            {campaign.business_industry && (
              <><span style={{ color: C.faint }}>·</span><span className="text-[10px]" style={{ color: C.faint }}>{campaign.business_industry}</span></>
            )}
          </div>
          <h3 className="font-display text-[1.1rem] font-bold tracking-tight leading-snug" style={{ color: C.text }}>{campaign.title}</h3>
          {campaign.product_service && (
            <p className="text-[11.5px] mt-0.5" style={{ color: C.muted }}>{campaign.product_service}</p>
          )}
        </div>

        {campaign.description && (
          <p className="text-[12.5px] leading-relaxed line-clamp-2 flex-1" style={{ color: C.muted }}>{campaign.description}</p>
        )}

        {campaign.required_platforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {campaign.required_platforms.map((p) => (
              <span key={p} className="text-[10px] uppercase tracking-[0.16em] rounded-full px-2.5 py-0.5 font-medium" style={{ background: C.borderFaint, color: C.chrome, border: `1px solid ${C.borderSubtle}` }}>{p}</span>
            ))}
            {campaign.required_niches.slice(0, 2).map((n) => (
              <span key={n} className="text-[10px] rounded-full px-2.5 py-0.5" style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}` }}>{n}</span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: C.faint }}>
          {campaign.required_country && <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{campaign.required_country}</span>}
          {campaign.min_followers && (
            <span className="flex items-center gap-1"><Users className="h-2.5 w-2.5" />{campaign.min_followers >= 1000 ? `${(campaign.min_followers / 1000).toFixed(0)}K+` : `${campaign.min_followers}+`} followers</span>
          )}
          {campaign.deadline && (
            <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />Due {new Date(campaign.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          )}
          <span className="ml-auto" style={{ color: "oklch(1 0 0 / 20%)" }}>Posted {posted}</span>
        </div>

        <MatchScoreBreakdownPanel breakdown={breakdown} />

        <div className="flex items-center gap-2.5 pt-1">
          {applied ? (
            <div className="flex-1 inline-flex items-center justify-center gap-2 rounded-full h-9 text-[13px] font-medium" style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.border}`, color: C.muted }}>
              Applied ✓
            </div>
          ) : (
            <button
              onClick={() => onApply(campaign)}
              className="flex-1 btn-primary inline-flex items-center justify-center gap-2 rounded-full h-9 text-[13px]"
            >
              Apply <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
          <Link
            to={`/campaigns/${campaign.id}` as "/"}
            className="inline-flex items-center justify-center rounded-full px-4 h-9 text-[13px] shrink-0 transition-all"
            style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.border}`, color: C.muted }}
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SavedPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [campaigns,       setCampaigns]       = useState<Campaign[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [creatorProfile,  setCreatorProfile]  = useState<CreatorInput | null>(null);
  const [appliedIds,      setAppliedIds]      = useState<Set<string>>(new Set());
  const [applyTarget,     setApplyTarget]     = useState<Campaign | null>(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [hasProfile,      setHasProfile]      = useState(true);
  const [search,          setSearch]          = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const [profileRes, creatorRes, savesRes, appliedRes] = await Promise.all([
          supabase.from("profiles").select("onboarding_path,account_type").eq("id", user.id).maybeSingle(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase.from("creator_profiles").select(
            "id,platforms,niche,categories,audience_location,location,location_city,location_country,follower_count,primary_language,accepts_paid,accepts_gifted,accepts_affiliate,preferred_content_types"
          ).eq("user_id", user.id).maybeSingle(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase
            .from("campaign_saves")
            .select("campaign_id, campaigns(*, deliverables:campaign_deliverables(*))")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase.from("campaign_applications").select("campaign_id").eq("user_id", user.id),
        ]);

        // Gate: redirect businesses
        const p = profileRes.data;
        const isCreator = p?.onboarding_path === "creator" || p?.account_type === "creator";
        if (!isCreator) { navigate({ to: "/find-creators" }); return; }

        setHasProfile(!!creatorRes?.data);
        if (creatorRes?.data) setCreatorProfile(creatorRes.data as CreatorInput);

        // Pull campaigns from the joined saves
        const saved: Campaign[] = ((savesRes.data ?? []) as unknown as Array<{ campaigns: Campaign | null }>)
          .map((row) => row.campaigns)
          .filter(Boolean) as Campaign[];
        setCampaigns(saved);

        const applied: Array<{ campaign_id: string }> = appliedRes.data ?? [];
        setAppliedIds(new Set(applied.map((r) => r.campaign_id)));
      } catch {
        toast.error("Could not load saved opportunities.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      c.business_name.toLowerCase().includes(q) ||
      c.required_niches.some((n) => n.toLowerCase().includes(q))
    );
  }, [campaigns, search]);

  // Match scores
  const scored = useMemo(() => {
    return filtered.map((c) => ({
      campaign: c,
      breakdown: creatorProfile
        ? computeMatchScore(creatorProfile, {
            required_platforms: c.required_platforms ?? [],
            required_niches:    c.required_niches ?? [],
            business_industry:  c.business_industry,
            required_country:   c.required_country,
            required_language:  c.required_language,
            min_followers:      c.min_followers,
            compensation_type:  c.compensation_type,
            deliverables:       c.deliverables,
          })
        : { total: 0, platform: 0, niche: 0, audience: 0, location: 0, requirements: 0 } as import("@/lib/matchScore").MatchScoreBreakdown,
    }));
  }, [filtered, creatorProfile]);

  async function handleUnsave(id: string) {
    // Optimistic removal
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from("campaign_saves").delete().eq("user_id", user!.id).eq("campaign_id", id);
      toast("Removed from saved.");
    } catch {
      toast.error("Could not remove. Please try again.");
      // Re-fetch to restore
    }
  }

  async function submitApplication(note: string) {
    if (!user || !applyTarget) return;
    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cp } = await supabase.from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!cp) { toast.error("Creator profile not found."); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("campaign_applications").insert({
        creator_profile_id: cp.id,
        campaign_id:        applyTarget.id,
        user_id:            user.id,
        campaign_brand:     applyTarget.business_name,
        campaign_title:     applyTarget.title,
        status:             "pending",
        cover_note:         note.trim() || null,
      });
      if (error) throw error;
      setAppliedIds((prev) => new Set(prev).add(applyTarget.id));
      toast.success("Application submitted! Track it in My Applications.");
      setApplyTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  function openApply(campaign: Campaign) {
    if (!hasProfile) { toast.error("Complete your creator profile before applying."); return; }
    if (appliedIds.has(campaign.id)) { toast("You've already applied to this campaign."); return; }
    setApplyTarget(campaign);
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col overflow-hidden" style={{ background: "#000" }}>
        <div className="h-[52px] shrink-0" style={{ borderBottom: `1px solid ${C.border}` }} />
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-5xl mx-auto px-6 py-10 space-y-4">
            <div className="mb-8 space-y-3">
              <div className="skeleton" style={{ height: 30, width: "35%" }} />
              <div className="skeleton" style={{ height: 14, width: "55%" }} />
            </div>
            {[1, 2].map(i => (
              <div key={i} className="rounded-2xl" style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.border}`, height: 200 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#000", color: C.text }}>

      {/* Top bar */}
      <div className="h-[52px] px-6 flex items-center justify-between shrink-0 gap-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: C.faint }}>MRKT Connect</span>
          <span className="text-[12px]" style={{ color: C.faint }}>/</span>
          <span className="text-[12px] font-medium" style={{ color: C.muted }}>Saved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5" style={{ color: C.chrome }} />
          <span className="text-[11px]" style={{ color: C.faint }}>
            {campaigns.length} saved
          </span>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-10">
            <div className="text-[9.5px] uppercase tracking-[0.32em] mb-4 font-medium" style={{ color: C.faint }}>
              MRKT Connect
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.04em] leading-[1.06] mb-3">
              Saved opportunities.
            </h1>
            <p className="text-[1rem] font-light leading-relaxed" style={{ color: C.muted }}>
              Campaigns you've bookmarked. Apply when you're ready — or{" "}
              <Link to="/opportunities" style={{ color: C.accent, textDecoration: "none" }}>discover more</Link>.
            </p>
          </div>

          {/* Empty state */}
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.border}` }}
              >
                <Bookmark className="h-7 w-7" style={{ color: "oklch(1 0 0 / 16%)" }} />
              </div>
              <p className="text-[1rem] font-medium mb-2" style={{ color: C.muted }}>
                No saved opportunities yet.
              </p>
              <p className="text-[13px] mb-6" style={{ color: C.faint }}>
                Bookmark campaigns from the feed to review and apply later.
              </p>
              <Link
                to="/opportunities"
                className="inline-flex items-center gap-2 rounded-full px-5 h-9 text-[13px] font-medium"
                style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}`, color: C.accent }}
              >
                <Zap className="h-3.5 w-3.5" /> Browse opportunities
              </Link>
            </div>
          ) : (
            <>
              {/* Search */}
              {campaigns.length > 3 && (
                <div className="flex items-center gap-2.5 rounded-xl px-3.5 h-10 mb-6" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <Search className="h-3.5 w-3.5 shrink-0" style={{ color: C.faint }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search saved campaigns…"
                    className="flex-1 bg-transparent text-[13px] outline-none"
                    style={{ color: C.text }}
                  />
                  {search && <button onClick={() => setSearch("")}><X className="h-3 w-3" style={{ color: C.faint }} /></button>}
                </div>
              )}

              {/* Grid */}
              {scored.length === 0 ? (
                <div className="text-center py-12" style={{ color: C.muted }}>No results for "{search}"</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {scored.map(({ campaign, breakdown }) => (
                    <SavedCard
                      key={campaign.id}
                      campaign={campaign}
                      onUnsave={handleUnsave}
                      onApply={openApply}
                      applied={appliedIds.has(campaign.id)}
                      breakdown={breakdown}
                    />
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {applyTarget && (
        <ApplyModal
          campaign={applyTarget}
          onClose={() => setApplyTarget(null)}
          onSubmit={submitApplication}
          submitting={submitting}
        />
      )}
    </div>
  );
}
