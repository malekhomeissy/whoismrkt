import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Calendar, Users, Zap, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

import { toast } from "sonner";
import type { Campaign, CompensationType } from "@/types/campaign";
import { formatBudget, compensationColor, COMPENSATION_LABELS } from "@/types/campaign";

export const Route = createFileRoute("/_authenticated/opportunities")({
  head: () => ({ meta: [{ title: "Opportunities — MRKT Connect" }] }),
  component: OpportunitiesPage,
});

// ─────────────────────────────────────────────────────────────
// Compensation pill
// ─────────────────────────────────────────────────────────────

function CompPill({ type }: { type: CompensationType }) {
  const c = compensationColor(type);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
      style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {COMPENSATION_LABELS[type]}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Campaign card
// ─────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onApply, applying }: {
  campaign: Campaign;
  onApply: (id: string) => void;
  applying: boolean;
}) {
  const budget = formatBudget(campaign);
  const isPaid = campaign.compensation_type === "paid";

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-150"
      style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 14%)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 8%)"; }}
    >
      {/* Compensation header — most visible */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-3"
        style={{ background: isPaid ? "oklch(0.72 0.14 152 / 5%)" : "transparent", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <CompPill type={campaign.compensation_type} />
        {isPaid && (
          <span className="font-display text-lg font-semibold" style={{ color: "oklch(1 0 0 / 88%)" }}>
            {budget}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Business + title */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] mb-1.5" style={{ color: "oklch(1 0 0 / 30%)" }}>
            {campaign.business_name}
          </div>
          <h3 className="font-display text-xl font-semibold tracking-tight leading-tight" style={{ color: "oklch(1 0 0 / 90%)" }}>
            {campaign.title}
          </h3>
          {campaign.product_service && (
            <div className="text-[12px] mt-1" style={{ color: "oklch(1 0 0 / 42%)" }}>{campaign.product_service}</div>
          )}
        </div>

        {/* Description */}
        {campaign.description && (
          <p className="text-[13px] leading-relaxed line-clamp-3" style={{ color: "oklch(1 0 0 / 52%)" }}>
            {campaign.description}
          </p>
        )}

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2">
          {campaign.required_platforms.map((p) => (
            <span key={p} className="text-[10px] uppercase tracking-[0.18em] rounded-full px-2.5 py-0.5" style={{ background: "oklch(1 0 0 / 5%)", color: "oklch(1 0 0 / 40%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              {p}
            </span>
          ))}
          {campaign.required_niches.map((n) => (
            <span key={n} className="text-[10px] uppercase tracking-[0.18em] rounded-full px-2.5 py-0.5" style={{ background: "oklch(1 0 0 / 5%)", color: "oklch(1 0 0 / 40%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              {n}
            </span>
          ))}
          {campaign.min_followers && (
            <span className="text-[10px] rounded-full px-2.5 py-0.5 flex items-center gap-1" style={{ background: "oklch(1 0 0 / 5%)", color: "oklch(1 0 0 / 40%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <Users className="h-2.5 w-2.5" /> {(campaign.min_followers / 1000).toFixed(0)}K+ followers
            </span>
          )}
          {campaign.deadline && (
            <span className="text-[10px] rounded-full px-2.5 py-0.5 flex items-center gap-1" style={{ background: "oklch(1 0 0 / 5%)", color: "oklch(1 0 0 / 40%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <Calendar className="h-2.5 w-2.5" /> {new Date(campaign.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => onApply(campaign.id)}
            disabled={applying}
            className="btn-primary inline-flex items-center gap-2 rounded-full px-5 h-9 text-sm flex-1 justify-center"
            title="Applications are in early access — your interest will be recorded"
          >
            {applying ? "Applying…" : "Express Interest"} {!applying && <ArrowUpRight className="h-3.5 w-3.5" />}
          </button>
          <Link
            to={`/campaigns/${campaign.id}` as "/"}
            className="inline-flex items-center justify-center rounded-full px-4 h-9 text-sm transition-colors duration-150"
            style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 9%)", color: "oklch(1 0 0 / 50%)" }}
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

type ProfileRole = "creator" | "business" | null;

function OpportunitiesPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns]     = useState<Campaign[]>([]);
  const [loading, setLoading]         = useState(true);
  const [role, setRole]               = useState<ProfileRole>(null);
  const [hasCreatorProfile, setHasCreatorProfile] = useState<boolean | null>(null);
  const [applying, setApplying]       = useState<string | null>(null);
  const [filter, setFilter]           = useState<CompensationType | "all">("all");

  useEffect(() => {
    if (!user) return;
    // Load role, creator profile existence, and campaigns in parallel
    Promise.all([
      supabase.from("profiles").select("onboarding_path,account_type").eq("id", user.id).maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("creator_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("campaigns")
        .select("*, deliverables:campaign_deliverables(*)")
        .eq("is_published", true)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
    ]).then(([profileRes, creatorRes, campaignRes]) => {
      const p = profileRes.data;
      setRole(
        p?.onboarding_path === "creator" || p?.account_type === "creator"
          ? "creator"
          : "business"
      );
      setHasCreatorProfile(!!creatorRes.data);
      setCampaigns(campaignRes.data ?? []);
      setLoading(false);
    });
  }, [user]);

  async function handleApply(campaignId: string) {
    if (!user) return;
    setApplying(campaignId);
    try {
      // Get or verify creator profile exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cp } = await (supabase as any)
        .from("creator_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cp) {
        toast.error("You need a creator profile to apply. Build your profile first.");
        setApplying(null);
        return;
      }

      // Check for duplicate application
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from("campaign_applications")
        .select("id")
        .eq("creator_profile_id", cp.id)
        .eq("campaign_id", campaignId)
        .maybeSingle();

      if (existing) {
        toast("You've already applied to this campaign.");
        setApplying(null);
        return;
      }

      const campaign = campaigns.find((c) => c.id === campaignId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("campaign_applications")
        .insert({
          creator_profile_id: cp.id,
          campaign_id:        campaignId,
          campaign_brand:     campaign?.business_name ?? "",
          campaign_title:     campaign?.title ?? "",
          status:             "pending",
        });

      if (error) throw error;
      toast.success("Application submitted! The brand will review your profile.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply.");
    } finally {
      setApplying(null);
    }
  }

  const filtered = filter === "all"
    ? campaigns
    : campaigns.filter((c) => c.compensation_type === filter);

  const FILTERS: Array<{ value: CompensationType | "all"; label: string }> = [
    { value: "all",          label: "All"           },
    { value: "paid",         label: "Paid"          },
    { value: "gifted",       label: "Gifted"        },
    { value: "affiliate",    label: "Affiliate"     },
    { value: "revenue_share",label: "Revenue Share" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 12%)" }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#000", color: "oklch(1 0 0 / 92%)" }}>

      {/* Page top bar */}
      <div className="h-[52px] px-6 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid oklch(1 0 0 / 9%)" }}>
        <div className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: "oklch(1 0 0 / 30%)" }}>Connect</span>
          <span className="text-[12px]" style={{ color: "oklch(1 0 0 / 30%)" }}>/</span>
          <span className="text-[12px] font-medium" style={{ color: "oklch(1 0 0 / 68%)" }}>Opportunities</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "oklch(1 0 0 / 30%)" }}>
          <Zap className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.14 152)" }} />
          <span className="text-[11px]">{filtered.length} open</span>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-12">

          {/* Page heading */}
          <div className="mb-10">
            <div className="text-[9.5px] uppercase tracking-[0.32em] mb-4 font-medium" style={{ color: "oklch(1 0 0 / 28%)" }}>
              MRKT Connect
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.04em] leading-[1.06] mb-3">
              Open campaigns.
            </h1>
            <p className="text-[1rem] font-light leading-relaxed" style={{ color: "oklch(1 0 0 / 44%)" }}>
              Brands actively looking for creators to collaborate with.
            </p>
          </div>

          {/* Business users: helpful redirect */}
          {role === "business" && (
            <div className="mb-8 rounded-2xl p-5 flex items-center justify-between gap-4" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <div>
                <div className="text-[13px] font-semibold mb-1" style={{ color: "oklch(1 0 0 / 80%)" }}>You're viewing this as a business.</div>
                <div className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 42%)" }}>This feed is designed for creators browsing collaboration opportunities.</div>
              </div>
              <Link to="/campaign-create" className="btn-primary inline-flex items-center gap-2 rounded-full px-5 h-9 text-sm shrink-0">
                Post Campaign <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* Creator: no profile yet — prompt to build one */}
          {role === "creator" && hasCreatorProfile === false && (
            <div className="mb-4 rounded-2xl p-4 flex items-start gap-4" style={{ background: "oklch(0.72 0.14 152 / 5%)", border: "1px solid oklch(0.72 0.14 152 / 20%)" }}>
              <div className="flex-1">
                <div className="text-[13px] font-semibold mb-1" style={{ color: "oklch(1 0 0 / 85%)" }}>Complete your creator profile to apply.</div>
                <div className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 45%)" }}>Brands review your profile when you apply. A complete profile gets more responses.</div>
              </div>
              <Link to="/creator-onboarding" className="inline-flex items-center gap-1.5 rounded-full px-4 h-8 text-[12px] shrink-0" style={{ background: "oklch(0.72 0.14 152 / 15%)", border: "1px solid oklch(0.72 0.14 152 / 30%)", color: "oklch(0.72 0.14 152)" }}>
                Build profile <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Coming soon notice — shown to all creators */}
          {role === "creator" && (
            <div className="mb-8 rounded-xl px-4 py-3 flex items-center gap-2.5" style={{ background: "oklch(0.78 0.12 60 / 6%)", border: "1px solid oklch(0.78 0.12 60 / 18%)" }}>
              <Zap className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.78 0.12 60)" }} />
              <span className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 45%)" }}>
                Full applications with contracts and messaging are <strong style={{ color: "oklch(1 0 0 / 62%)" }}>coming soon</strong>. Expressing interest now records your application.
              </span>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-none">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="shrink-0 px-4 py-2 rounded-full text-[12px] font-medium transition-all duration-150"
                style={{
                  background: filter === f.value ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 3%)",
                  border: `1px solid ${filter === f.value ? "oklch(0.84 0 0 / 45%)" : "oklch(1 0 0 / 9%)"}`,
                  color: filter === f.value ? "oklch(1 0 0 / 88%)" : "oklch(1 0 0 / 40%)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Campaign grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Search className="h-8 w-8 mb-4" style={{ color: "oklch(1 0 0 / 18%)" }} />
              <p className="text-[0.9375rem] mb-2" style={{ color: "oklch(1 0 0 / 40%)" }}>
                No campaigns match this filter.
              </p>
              <button onClick={() => setFilter("all")} className="text-sm mt-2" style={{ color: "oklch(1 0 0 / 30%)" }}>
                Show all →
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onApply={handleApply}
                  applying={applying === campaign.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
