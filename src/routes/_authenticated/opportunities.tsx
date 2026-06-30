import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  ArrowUpRight, Bookmark, BookmarkCheck, Calendar, ChevronDown,
  Filter, MapPin, Search, Users, X,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import type { Campaign, CompensationType } from "@/types/campaign";
import { formatBudget, compensationColor, COMPENSATION_LABELS } from "@/types/campaign";
import { computeMatchScore, type CreatorInput, type CreatorTrustScore } from "@/lib/matchScore";
import { MatchScoreBadge } from "@/components/ui/MatchScoreBadge";
import { MatchExplanation, type MatchExplanationData } from "@/components/ui/MatchExplanation";
import { trackMarketplaceEvent } from "@/lib/marketplaceEvents";
import { sendNotification } from "@/lib/notificationService";

export const Route = createFileRoute("/_authenticated/opportunities")({
  head: () => ({ meta: [{ title: "Opportunities — MRKT" }] }),
  component: OpportunitiesPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// MatchScore and MatchScoreBadge are imported from @/components/ui/MatchScoreBadge

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

// ─── Campaign card ────────────────────────────────────────────────────────────

function CampaignCard({
  campaign, saved, onSave, onApply, applying, breakdown, successProb, explanation, onView,
}: {
  campaign: Campaign;
  saved: boolean;
  onSave: (id: string) => void;
  onApply: (campaign: Campaign) => void;
  applying: boolean;
  breakdown: import("@/lib/matchScore").MatchScoreBreakdown;
  successProb: number;
  explanation?: MatchExplanationData | null;
  onView?: (campaignId: string) => void;
}) {
  const isPaid = campaign.compensation_type === "paid";
  const budget = formatBudget(campaign);
  const posted = new Date(campaign.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  // Single source of truth: server score when cached, client score otherwise.
  // Both badge and bar must read from this value.
  const displayScore = explanation?.score ?? breakdown.total;

  return (
    <div
      className="card-lift rounded-[22px] overflow-hidden flex flex-col"
      style={{
        background: "oklch(0.085 0 0)",
        border:     "1px solid oklch(1 0 0 / 7%)",
        boxShadow:  "inset 0 1px 0 oklch(1 0 0 / 7%), 0 4px 20px oklch(0 0 0 / 45%)",
      }}
    >
      {/* Card header: earnings + match score + save */}
      <div
        className="px-5 pt-4 pb-3.5 flex items-center justify-between gap-2"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <CompPill type={campaign.compensation_type} />
          {isPaid && (
            <span style={{ fontFamily: "'Inter Tight', 'Inter', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: "-0.04em", color: "oklch(0.62 0.12 158)" }}>
              {budget}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MatchScoreBadge score={displayScore} showLabel />
          <button
            onClick={() => onSave(campaign.id)}
            className="h-7 w-7 rounded-full flex items-center justify-center transition-all duration-150"
            style={{
              background: saved ? "oklch(0.62 0.12 158 / 12%)" : "oklch(1 0 0 / 5%)",
              border: `1px solid ${saved ? "oklch(0.62 0.12 158 / 28%)" : "oklch(1 0 0 / 10%)"}`,
              color: saved ? "oklch(0.62 0.12 158)" : "oklch(1 0 0 / 28%)",
            }}
            title={saved ? "Saved" : "Save opportunity"}
          >
            {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 flex-1 flex flex-col">
        {/* Business + title */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.26em", color: "oklch(1 0 0 / 30%)" }}>
              {campaign.business_name}
            </span>
            {campaign.business_industry && (
              <span style={{ fontSize: 10, color: "oklch(1 0 0 / 20%)" }}>· {campaign.business_industry}</span>
            )}
            {campaign.is_beta_campaign && (
              <span
                style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em",
                  color: "oklch(0.78 0.14 76)", background: "oklch(0.78 0.14 76 / 10%)",
                  border: "1px solid oklch(0.78 0.14 76 / 25%)", borderRadius: 99,
                  padding: "1px 7px",
                }}
              >
                Beta Partner
              </span>
            )}
          </div>
          <h3 style={{ fontFamily: "'Inter Tight', 'Inter', sans-serif", fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.25, color: C.textPrimary }}>
            {campaign.title}
          </h3>
          {campaign.product_service && (
            <p style={{ fontSize: 11.5, marginTop: 3, color: "oklch(1 0 0 / 30%)" }}>{campaign.product_service}</p>
          )}
        </div>

        {/* Description */}
        {campaign.description && (
          <p className="text-[12.5px] leading-relaxed line-clamp-2 flex-1" style={{ color: C.muted }}>
            {campaign.description}
          </p>
        )}

        {/* Deliverables */}
        {campaign.deliverables && campaign.deliverables.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {campaign.deliverables.slice(0, 4).map((d) => (
              <span
                key={d.id}
                className="text-[10px] rounded-md px-2 py-0.5 font-medium"
                style={{ background: "oklch(1 0 0 / 5%)", color: "oklch(1 0 0 / 45%)", border: `1px solid ${C.border}` }}
              >
                {d.quantity > 1 ? `${d.quantity}× ` : ""}{d.platform} {d.content_type}
              </span>
            ))}
            {campaign.deliverables.length > 4 && (
              <span className="text-[10px]" style={{ color: C.faint }}>+{campaign.deliverables.length - 4} more</span>
            )}
          </div>
        )}

        {/* Platforms */}
        {campaign.required_platforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {campaign.required_platforms.map((p) => (
              <span
                key={p}
                className="text-[10px] uppercase tracking-[0.16em] rounded-full px-2.5 py-0.5 font-medium"
                style={{ background: C.borderFaint, color: C.chrome, border: `1px solid ${C.borderSubtle}` }}
              >
                {p}
              </span>
            ))}
            {campaign.required_niches.slice(0, 2).map((n) => (
              <span
                key={n}
                className="text-[10px] rounded-full px-2.5 py-0.5"
                style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}` }}
              >
                {n}
              </span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: C.faint }}>
          {campaign.business_location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" />
              {campaign.required_country ? campaign.required_country : "Remote OK"}
            </span>
          )}
          {campaign.min_followers && (
            <span className="flex items-center gap-1">
              <Users className="h-2.5 w-2.5" />
              {campaign.min_followers >= 1000
                ? `${(campaign.min_followers / 1000).toFixed(0)}K+`
                : `${campaign.min_followers}+`} followers
            </span>
          )}
          {campaign.deadline && (
            <span className="flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" />
              Due {new Date(campaign.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          )}
          <span className="ml-auto" style={{ color: "oklch(1 0 0 / 20%)" }}>Posted {posted}</span>
        </div>

        {/* Match explanation — server-side when available, client breakdown otherwise */}
        {explanation ? (
          <MatchExplanation data={explanation} />
        ) : displayScore > 0 && (
          <div
            className="rounded-xl px-3.5 py-2.5 flex items-center justify-between"
            style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.border}` }}
          >
            <span className="text-[11px]" style={{ color: C.faint }}>Match score</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 6%)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${displayScore}%`,
                    background: displayScore >= 65
                      ? "oklch(0.62 0.12 158)"
                      : displayScore >= 45
                        ? "oklch(0.72 0.10 224)"
                        : "oklch(0.70 0.08 68)",
                  }}
                />
              </div>
              <span
                className="text-[12px] font-semibold tabular-nums"
                style={{
                  color: displayScore >= 65
                    ? "oklch(0.62 0.12 158)"
                    : displayScore >= 45
                      ? "oklch(0.72 0.10 224)"
                      : "oklch(0.70 0.08 68)",
                }}
              >
                {displayScore}%
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={() => onApply(campaign)}
            disabled={applying}
            className="flex-1 btn-primary inline-flex items-center justify-center gap-2 rounded-full h-9 text-[13px]"
          >
            {applying ? "Submitting…" : "Apply"} {!applying && <ArrowUpRight className="h-3.5 w-3.5" />}
          </button>
          <Link
            to={`/campaigns/${campaign.id}` as "/"}
            onClick={() => onView?.(campaign.id)}
            className="inline-flex items-center justify-center rounded-full px-4 h-9 text-[13px] shrink-0 transition-all duration-150"
            style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.border}`, color: C.muted }}
          >
            View
          </Link>
        </div>
      </div>
    </div>
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
              <div className="text-[10px] uppercase tracking-[0.24em] mb-1" style={{ color: C.faint }}>
                {campaign.business_name}
              </div>
              <h2 className="font-display text-[1.1rem] font-bold" style={{ color: C.text }}>
                {campaign.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all"
              style={{ background: C.surface, color: C.muted }}
            >
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
              placeholder="Tell the brand why you're a great fit. Mention your audience, relevant experience, or creative ideas…"
              rows={4}
              className="w-full rounded-xl px-4 py-3 text-[13px] leading-relaxed resize-none outline-none"
              style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.border}`, color: C.text }}
            />
            <div className="text-right mt-1 text-[10px]" style={{ color: C.faint }}>
              {note.length}/500
            </div>
          </div>

          <div
            className="rounded-xl px-4 py-3 text-[11.5px]"
            style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid oklch(1 0 0 / 18%)`, color: C.muted }}
          >
            Your creator profile — including your audience, platforms, and portfolio — will be shared with this brand.
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 rounded-full h-10 text-[13px] font-medium transition-all"
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(note)}
              disabled={submitting}
              className="flex-1 btn-primary rounded-full h-10 text-[13px] font-medium inline-flex items-center justify-center gap-2"
            >
              {submitting ? "Submitting…" : <>Submit application <ArrowUpRight className="h-3.5 w-3.5" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "X", "LinkedIn", "Pinterest"];
const INDUSTRY_OPTIONS = [
  "Fashion & Apparel", "Beauty & Skincare", "Food & Beverage",
  "Health & Fitness", "Technology", "Travel & Hospitality",
  "Entertainment", "Home & Lifestyle", "Finance", "Education",
  "Retail & E-commerce", "Other",
];
const BUDGET_OPTIONS = [
  { label: "Any",        min: 0,    max: Infinity },
  { label: "Under $500", min: 0,    max: 500      },
  { label: "$500–2K",    min: 500,  max: 2000     },
  { label: "$2K–5K",     min: 2000, max: 5000     },
  { label: "$5K+",       min: 5000, max: Infinity },
];

interface Filters {
  platforms: string[];
  industry: string;
  budgetIdx: number;
  remote: "all" | "remote" | "local";
  compType: CompensationType | "all";
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  platforms: [], industry: "", budgetIdx: 0,
  remote: "all", compType: "all", search: "",
};

function FilterBar({
  filters, onChange, count, total,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  count: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);

  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function togglePlatform(p: string) {
    const has = filters.platforms.includes(p);
    onChange({ ...filters, platforms: has ? filters.platforms.filter((x) => x !== p) : [...filters.platforms, p] });
  }

  const activeCount = [
    filters.platforms.length > 0,
    filters.industry !== "",
    filters.budgetIdx !== 0,
    filters.remote !== "all",
    filters.compType !== "all",
  ].filter(Boolean).length;

  return (
    <div className="mb-8">
      {/* Search + filter toggle */}
      <div className="flex gap-2.5 mb-3">
        <div className="flex-1 flex items-center gap-2.5 rounded-xl px-3.5 h-10" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: C.faint }} />
          <input
            value={filters.search}
            onChange={(e) => toggle("search", e.target.value)}
            placeholder="Search campaigns, brands, niches…"
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: C.text }}
          />
          {filters.search && (
            <button onClick={() => toggle("search", "")}><X className="h-3 w-3" style={{ color: C.faint }} /></button>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl px-3.5 h-10 text-[12px] font-medium transition-all"
          style={{
            background: open || activeCount > 0 ? "oklch(1 0 0 / 8%)" : C.surface,
            border: `1px solid ${open || activeCount > 0 ? "oklch(1 0 0 / 20%)" : C.border}`,
            color: activeCount > 0 ? C.text : C.muted,
          }}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters {activeCount > 0 && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: C.accent, color: "oklch(1 0 0 / 95%)" }}>{activeCount}</span>}
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Results row */}
      <div className="flex items-center gap-3">
        <span className="text-[11.5px]" style={{ color: C.faint }}>
          Showing <span style={{ color: C.text, fontWeight: 600 }}>{count}</span> of {total} campaigns
        </span>
        {activeCount > 0 && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-[11px] transition-colors"
            style={{ color: C.faint }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.faint; }}
          >
            Clear all ×
          </button>
        )}
      </div>

      {/* Expanded filter panel */}
      {open && (
        <div
          className="mt-3 rounded-2xl p-5 space-y-5"
          style={{ background: C.surface, border: `1px solid ${C.borderSubtle}` }}
        >
          {/* Compensation type */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: C.textTertiary, marginBottom: 10 }}>
              Compensation
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "paid", "gifted", "affiliate", "revenue_share"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => toggle("compType", v)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                  style={{
                    background: filters.compType === v ? C.accentMuted : "transparent",
                    border: `1px solid ${filters.compType === v ? C.aiBlueBorder : C.borderNormal}`,
                    color: filters.compType === v ? C.aiBlue : C.textTertiary,
                  }}
                >
                  {v === "all" ? "All types" : v === "revenue_share" ? "Rev. share" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: C.textTertiary, marginBottom: 10 }}>
              Budget
            </div>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map((b, i) => (
                <button
                  key={b.label}
                  onClick={() => toggle("budgetIdx", i)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                  style={{
                    background: filters.budgetIdx === i ? C.accentMuted : "transparent",
                    border: `1px solid ${filters.budgetIdx === i ? C.aiBlueBorder : C.borderNormal}`,
                    color: filters.budgetIdx === i ? C.aiBlue : C.textTertiary,
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: C.textTertiary, marginBottom: 10 }}>
              Platform
            </div>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                  style={{
                    background: filters.platforms.includes(p) ? C.accentMuted : "transparent",
                    border: `1px solid ${filters.platforms.includes(p) ? C.aiBlueBorder : C.borderNormal}`,
                    color: filters.platforms.includes(p) ? C.aiBlue : C.textTertiary,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Industry */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: C.textTertiary, marginBottom: 10 }}>
              Industry
            </div>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_OPTIONS.map((ind) => (
                <button
                  key={ind}
                  onClick={() => toggle("industry", filters.industry === ind ? "" : ind)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                  style={{
                    background: filters.industry === ind ? C.accentMuted : "transparent",
                    border: `1px solid ${filters.industry === ind ? C.aiBlueBorder : C.borderNormal}`,
                    color: filters.industry === ind ? C.aiBlue : C.textTertiary,
                  }}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Remote / Local */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: C.textTertiary, marginBottom: 10 }}>
              Location requirement
            </div>
            <div className="flex gap-2">
              {(["all", "remote", "local"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => toggle("remote", v)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                  style={{
                    background: filters.remote === v ? C.accentMuted : "transparent",
                    border: `1px solid ${filters.remote === v ? C.aiBlueBorder : C.borderNormal}`,
                    color: filters.remote === v ? C.aiBlue : C.textTertiary,
                  }}
                >
                  {v === "all" ? "All" : v === "remote" ? "Remote / Worldwide" : "Location specific"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function OpportunitiesPage() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const [campaigns, setCampaigns]           = useState<Campaign[]>([]);
  const [loading, setLoading]               = useState(true);
  const [role, setRole]                     = useState<"creator" | "business" | null>(null);
  const [hasCreatorProfile, setHasCreatorProfile] = useState<boolean | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorInput | null>(null);
  const [trustScore, setTrustScore]         = useState<CreatorTrustScore | null>(null);
  const [savedIds, setSavedIds]             = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds]         = useState<Set<string>>(new Set());
  const [applyTarget, setApplyTarget]       = useState<Campaign | null>(null);
  const [submitting, setSubmitting]         = useState(false);
  const [savePending, setSavePending]       = useState<Set<string>>(new Set());
  const [filters, setFilters]               = useState<Filters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode]             = useState<"all" | "saved">("all");
  // Server-side match explanations keyed by campaign_id
  const [serverExplanations, setServerExplanations] = useState<Record<string, MatchExplanationData>>({});

  // ── Load all data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const [profileRes, creatorRes, campaignRes, appliedRes, savedRes] = await Promise.all([
          supabase.from("profiles").select("onboarding_path,account_type").eq("id", user.id).maybeSingle(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("creator_profiles").select(
            "id,platforms,niche,categories,audience_location,location,location_city,location_country," +
            "follower_count,primary_language,accepts_paid,accepts_gifted,accepts_affiliate,preferred_content_types"
          ).eq("user_id", user.id).maybeSingle(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from("campaigns")
            .select("*, deliverables:campaign_deliverables(*)")
            .eq("is_published", true)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(100),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from("campaign_applications")
            .select("campaign_id,status")
            .eq("user_id", user.id),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from("campaign_saves")
            .select("campaign_id")
            .eq("user_id", user.id),
        ]);

        const p = profileRes.data;
        const detectedRole =
          p?.onboarding_path === "creator" || p?.account_type === "creator"
            ? "creator" : "business";

        setRole(detectedRole);

        // Hard gate: businesses should not be on this page
        if (detectedRole === "business") {
          navigate({ to: "/find-creators" });
          return;
        }

        setHasCreatorProfile(!!creatorRes?.data);
        if (creatorRes?.data) setCreatorProfile(creatorRes.data as CreatorInput);
        setCampaigns(campaignRes.data ?? []);

        // Fetch trust score for success probability
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: ts } = await (supabase as any)
          .from("creator_trust_scores").select("*").eq("user_id", user.id).maybeSingle();
        if (ts) setTrustScore(ts as CreatorTrustScore);

        const appRows: Array<{ campaign_id: string; status: string }> = appliedRes.data ?? [];
        setAppliedIds(new Set(appRows.map((r) => r.campaign_id)));

        const saveRows: Array<{ campaign_id: string }> = savedRes.data ?? [];
        setSavedIds(new Set(saveRows.map((r) => r.campaign_id)));

        // Fetch server-side match scores from cache (non-blocking)
        const allCampaignIds = (campaignRes.data ?? []).map((c: { id: string }) => c.id);
        if (allCampaignIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from("match_score_cache")
            .select("campaign_id, score, success_probability, explanation_json, expires_at")
            .eq("creator_id", user.id)
            .in("campaign_id", allCampaignIds)
            .gt("expires_at", new Date().toISOString())
            .then(({ data }: { data: Array<{
              campaign_id: string;
              score: number;
              success_probability: number;
              explanation_json: MatchExplanationData;
              expires_at: string;
            }> | null }) => {
              if (!data) return;
              const map: Record<string, MatchExplanationData> = {};
              for (const row of data) {
                if (row.explanation_json) {
                  map[row.campaign_id] = {
                    ...row.explanation_json,
                    score: row.score,
                    success_probability: row.success_probability,
                  };
                }
              }
              setServerExplanations(map);
            });
        }

        // Track session view of opportunities page
        if (user) {
          trackMarketplaceEvent({
            actorUserId: user.id,
            eventType: "campaign_viewed",
            metadata: { context: "opportunities_page_load", count: allCampaignIds.length },
          });
        }
      } catch {
        toast.error("Could not load opportunities.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  // ── Filter logic ─────────────────────────────────────────────────────────────
  // Campaigns the creator has already applied to are hidden from this feed.
  // They move to /applications the moment Apply is submitted.
  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (appliedIds.has(c.id)) return false;  // already applied → belongs in /applications
      if (viewMode === "saved" && !savedIds.has(c.id)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !c.title.toLowerCase().includes(q) &&
          !c.business_name.toLowerCase().includes(q) &&
          !(c.business_industry ?? "").toLowerCase().includes(q) &&
          !c.required_niches.some((n) => n.toLowerCase().includes(q))
        ) return false;
      }
      if (filters.compType !== "all" && c.compensation_type !== filters.compType) return false;
      if (filters.platforms.length > 0 && !filters.platforms.some((p) => c.required_platforms.includes(p))) return false;
      if (filters.industry && (c.business_industry ?? "") !== filters.industry) return false;
      if (filters.remote === "remote" && c.required_country) return false;
      if (filters.remote === "local" && !c.required_country) return false;
      if (filters.budgetIdx !== 0) {
        const b = BUDGET_OPTIONS[filters.budgetIdx];
        const amt = c.compensation_amount_fixed ?? c.compensation_budget_max ?? c.compensation_budget_min ?? 0;
        if (c.compensation_type !== "paid" || amt < b.min || amt > b.max) return false;
      }
      return true;
    });
  }, [campaigns, filters, viewMode, savedIds, appliedIds]);

  // ── Match scores (computed once per filter change, sorted by score desc) ───────
  const scoredFiltered = useMemo(() => {
    if (!creatorProfile) {
      return filtered.map((c) => ({
        campaign: c,
        breakdown: { total: 0, platform: 0, niche: 0, audience: 0, location: 0, requirements: 0 } as import("@/lib/matchScore").MatchScoreBreakdown,
        successProb: 0,
      }));
    }
    return filtered
      .map((c) => {
        const breakdown = computeMatchScore(creatorProfile, {
          required_platforms: c.required_platforms ?? [],
          required_niches:    c.required_niches ?? [],
          business_industry:  c.business_industry,
          required_country:   c.required_country,
          required_language:  c.required_language,
          min_followers:      c.min_followers,
          compensation_type:  c.compensation_type,
          deliverables:       c.deliverables,
        }, trustScore);
        // Success probability: match score × 0.75 + trust bonus + small base
        const trustBonus = breakdown.trustModifier ? breakdown.trustModifier * 1.5 : 0;
        const successProb = Math.min(92, Math.max(8, Math.round(breakdown.total * 0.76 + trustBonus + 8)));
        return { campaign: c, breakdown, successProb };
      })
      .sort((a, b) => b.breakdown.total - a.breakdown.total);
  }, [filtered, creatorProfile, trustScore]);

  // ── Save — persisted to campaign_saves table ─────────────────────────────────
  async function handleSave(id: string) {
    if (!user || savePending.has(id)) return;
    setSavePending((p) => new Set(p).add(id));
    const isSaved = savedIds.has(id);
    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(id); else next.add(id);
      return next;
    });
    try {
      if (isSaved) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("campaign_saves").delete().eq("user_id", user.id).eq("campaign_id", id);
        toast("Removed from saved.");
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("campaign_saves").insert({ user_id: user.id, campaign_id: id });
        toast.success("Saved to your opportunities.");
        trackMarketplaceEvent({
          actorUserId: user.id,
          eventType: "opportunity_saved",
          campaignId: id,
        });
      }
    } catch {
      // Revert optimistic update on error
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(id); else next.delete(id);
        return next;
      });
      toast.error("Could not save. Please try again.");
    } finally {
      setSavePending((p) => { const next = new Set(p); next.delete(id); return next; });
    }
  }

  // ── Apply flow ───────────────────────────────────────────────────────────────
  function openApply(campaign: Campaign) {
    if (!hasCreatorProfile) {
      toast.error("Complete your creator profile before applying.");
      return;
    }
    if (appliedIds.has(campaign.id)) {
      toast("You've already applied to this campaign.");
      return;
    }
    setApplyTarget(campaign);
  }

  async function submitApplication(note: string) {
    if (!user || !applyTarget) return;
    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cp } = await (supabase as any)
        .from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!cp) { toast.error("Creator profile not found."); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("campaign_applications")
        .insert({
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
      trackMarketplaceEvent({
        actorUserId: user.id,
        eventType: "application_submitted",
        campaignId: applyTarget.id,
        creatorId: user.id,
        businessId: applyTarget.user_id,
        metadata: { cover_note_length: note.trim().length },
      });
      // Notify the business owner
      sendNotification({
        userId: applyTarget.user_id,
        notificationType: "new_application_received",
        data: {
          creator_name: user.email?.split("@")[0] ?? "A creator",
          campaign_title: applyTarget.title,
          campaign_id: applyTarget.id,
        },
        inApp: {
          title: "New application received",
          body: `Someone applied to ${applyTarget.title}.`,
          link: `/campaigns/${applyTarget.id}/applicants`,
        },
      });
      setApplyTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading || role === null) {
    return (
      <div style={{ minHeight: "100vh", background: C.canvas, overflowY: "auto" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 36px 80px" }}>
          <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 10 }}>
            <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 30, width: 200 }} />
          </div>
          <div className="space-y-3">
            <div className="mb-8 space-y-3">
              <div className="skeleton" style={{ height: 30, width: "40%" }} />
              <div className="skeleton" style={{ height: 14, width: "60%" }} />
            </div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.border}` }}>
                <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div className="skeleton" style={{ height: 18, width: 90, borderRadius: 99 }} />
                  <div className="skeleton" style={{ height: 20, width: 80, borderRadius: 99 }} />
                </div>
                <div className="p-5 space-y-3">
                  <div className="skeleton" style={{ height: 12, width: 120 }} />
                  <div className="skeleton" style={{ height: 22, width: "55%" }} />
                  <div className="flex gap-3">
                    <div className="skeleton" style={{ height: 12, width: 80 }} />
                    <div className="skeleton" style={{ height: 12, width: 60 }} />
                  </div>
                  <div className="skeleton" style={{ height: 34, width: 120, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, color: C.textPrimary, overflowY: "auto" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 36px 80px" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: C.accentMuted, border: `1px solid ${C.aiBlueBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={17} style={{ color: C.aiBlue }} />
            </div>
            <h1 style={{
              fontSize: "clamp(1.8rem, 2.5vw, 2.25rem)", fontWeight: 700,
              color: C.textPrimary, letterSpacing: "-0.04em", lineHeight: 1.05,
              fontFamily: "'Inter Tight', 'Inter', sans-serif",
            }}>
              {filtered.length > 0 ? `${filtered.length} campaigns open.` : "Opportunities"}
            </h1>
          </div>
          <p style={{ fontSize: 14, color: C.textTertiary }}>
            Brands actively looking for creators.{" "}
            <Link to="/applications" style={{ color: C.aiBlue, textDecoration: "none" }}>
              Track your applications →
            </Link>
          </p>
        </div>

          {/* No profile warning */}
          {hasCreatorProfile === false && (
            <div
              className="mb-6 rounded-2xl p-4 flex items-start justify-between gap-4"
              style={{ background: C.accentMuted, border: `1px solid ${C.aiBlueBorder}` }}
            >
              <div>
                <div className="text-[13px] font-semibold mb-1" style={{ color: C.text }}>
                  Complete your creator profile to apply.
                </div>
                <div className="text-[11.5px]" style={{ color: C.muted }}>
                  Brands review your profile when you apply. A complete profile gets more responses.
                </div>
              </div>
              <Link
                to="/creator-onboarding"
                className="inline-flex items-center gap-1.5 rounded-full px-4 h-8 text-[12px] shrink-0 font-medium"
                style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}`, color: C.accent }}
              >
                Build profile <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* View mode tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
            {(["all", "saved"] as const).map((mode) => {
              const isActive = viewMode === mode;
              const label = mode === "all"
                ? "All campaigns"
                : `Saved${savedIds.size > 0 ? ` (${savedIds.size})` : ""}`;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
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
                </button>
              );
            })}
          </div>

          <FilterBar
            filters={filters}
            onChange={setFilters}
            count={scoredFiltered.length}
            total={filtered.length}
          />

          {/* Campaign grid — sorted by match score (highest first) */}
          {scoredFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div style={{
                width: 52, height: 52, borderRadius: 16, marginBottom: 20,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "oklch(0.085 0 0)",
                border: "1px solid oklch(1 0 0 / 8%)",
                boxShadow: "inset 0 1px 0 oklch(1 0 0 / 7%)",
              }}>
                <Search className="h-5 w-5" style={{ color: "oklch(1 0 0 / 25%)" }} />
              </div>
              <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: "oklch(1 0 0 / 50%)", marginBottom: 6 }}>
                {filtered.length === 0 && appliedIds.size > 0
                  ? "You've applied to all available campaigns."
                  : "No campaigns match your filters."}
              </p>
              <p style={{ fontSize: 13, color: "oklch(1 0 0 / 25%)", marginBottom: 16 }}>
                {filtered.length === 0 && appliedIds.size > 0
                  ? "Check back soon — brands post new campaigns weekly."
                  : "Try adjusting your filters to see more results."}
              </p>
              {filters !== DEFAULT_FILTERS && (
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="inline-flex items-center gap-2 rounded-full px-4 h-8 text-[12px] font-medium transition-all duration-150"
                  style={{ background: "oklch(0.085 0 0)", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(1 0 0 / 45%)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 20%)"; (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 70%)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 10%)"; (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 45%)"; }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {scoredFiltered.map(({ campaign, breakdown, successProb }) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  saved={savedIds.has(campaign.id)}
                  onSave={handleSave}
                  onApply={openApply}
                  applying={false}
                  breakdown={breakdown}
                  successProb={successProb}
                  explanation={serverExplanations[campaign.id] ?? null}
                  onView={(id) => {
                    if (user) {
                      trackMarketplaceEvent({
                        actorUserId: user.id,
                        eventType: "campaign_viewed",
                        campaignId: id,
                      });
                    }
                  }}
                />
              ))}
            </div>
          )}

      </div>

      {/* Apply modal */}
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
