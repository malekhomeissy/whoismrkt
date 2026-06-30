import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { trackMarketplaceEvent } from "@/lib/marketplaceEvents";
import { sendNotification } from "@/lib/notificationService";
import {
  ArrowLeft, CheckCircle2, Clock, ExternalLink, MapPin,
  MessageSquare, Star, Users, XCircle, Eye, Mail, Bookmark, BookmarkCheck,
  FileText, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { formatFollowers } from "@/types/creator";
import { computeMatchScore } from "@/lib/matchScore";
import { MatchScoreBadge, MatchScoreBreakdownPanel } from "@/components/ui/MatchScoreBadge";
import { findOrCreateConversation } from "@/lib/messaging";
import { VerifiedBadge } from "@/components/app/VerifiedBadge";
import { RatingsDisplay } from "@/components/app/RatingsDisplay";

export const Route = createFileRoute("/_authenticated/campaigns/$campaignId/applicants")({
  head: () => ({ meta: [{ title: "Applicants — MRKT" }] }),
  component: ApplicantsPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppStatus = "pending" | "reviewing" | "contacted" | "shortlisted" | "rejected" | "accepted";

interface Applicant {
  id: string; // application id
  campaign_id: string;
  status: AppStatus;
  cover_note: string | null;
  created_at: string;
  creator_profiles: {
    id: string;
    user_id: string | null;
    display_name: string;
    niche: string | null;
    categories: string[];
    platforms: string[];
    follower_count: number | null;
    profile_image_url: string | null;
    location: string | null;
    location_city: string | null;
    location_country: string | null;
    audience_location: string | null;
    primary_language: string | null;
    accepts_paid: boolean;
    accepts_gifted: boolean;
    accepts_affiliate: boolean;
    preferred_content_types: string[];
    is_verified?: boolean;
    avg_rating?: number | null;
    review_count?: number;
  };
}

interface CampaignForScore {
  required_platforms: string[];
  required_niches:    string[];
  business_industry:  string | null;
  required_country:   string | null;
  required_language:  string | null;
  min_followers:      number | null;
  compensation_type:  string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<AppStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: "Applied",      color: "oklch(1 0 0 / 50%)",   bg: "oklch(1 0 0 / 6%)"    },
  reviewing:   { label: "Reviewing",    color: C.amber,                bg: C.amberMuted            },
  contacted:   { label: "Contacted",    color: C.amber,                bg: C.amberMuted            },
  shortlisted: { label: "Shortlisted",  color: C.accent,               bg: C.accentMuted           },
  rejected:    { label: "Rejected",     color: C.red,                  bg: "oklch(0.52 0.15 24 / 10%)" },
  accepted:    { label: "Accepted",     color: C.green,                bg: C.greenMuted            },
};

function avatarBg(name: string) {
  const COLORS = [
    "oklch(0.78 0.005 0)",  "oklch(0.75 0.005 0)",
    "oklch(0.32 0 0)", "oklch(0.35 0 0)",
    "oklch(0.60 0.005 0)",  "oklch(0.30 0 0)",
  ];
  return COLORS[(name.charCodeAt(0) ?? 0) % COLORS.length];
}

// ─── Send contract modal V2 ───────────────────────────────────────────────────

export interface ContractV2Fields {
  title:               string;
  terms:               string;
  deliverables:        string;
  amount_cents:        number | null;
  currency:            string;
  due_date:            string;
  ownership_clause:    string;
  usage_rights:        string;
  cancellation_terms:  string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.24em] font-semibold mb-1.5" style={{ color: "oklch(1 0 0 / 28%)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-[12.5px] outline-none transition-colors";
const inputStyle = { background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 88%)" };
const focusBorder = (e: React.FocusEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 22%)"; };
const blurBorder  = (e: React.FocusEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 8%)"; };

function SendContractModal({
  creatorName, campaignTitle, businessName,
  onSend, onClose, sending,
}: {
  creatorName:  string;
  campaignTitle: string;
  businessName:  string;
  onSend: (fields: ContractV2Fields) => void;
  onClose: () => void;
  sending: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [fields, setFields] = useState<ContractV2Fields>({
    title:              `Partnership Agreement — ${campaignTitle}`,
    terms:              `This agreement is entered into between ${businessName} ("Brand") and ${creatorName} ("Creator") for the campaign: ${campaignTitle}.\n\nThe Creator agrees to deliver the specified content in exchange for the agreed compensation described in this contract. All deliverables must meet the quality standards set out in the campaign brief. Both parties are responsible for honouring the agreed compensation terms directly.`,
    deliverables:       "",
    amount_cents:       null,
    currency:           "USD",
    due_date:           "",
    ownership_clause:   `${businessName} retains the right to use the delivered content for marketing purposes for a period of 12 months from the date of delivery. The Creator retains underlying creative rights.`,
    usage_rights:       "Social media (paid and organic), owned digital channels, email marketing.",
    cancellation_terms: "Either party may cancel with 7 days written notice. Completed work will be compensated proportionally.",
  });

  const set = (key: keyof ContractV2Fields, val: string | number | null) =>
    setFields(f => ({ ...f, [key]: val }));

  const canSend = fields.title.trim() && fields.terms.trim() && fields.deliverables.trim();

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center px-4 py-6"
      style={{ background: "oklch(0 0 0 / 75%)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "oklch(0.09 0 0)", border: "1px solid oklch(1 0 0 / 12%)", boxShadow: "0 32px 80px oklch(0 0 0 / 80%)", maxHeight: "calc(100vh - 48px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4" style={{ color: C.accent }} />
            <div>
              <div className="text-[14px] font-semibold" style={{ color: C.text }}>Send Contract</div>
              <div className="text-[11px]" style={{ color: C.muted }}>
                {businessName} → {creatorName} · {campaignTitle}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg" style={{ color: C.faint }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 7%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Row 1: Title */}
          <Field label="Contract Title">
            <input className={inputCls} style={inputStyle}
              value={fields.title} onChange={(e) => set("title", e.target.value)}
              onFocus={focusBorder} onBlur={blurBorder} />
          </Field>

          {/* Row 2: Deliverables */}
          <Field label="Deliverables *">
            <textarea className={`${inputCls} resize-none`} style={{ ...inputStyle, minHeight: 72 }} rows={3}
              placeholder="e.g. 1× Instagram Reel (60s), 3× Instagram Stories, 1× TikTok video"
              value={fields.deliverables} onChange={(e) => set("deliverables", e.target.value)}
              onFocus={focusBorder} onBlur={blurBorder} />
          </Field>

          {/* Row 3: Amount + Currency + Due Date */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Creator Fee (optional)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: "oklch(1 0 0 / 35%)" }}>
                  {fields.currency}
                </span>
                <input
                  type="number" min="0" step="1"
                  className={`${inputCls} pl-12`} style={inputStyle}
                  placeholder="0"
                  value={fields.amount_cents !== null ? (fields.amount_cents / 100).toFixed(0) : ""}
                  onChange={(e) => set("amount_cents", e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)}
                  onFocus={focusBorder} onBlur={blurBorder}
                />
              </div>
            </Field>
            <Field label="Currency">
              <select
                className={inputCls} style={{ ...inputStyle, appearance: "none" }}
                value={fields.currency} onChange={(e) => set("currency", e.target.value)}>
                {["USD", "AED", "SAR", "EUR", "GBP", "LBP", "EGP"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Due Date">
              <input type="date" className={inputCls} style={inputStyle} min={today}
                value={fields.due_date} onChange={(e) => set("due_date", e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder} />
            </Field>
          </div>

          {/* Row 4: Terms */}
          <Field label="Contract Terms *">
            <textarea className={`${inputCls} resize-y`} style={{ ...inputStyle, minHeight: 110 }} rows={5}
              value={fields.terms} onChange={(e) => set("terms", e.target.value)}
              onFocus={focusBorder} onBlur={blurBorder} />
          </Field>

          {/* Row 5: Ownership clause */}
          <Field label="Content Ownership Clause">
            <textarea className={`${inputCls} resize-none`} style={{ ...inputStyle, minHeight: 60 }} rows={2}
              value={fields.ownership_clause} onChange={(e) => set("ownership_clause", e.target.value)}
              onFocus={focusBorder} onBlur={blurBorder} />
          </Field>

          {/* Row 6: Usage rights + Cancellation */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Usage Rights">
              <textarea className={`${inputCls} resize-none`} style={{ ...inputStyle, minHeight: 60 }} rows={2}
                placeholder="e.g. Social media, digital ads, 12 months"
                value={fields.usage_rights} onChange={(e) => set("usage_rights", e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder} />
            </Field>
            <Field label="Cancellation Terms">
              <textarea className={`${inputCls} resize-none`} style={{ ...inputStyle, minHeight: 60 }} rows={2}
                value={fields.cancellation_terms} onChange={(e) => set("cancellation_terms", e.target.value)}
                onFocus={focusBorder} onBlur={blurBorder} />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}>
          <p className="text-[11px]" style={{ color: "oklch(1 0 0 / 28%)" }}>
            Acceptance will be timestamped and logged.
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-full px-4 h-9 text-[12.5px] font-medium" style={{ color: C.muted }}>
              Cancel
            </button>
            <button
              type="button"
              disabled={sending || !canSend}
              onClick={() => onSend(fields)}
              className="flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px] font-semibold transition-all disabled:opacity-50"
              style={{ background: C.accent, color: "oklch(1 0 0 / 95%)" }}
              onMouseEnter={(e) => { if (!sending) (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.10 224)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.accent; }}
            >
              {sending
                ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-black/25 border-t-black/70 animate-spin" /> Sending…</>
                : <><FileText className="h-3.5 w-3.5" /> Send Contract</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Applicant card ───────────────────────────────────────────────────────────

function ApplicantCard({
  applicant, onStatusChange, updating, breakdown, campaignId,
  inPipeline, pipelinePending, onSaveToPipeline,
  onSendContract, contractSent,
}: {
  applicant: Applicant;
  onStatusChange: (appId: string, status: AppStatus) => void;
  updating: string | null;
  breakdown: import("@/lib/matchScore").MatchScoreBreakdown;
  campaignId: string;
  inPipeline: boolean;
  pipelinePending: boolean;
  onSaveToPipeline: (creatorProfileId: string) => void;
  onSendContract: (applicant: Applicant) => void;
  contractSent: boolean;
}) {
  const navigate  = useNavigate();
  const [messaging, setMessaging] = useState(false);
  const cp = applicant.creator_profiles;
  const cfg = STATUS_CFG[applicant.status];
  const isUpdating = updating === applicant.id;
  const location = cp.location_city ?? cp.location ?? null;

  async function handleMessage() {
    if (!cp.user_id || messaging) return;
    setMessaging(true);
    try {
      const convId = await findOrCreateConversation(cp.user_id, campaignId);
      navigate({ to: `/messages/${convId}` as "/" });
    } catch {
      toast.error("Couldn't start conversation");
    } finally {
      setMessaging(false);
    }
  }

  return (
    <div
      className="card-lift rounded-2xl overflow-hidden"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          {cp.profile_image_url ? (
            <img
              src={cp.profile_image_url}
              alt={cp.display_name}
              loading="lazy"
              className="h-10 w-10 rounded-full object-cover shrink-0 img-fade"
              style={{ border: "1px solid oklch(1 0 0 / 10%)" }}
              onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
            />
          ) : (
            <div
              className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-[14px] font-bold"
              style={{ background: avatarBg(cp.display_name), color: "rgba(0,0,0,0.75)" }}
            >
              {cp.display_name[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-[14px] leading-tight" style={{ color: C.text }}>
              {cp.display_name}
              {cp.is_verified && <VerifiedBadge type="creator" size="sm" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {cp.niche && (
                <div className="text-[11.5px]" style={{ color: C.muted }}>{cp.niche}</div>
              )}
              {(cp.avg_rating ?? 0) > 0 && (cp.review_count ?? 0) > 0 && (
                <RatingsDisplay avgRating={cp.avg_rating} reviewCount={cp.review_count} />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MatchScoreBadge score={breakdown.total} size="sm" showLabel />
          <span
            className="text-[10.5px] font-semibold rounded-full px-2.5 py-1 shrink-0"
            style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color.replace(")", " / 22%)")}` }}
        >
          {cfg.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-[11.5px]" style={{ color: C.faint }}>
          {location && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</span>
          )}
          {cp.follower_count && (
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{formatFollowers(cp.follower_count)}</span>
          )}
          <span className="text-[10px]" style={{ color: "oklch(1 0 0 / 20%)" }}>
            Applied {new Date(applicant.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        </div>

        {/* Platforms + categories */}
        <div className="flex flex-wrap gap-1.5">
          {cp.platforms.slice(0, 3).map((p) => (
            <span key={p} className="text-[10px] uppercase tracking-[0.14em] rounded-full px-2.5 py-0.5 font-medium"
              style={{ background: C.borderFaint, color: C.chrome, border: `1px solid ${C.borderSubtle}` }}>
              {p}
            </span>
          ))}
          {cp.categories.slice(0, 2).map((cat) => (
            <span key={cat} className="text-[10px] rounded-full px-2.5 py-0.5"
              style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}` }}>
              {cat}
            </span>
          ))}
        </div>

        {/* Cover note */}
        {applicant.cover_note && (
          <div className="rounded-xl px-4 py-3" style={{ background: "oklch(1 0 0 / 2%)", border: `1px solid ${C.border}` }}>
            <div className="text-[9.5px] uppercase tracking-[0.28em] mb-1.5 font-semibold" style={{ color: C.faint }}>
              Cover note
            </div>
            <p className="text-[12.5px] leading-relaxed" style={{ color: C.muted }}>
              "{applicant.cover_note}"
            </p>
          </div>
        )}

        {/* Match breakdown */}
        <MatchScoreBreakdownPanel breakdown={breakdown} />

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {/* View profile */}
          <Link
            to={`/creators/${cp.id}` as "/"}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[11.5px] font-medium transition-all"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted }}
          >
            <ExternalLink className="h-3 w-3" /> View Profile
          </Link>

          {/* Mark Reviewing (when pending) */}
          {applicant.status === "pending" && (
            <button
              onClick={() => onStatusChange(applicant.id, "reviewing")}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[11.5px] font-medium transition-all disabled:opacity-50"
              style={{ background: C.amberMuted, border: `1px solid ${C.amberBorder}`, color: C.amber, fontFamily: "inherit" }}
            >
              <Eye className="h-3 w-3" /> Review
            </button>
          )}

          {/* Mark Contacted (when reviewing) */}
          {applicant.status === "reviewing" && (
            <button
              onClick={() => onStatusChange(applicant.id, "contacted")}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[11.5px] font-medium transition-all disabled:opacity-50"
              style={{ background: C.amberMuted, border: `1px solid ${C.amberBorder}`, color: C.amber, fontFamily: "inherit" }}
            >
              <Mail className="h-3 w-3" /> Mark Contacted
            </button>
          )}

          {/* Shortlist */}
          {applicant.status !== "shortlisted" && applicant.status !== "accepted" && applicant.status !== "rejected" && (
            <button
              onClick={() => onStatusChange(applicant.id, "shortlisted")}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[11.5px] font-medium transition-all disabled:opacity-50"
              style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}`, color: C.accent, fontFamily: "inherit" }}
            >
              <Star className="h-3 w-3" /> Shortlist
            </button>
          )}

          {/* Accept */}
          {applicant.status !== "accepted" && applicant.status !== "rejected" && (
            <button
              onClick={() => onStatusChange(applicant.id, "accepted")}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[11.5px] font-medium transition-all disabled:opacity-50"
              style={{ background: C.greenMuted, border: `1px solid ${C.greenBorder}`, color: C.green, fontFamily: "inherit" }}
            >
              <CheckCircle2 className="h-3 w-3" /> Select
            </button>
          )}

          {/* Reject */}
          {applicant.status !== "rejected" && applicant.status !== "accepted" && (
            <button
              onClick={() => onStatusChange(applicant.id, "rejected")}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[11.5px] font-medium transition-all disabled:opacity-50"
              style={{ background: "oklch(0.52 0.15 24 / 8%)", border: `1px solid oklch(0.52 0.15 24 / 22%)`, color: C.red, fontFamily: "inherit" }}
            >
              <XCircle className="h-3 w-3" /> Reject
            </button>
          )}

          {/* Save to Pipeline */}
          <button
            onClick={() => onSaveToPipeline(cp.id)}
            disabled={pipelinePending || inPipeline}
            title={inPipeline ? "Already in your pipeline" : "Save to creator pipeline"}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[11.5px] font-medium transition-all disabled:opacity-60"
            style={{
              background: inPipeline ? C.greenMuted : C.surface,
              border:     `1px solid ${inPipeline ? C.greenBorder : C.border}`,
              color:      inPipeline ? C.green : C.faint,
              fontFamily: "inherit",
            }}
          >
            {inPipeline ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
            {inPipeline ? "In Pipeline" : "Pipeline"}
          </button>

          {/* View Deliverables (accepted applicants only) */}
          {applicant.status === "accepted" && (
            <Link
              to={`/deliverables/${applicant.id}` as "/"}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[11.5px] font-medium transition-all"
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontFamily: "inherit" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 7%)"; (e.currentTarget as HTMLElement).style.color = C.text; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; (e.currentTarget as HTMLElement).style.color = C.muted; }}
            >
              <CheckCircle2 className="h-3 w-3" /> Deliverables
            </Link>
          )}

          {/* Send Contract (accepted applicants only) */}
          {applicant.status === "accepted" && (
            <button
              onClick={() => onSendContract(applicant)}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[11.5px] font-medium transition-all disabled:opacity-60"
              style={{
                background: contractSent ? C.amberMuted : C.accentMuted,
                border:     contractSent ? `1px solid ${C.amberBorder}` : `1px solid ${C.accentBorder}`,
                color:      contractSent ? C.amber : C.accent,
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = contractSent ? "oklch(0.78 0.14 76 / 20%)" : "oklch(0.62 0.10 224 / 20%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = contractSent ? C.amberMuted : C.accentMuted; }}
            >
              <FileText className="h-3 w-3" />
              {contractSent ? "Send Another Contract" : "Send Contract"}
            </button>
          )}

          {/* Message creator */}
          {cp.user_id && (
            <button
              onClick={handleMessage}
              disabled={messaging}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[11.5px] font-medium transition-all ml-auto"
              style={{
                background: "oklch(1 0 0 / 8%)",
                border:     "1px solid oklch(1 0 0 / 20%)",
                color:      messaging ? C.faint : C.chrome,
                cursor:     messaging ? "wait" : "pointer",
                fontFamily: "inherit",
              }}
            >
              <MessageSquare className="h-3 w-3" />
              {messaging ? "Opening…" : "Message"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Status filter tabs ───────────────────────────────────────────────────────

const STATUS_TABS: Array<{ value: AppStatus | "all"; label: string }> = [
  { value: "all",         label: "All"         },
  { value: "pending",     label: "Applied"      },
  { value: "reviewing",   label: "Reviewing"    },
  { value: "contacted",   label: "Contacted"    },
  { value: "shortlisted", label: "Shortlisted"  },
  { value: "accepted",    label: "Selected"     },
  { value: "rejected",    label: "Rejected"     },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

function ApplicantsPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { campaignId } = Route.useParams();

  const [applicants,      setApplicants]      = useState<Applicant[]>([]);
  const [campaign,        setCampaign]        = useState<{ title: string; business_name: string } | null>(null);
  const [campaignForScore, setCampaignForScore] = useState<CampaignForScore | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [updating,        setUpdating]        = useState<string | null>(null);
  const [filterStatus,    setFilterStatus]    = useState<AppStatus | "all">("all");
  // Pipeline tracking — which creator profiles are already saved to pipeline
  const [pipelineSet,     setPipelineSet]     = useState<Set<string>>(new Set());
  const [pipelinePending, setPipelinePending] = useState<Set<string>>(new Set());
  // Contract modal
  const [contractModal,   setContractModal]   = useState<Applicant | null>(null);
  const [sendingContract, setSendingContract] = useState(false);
  // Track which creator user IDs already have a contract for this campaign
  const [contractedSet,   setContractedSet]   = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Load campaign (verify ownership), applicants, and pipeline entries in parallel
      const [campaignRes, appsRes, pipelineRes, contractsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("campaigns")
          .select(
            "title,business_name,user_id,compensation_type," +
            "required_platforms,required_niches,business_industry," +
            "required_country,required_language,min_followers"
          )
          .eq("id", campaignId)
          .single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("campaign_applications")
          .select(
            "id,campaign_id,status,cover_note,created_at," +
            "creator_profiles(id,user_id,display_name,niche,categories,platforms,follower_count," +
            "profile_image_url,location,location_city,location_country," +
            "audience_location,primary_language,accepts_paid,accepts_gifted,accepts_affiliate,preferred_content_types,is_verified,avg_rating,review_count)"
          )
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: false }),
        // Load already-pipelined creator profile IDs for this user
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("project_saved_creators")
          .select("creator_profile_id")
          .eq("saved_by", user.id),
        // Load existing contracts for this campaign (to show "Send Another" state)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("contracts")
          .select("creator_id")
          .eq("campaign_id", campaignId)
          .eq("business_id", user.id),
      ]);

      if (campaignRes.error || !campaignRes.data) { navigate({ to: "/pipeline" }); return; }
      if (campaignRes.data.user_id !== user.id) { navigate({ to: "/pipeline" }); return; }

      setCampaign({ title: campaignRes.data.title, business_name: campaignRes.data.business_name });
      // Store full campaign data for scoring
      setCampaignForScore({
        required_platforms: campaignRes.data.required_platforms ?? [],
        required_niches:    campaignRes.data.required_niches ?? [],
        business_industry:  campaignRes.data.business_industry,
        required_country:   campaignRes.data.required_country,
        required_language:  campaignRes.data.required_language,
        min_followers:      campaignRes.data.min_followers,
        compensation_type:  campaignRes.data.compensation_type,
      });
      setApplicants(appsRes.data ?? []);
      setPipelineSet(new Set(
        (pipelineRes.data ?? []).map((r: { creator_profile_id: string }) => r.creator_profile_id)
      ));
      setContractedSet(new Set(
        (contractsRes.data ?? []).map((r: { creator_id: string }) => r.creator_id)
      ));
      setLoading(false);
    })();
  }, [user, campaignId, navigate]);

  async function handleStatusChange(appId: string, newStatus: AppStatus) {
    setUpdating(appId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("campaign_applications")
        .update({ status: newStatus })
        .eq("id", appId);

      if (error) throw error;
      setApplicants((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a));
      toast.success(`Status updated to ${STATUS_CFG[newStatus].label}.`);

      // Track and notify the creator
      const app = applicants.find((a) => a.id === appId);
      const creatorUserId = app?.creator_profiles.user_id;
      if (user && app && creatorUserId) {
        const eventMap: Partial<Record<AppStatus, Parameters<typeof trackMarketplaceEvent>[0]["eventType"]>> = {
          shortlisted: "application_shortlisted",
          accepted:    "application_accepted",
          rejected:    "application_rejected",
        };
        const evType = eventMap[newStatus];
        if (evType) {
          trackMarketplaceEvent({
            actorUserId: user.id,
            eventType: evType,
            applicationId: appId,
            campaignId,
            creatorId: creatorUserId,
            businessId: user.id,
          });
          // Notify the creator
          const notifMap: Partial<Record<AppStatus, Parameters<typeof sendNotification>[0]["notificationType"]>> = {
            shortlisted: "application_shortlisted",
            accepted:    "application_accepted",
            rejected:    "application_rejected",
          };
          const notifType = notifMap[newStatus];
          if (notifType) {
            sendNotification({
              userId: creatorUserId,
              notificationType: notifType,
              data: { campaign_title: campaign?.title ?? "", campaign_id: campaignId },
              inApp: {
                title: newStatus === "shortlisted" ? "You've been shortlisted" :
                       newStatus === "accepted"    ? "You've been selected" :
                                                    "Application update",
                body: newStatus === "shortlisted" ? `You've been shortlisted for ${campaign?.title ?? "a campaign"}.` :
                      newStatus === "accepted"    ? `Congratulations — you were selected for ${campaign?.title ?? "a campaign"}.` :
                                                    `Your application for ${campaign?.title ?? "a campaign"} was reviewed.`,
                link: "/opportunities",
              },
            });
          }
        }
      }
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setUpdating(null);
    }
  }

  async function handleSaveToPipeline(creatorProfileId: string) {
    if (!user || pipelinePending.has(creatorProfileId) || pipelineSet.has(creatorProfileId)) return;
    setPipelinePending((p) => new Set(p).add(creatorProfileId));
    try {
      // Find or create a default project for this user
      let projectId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: projects } = await (supabase as any)
        .from("projects")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1);

      if (projects?.length) {
        projectId = projects[0].id;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newProject, error: projErr } = await (supabase as any)
          .from("projects")
          .insert({ user_id: user.id, name: "Marketplace" })
          .select("id")
          .single();
        if (projErr) throw projErr;
        projectId = newProject.id;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("project_saved_creators")
        .insert({
          project_id:         projectId,
          creator_profile_id: creatorProfileId,
          saved_by:           user.id,
          status:             "discovered",
          campaign_id:        campaignId,
        });

      if (error && error.code !== "23505") throw error; // ignore duplicate
      setPipelineSet((p) => new Set(p).add(creatorProfileId));
      toast.success("Saved to creator pipeline.");
    } catch {
      toast.error("Could not save to pipeline.");
    } finally {
      setPipelinePending((p) => { const n = new Set(p); n.delete(creatorProfileId); return n; });
    }
  }

  async function handleSendContractSubmit(fields: import("./campaigns.$campaignId.applicants").ContractV2Fields) {
    if (!user || !contractModal || !campaign) return;
    const creatorUserId = contractModal.creator_profiles.user_id;
    if (!creatorUserId) {
      toast.error("Creator profile has no user account.");
      return;
    }
    setSendingContract(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("contracts")
        .insert({
          campaign_id:       campaignId,
          creator_id:        creatorUserId,
          business_id:       user.id,
          campaign_title:    campaign.title,
          business_name:     campaign.business_name || null,
          creator_name:      contractModal.creator_profiles.display_name,
          title:             fields.title,
          terms:             fields.terms,
          deliverables_json: fields.deliverables ? { text: fields.deliverables } : null,
          amount_cents:      fields.amount_cents,
          currency:          fields.currency,
          due_date:          fields.due_date || null,
          ownership_clause:  fields.ownership_clause || null,
          usage_rights:      fields.usage_rights || null,
          cancellation_terms: fields.cancellation_terms || null,
          contract_version:  1,
          status:            "sent",
          sent_at:        new Date().toISOString(),
        });
      if (error) throw error;
      setContractedSet((prev) => new Set(prev).add(creatorUserId));
      toast.success(`Contract sent to ${contractModal.creator_profiles.display_name}`);
      trackMarketplaceEvent({
        actorUserId: user.id,
        eventType: "contract_sent",
        campaignId,
        creatorId: creatorUserId,
        businessId: user.id,
      });
      sendNotification({
        userId: creatorUserId,
        notificationType: "contract_sent",
        data: { campaign_title: campaign?.title ?? "", campaign_id: campaignId },
        inApp: {
          title: "Contract ready to review",
          body: `A contract has been sent for ${campaign?.title ?? "a campaign"}.`,
          link: "/pipeline",
        },
      });
      setContractModal(null);
    } catch {
      toast.error("Failed to send contract.");
    } finally {
      setSendingContract(false);
    }
  }

  const filtered = filterStatus === "all"
    ? applicants
    : applicants.filter((a) => a.status === filterStatus);

  // Pre-compute match scores for each applicant (memoised)
  const breakdowns = useMemo(() => {
    if (!campaignForScore) return new Map<string, import("@/lib/matchScore").MatchScoreBreakdown>();
    const map = new Map<string, import("@/lib/matchScore").MatchScoreBreakdown>();
    for (const app of applicants) {
      const cp = app.creator_profiles;
      map.set(app.id, computeMatchScore(
        {
          platforms:              cp.platforms ?? [],
          niche:                  cp.niche,
          categories:             cp.categories ?? [],
          audience_location:      cp.audience_location,
          location:               cp.location,
          location_city:          cp.location_city,
          location_country:       cp.location_country,
          follower_count:         cp.follower_count,
          primary_language:       cp.primary_language,
          accepts_paid:           cp.accepts_paid ?? false,
          accepts_gifted:         cp.accepts_gifted ?? false,
          accepts_affiliate:      cp.accepts_affiliate ?? false,
          preferred_content_types: cp.preferred_content_types ?? [],
        },
        campaignForScore,
      ));
    }
    return map;
  }, [applicants, campaignForScore]);

  const counts = applicants.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#000" }}>
      <div className="h-[52px] shrink-0" style={{ borderBottom: `1px solid ${C.border}` }} />
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-4">
          <div className="mb-8 space-y-3">
            <div className="skeleton" style={{ height: 12, width: 120 }} />
            <div className="skeleton" style={{ height: 32, width: "55%" }} />
            <div className="skeleton" style={{ height: 14, width: "72%" }} />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="px-5 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                <div className="skeleton h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton" style={{ height: 14, width: "40%" }} />
                  <div className="skeleton" style={{ height: 11, width: "25%" }} />
                </div>
                <div className="skeleton" style={{ height: 20, width: 70, borderRadius: 99 }} />
              </div>
              <div className="p-5 space-y-3">
                <div className="skeleton" style={{ height: 12, width: "60%" }} />
                <div className="flex gap-2">
                  <div className="skeleton" style={{ height: 22, width: 64, borderRadius: 99 }} />
                  <div className="skeleton" style={{ height: 22, width: 72, borderRadius: 99 }} />
                </div>
                <div className="flex gap-2 pt-1">
                  <div className="skeleton" style={{ height: 32, width: 110, borderRadius: 99 }} />
                  <div className="skeleton" style={{ height: 32, width: 88, borderRadius: 99 }} />
                  <div className="skeleton" style={{ height: 32, width: 76, borderRadius: 99 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#000", color: C.text }}>

      {/* Top bar */}
      <div className="h-[52px] px-6 flex items-center gap-3 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
        <Link
          to={`/campaigns/${campaignId}` as "/"}
          className="flex items-center gap-1.5 text-[12px] transition-colors"
          style={{ color: C.faint }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.faint; }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Campaign
        </Link>
        <span style={{ color: C.faint }}>/</span>
        <span className="text-[12px] font-medium" style={{ color: C.muted }}>
          Applicants
        </span>
        <span
          className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ background: "oklch(1 0 0 / 8%)", color: C.muted }}
        >
          {applicants.length}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" style={{ color: C.amber }} />
          <span className="text-[11px]" style={{ color: C.faint }}>
            {counts["pending"] ?? 0} new
            {(counts["reviewing"] ?? 0) > 0 && ` · ${counts["reviewing"]} reviewing`}
            {(counts["contacted"] ?? 0) > 0 && ` · ${counts["contacted"]} contacted`}
            {(counts["shortlisted"] ?? 0) > 0 && ` · ${counts["shortlisted"]} shortlisted`}
            {(counts["accepted"] ?? 0) > 0 && ` · ${counts["accepted"]} selected`}
          </span>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* Heading */}
          <div className="mb-8">
            <div className="text-[9.5px] uppercase tracking-[0.32em] mb-3 font-medium" style={{ color: C.faint }}>
              {campaign?.business_name}
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
              {campaign?.title}
            </h1>
            <p className="text-[14px] font-light" style={{ color: C.muted }}>
              Review applicants and update their status. Creators are notified of shortlist and acceptance.
            </p>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
            {STATUS_TABS.map((tab) => {
              const count = tab.value === "all" ? applicants.length : (counts[tab.value] ?? 0);
              const active = filterStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilterStatus(tab.value)}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-all"
                  style={{
                    background: active ? "oklch(1 0 0 / 10%)" : C.surface,
                    border: `1px solid ${active ? "oklch(1 0 0 / 24%)" : C.border}`,
                    color: active ? C.text : C.muted,
                  }}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className="rounded-full px-1.5 text-[9px] font-bold" style={{ background: active ? "oklch(1 0 0 / 15%)" : "oklch(1 0 0 / 7%)", color: active ? C.text : C.faint }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Applicant cards */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Users className="h-8 w-8 mb-4" style={{ color: "oklch(1 0 0 / 16%)" }} />
              <p className="text-[0.9375rem]" style={{ color: C.muted }}>
                {applicants.length === 0 ? "No applications yet." : "No applicants in this status."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((app) => (
                <ApplicantCard
                  key={app.id}
                  applicant={app}
                  onStatusChange={handleStatusChange}
                  updating={updating}
                  breakdown={breakdowns.get(app.id) ?? { total: 0, platform: 0, niche: 0, audience: 0, location: 0, requirements: 0 }}
                  campaignId={campaignId}
                  inPipeline={pipelineSet.has(app.creator_profiles.id)}
                  pipelinePending={pipelinePending.has(app.creator_profiles.id)}
                  onSaveToPipeline={handleSaveToPipeline}
                  onSendContract={setContractModal}
                  contractSent={contractedSet.has(app.creator_profiles.user_id ?? "")}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Send Contract Modal */}
      {contractModal && campaign && (
        <SendContractModal
          creatorName={contractModal.creator_profiles.display_name}
          campaignTitle={campaign.title}
          businessName={campaign.business_name || "Your Brand"}
          onSend={handleSendContractSubmit}
          onClose={() => setContractModal(null)}
          sending={sendingContract}
        />
      )}
    </div>
  );
}
