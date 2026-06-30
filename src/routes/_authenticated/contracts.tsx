// ─────────────────────────────────────────────────────────────────────────────
// /contracts — Contract management for creators (review/accept/decline) and
//              businesses (view sent contracts, track status).
//
// Creators see contracts addressed to them. The "Send Contract" action lives on
// the campaign applicants page (/campaigns/$id/applicants) for accepted creators.
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  FileText, CheckCircle2, XCircle, Clock, ExternalLink,
  ChevronDown, ChevronUp, Megaphone, Calendar, Printer,
  DollarSign, Package, Scale, ShieldCheck, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/contracts")({
  head: () => ({ meta: [{ title: "Contracts — MRKT" }] }),
  component: ContractsPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractStatus = "draft" | "sent" | "accepted" | "declined";

interface Contract {
  id:             string;
  campaign_id:    string;
  campaign_title: string;
  title:          string;
  terms:          string;
  status:         ContractStatus;
  sent_at:        string | null;
  accepted_at:    string | null;
  signed_at:      string | null;
  signer_email:   string | null;
  declined_at:    string | null;
  decline_reason: string | null;
  created_at:     string;
  // V2 fields
  business_name:        string | null;
  creator_name:         string | null;
  deliverables_json:    { text?: string; items?: string[] } | null;
  amount_cents:         number | null;
  currency:             string | null;
  due_date:             string | null;
  ownership_clause:     string | null;
  usage_rights:         string | null;
  cancellation_terms:   string | null;
  contract_version:     number | null;
  // Joined
  other_party_name: string;
  other_party_image: string | null;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<ContractStatus, { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft:    { label: "Draft",     color: "oklch(1 0 0 / 42%)",   bg: "oklch(1 0 0 / 5%)",           border: "oklch(1 0 0 / 11%)",          icon: Clock        },
  sent:     { label: "Pending",   color: "oklch(0.70 0.08 68)",  bg: "oklch(0.78 0.14 76 / 12%)",   border: "oklch(0.78 0.14 76 / 26%)",   icon: Clock        },
  accepted: { label: "Accepted",  color: "oklch(0.62 0.12 158)", bg: "oklch(0.72 0.18 152 / 14%)",  border: "oklch(0.72 0.18 152 / 30%)",  icon: CheckCircle2 },
  declined: { label: "Declined",  color: "oklch(0.52 0.15 24)",  bg: "oklch(0.52 0.15 24 / 10%)",   border: "oklch(0.52 0.15 24 / 24%)",   icon: XCircle      },
};

function StatusBadge({ status }: { status: ContractStatus }) {
  const s = STATUS[status] ?? STATUS.draft;
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold shrink-0"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

// ─── Print helper ─────────────────────────────────────────────────────────────

function printContract(c: Contract) {
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";
  const money = c.amount_cents != null
    ? (c.amount_cents / 100).toLocaleString(undefined, { style: "currency", currency: c.currency ?? "USD" })
    : null;

  const html = `<!DOCTYPE html><html><head>
  <meta charset="utf-8"/>
  <title>Contract — ${c.title}</title>
  <style>
    body { font-family: "Inter", Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #111; margin: 0; padding: 40px 32px; max-width: 680px; margin: 0 auto; }
    h1 { font-size: 20pt; font-weight: 700; margin-bottom: 4px; }
    .meta { font-size: 9pt; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 12px; margin-bottom: 24px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border: 1px solid #ddd; border-radius: 4px; padding: 12px; margin-bottom: 20px; }
    .party-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em; color: #888; font-weight: 700; margin-bottom: 2px; }
    .party-name { font-weight: 600; }
    .highlights { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .highlight { border: 1px solid #ddd; border-radius: 4px; padding: 10px 12px; }
    .hl-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em; color: #888; font-weight: 700; margin-bottom: 2px; }
    .hl-value { font-size: 13pt; font-weight: 700; }
    .section { margin-bottom: 16px; page-break-inside: avoid; }
    .section-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em; color: #888; font-weight: 700; margin-bottom: 4px; }
    .section-body { font-size: 10.5pt; white-space: pre-wrap; }
    .signature { margin-top: 32px; padding-top: 16px; border-top: 2px solid #000; font-size: 9.5pt; }
    .sig-row { display: flex; gap: 24px; margin-top: 8px; }
    .sig-item { flex: 1; }
    .sig-label { color: #888; font-size: 8.5pt; }
    .sig-value { font-weight: 600; }
    @media print { body { padding: 0; } }
  </style>
</head><body>
  <h1>${c.title}</h1>
  <div class="meta">Campaign: ${c.campaign_title} · Generated ${fmt(new Date().toISOString())}</div>

  ${c.business_name || c.creator_name ? `
  <div class="parties">
    ${c.business_name ? `<div><div class="party-label">Business</div><div class="party-name">${c.business_name}</div></div>` : ""}
    ${c.creator_name  ? `<div><div class="party-label">Creator</div><div class="party-name">${c.creator_name}</div></div>`   : ""}
  </div>` : ""}

  ${money || c.due_date ? `
  <div class="highlights">
    ${money     ? `<div class="highlight"><div class="hl-label">Amount</div><div class="hl-value">${money}</div></div>` : ""}
    ${c.due_date? `<div class="highlight"><div class="hl-label">Due Date</div><div class="hl-value">${fmt(c.due_date)}</div></div>` : ""}
  </div>` : ""}

  ${c.deliverables_json ? `<div class="section"><div class="section-label">Deliverables</div><div class="section-body">${c.deliverables_json.text ?? JSON.stringify(c.deliverables_json)}</div></div>` : ""}
  ${c.terms             ? `<div class="section"><div class="section-label">General Terms</div><div class="section-body">${c.terms}</div></div>` : ""}
  ${c.usage_rights      ? `<div class="section"><div class="section-label">Usage Rights</div><div class="section-body">${c.usage_rights}</div></div>` : ""}
  ${c.ownership_clause  ? `<div class="section"><div class="section-label">Ownership</div><div class="section-body">${c.ownership_clause}</div></div>` : ""}
  ${c.cancellation_terms? `<div class="section"><div class="section-label">Cancellation Terms</div><div class="section-body">${c.cancellation_terms}</div></div>` : ""}

  <div class="signature">
    <div><strong>Signature &amp; Acceptance Log</strong></div>
    <div class="sig-row">
      <div class="sig-item"><div class="sig-label">Status</div><div class="sig-value">${c.status.charAt(0).toUpperCase() + c.status.slice(1)}</div></div>
      ${c.signed_at   ? `<div class="sig-item"><div class="sig-label">Signed</div><div class="sig-value">${fmt(c.signed_at)}</div></div>` : ""}
      ${c.signer_email? `<div class="sig-item"><div class="sig-label">Signed by</div><div class="sig-value">${c.signer_email}</div></div>` : ""}
    </div>
    ${c.decline_reason ? `<div style="margin-top:8px"><div class="sig-label">Decline Reason</div><div>${c.decline_reason}</div></div>` : ""}
  </div>
</body></html>`;

  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

// ─── Date helper ─────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Contract row ─────────────────────────────────────────────────────────────

function ContractRow({
  contract, isCreator,
  onAccept, onDecline, accepting, declining,
}: {
  contract: Contract;
  isCreator: boolean;
  onAccept?: (id: string) => void;
  onDecline?: (id: string, reason: string) => void;
  accepting: string | null;
  declining: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [agreementChecked, setAgreementChecked] = useState(false);
  const isAccepting = accepting === contract.id;
  const isDeclining = declining === contract.id;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-100"
      style={{
        background: C.surface,
        border:     `1px solid ${expanded ? C.borderHov : C.border}`,
      }}
    >
      {/* Row header */}
      <button
        type="button"
        className="w-full text-left px-5 py-4 flex items-start gap-4"
        style={{ cursor: "pointer" }}
        onClick={() => { setExpanded(v => !v); setShowDeclineForm(false); }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.surfaceHov; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
      >
        {/* Icon */}
        <div
          className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center mt-0.5"
          style={{ background: "oklch(0.82 0.005 0 / 10%)", border: "1px solid oklch(0.82 0.005 0 / 20%)" }}
        >
          <FileText className="h-4 w-4" style={{ color: C.chrome }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[13.5px] font-semibold leading-tight" style={{ color: C.text }}>
                {contract.title}
              </p>
              <p className="text-[11.5px] mt-0.5" style={{ color: C.muted }}>
                {isCreator ? "From" : "To"}: <span style={{ color: C.textSub }}>{contract.other_party_name}</span>
                <span className="mx-1.5 opacity-30">·</span>
                <span className="inline-flex items-center gap-1">
                  <Megaphone className="h-3 w-3 opacity-60" />
                  {contract.campaign_title}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={contract.status} />
              {expanded
                ? <ChevronUp className="h-3.5 w-3.5 shrink-0" style={{ color: C.muted }} />
                : <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: C.muted }} />
              }
            </div>
          </div>

          {/* Date row */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {contract.sent_at && (
              <span className="inline-flex items-center gap-1 text-[10.5px]" style={{ color: C.faint }}>
                <Calendar className="h-3 w-3" />
                Sent {fmtDate(contract.sent_at)}
              </span>
            )}
            {contract.accepted_at && (
              <span className="inline-flex items-center gap-1 text-[10.5px]" style={{ color: "oklch(0.82 0.005 0 / 70%)" }}>
                <CheckCircle2 className="h-3 w-3" />
                Accepted {fmtDate(contract.accepted_at)}
              </span>
            )}
            {contract.declined_at && (
              <span className="inline-flex items-center gap-1 text-[10.5px]" style={{ color: "oklch(0.52 0.15 24 / 70%)" }}>
                <XCircle className="h-3 w-3" />
                Declined {fmtDate(contract.declined_at)}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded: full V2 contract */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="px-5 py-4 space-y-4">

            {/* Print / Save PDF */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); printContract(contract); }}
                className="inline-flex items-center gap-1.5 rounded-full px-4 h-8 text-[11.5px] font-medium transition-colors"
                style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.border}`, color: C.muted }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 9%)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; }}
              >
                <Printer className="h-3 w-3" />
                Print / Save PDF
              </button>
            </div>

            {/* Parties */}
            {(contract.business_name || contract.creator_name) && (
              <div className="grid grid-cols-2 gap-3">
                {contract.business_name && (
                  <div className="rounded-xl px-4 py-3" style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.border}` }}>
                    <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-1" style={{ color: C.faint }}>Business</p>
                    <p className="text-[12.5px] font-medium" style={{ color: C.text }}>{contract.business_name}</p>
                  </div>
                )}
                {contract.creator_name && (
                  <div className="rounded-xl px-4 py-3" style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.border}` }}>
                    <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-1" style={{ color: C.faint }}>Creator</p>
                    <p className="text-[12.5px] font-medium" style={{ color: C.text }}>{contract.creator_name}</p>
                  </div>
                )}
              </div>
            )}

            {/* Key terms row */}
            <div className="grid grid-cols-2 gap-3">
              {contract.amount_cents != null && (
                <div className="rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: "oklch(0.62 0.12 158 / 6%)", border: "1px solid oklch(0.62 0.12 158 / 18%)" }}>
                  <DollarSign className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "oklch(0.62 0.12 158)" }} />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-0.5" style={{ color: "oklch(0.62 0.12 158 / 70%)" }}>Amount</p>
                    <p className="text-[13px] font-semibold" style={{ color: "oklch(0.62 0.12 158)" }}>
                      {(contract.amount_cents / 100).toLocaleString(undefined, { style: "currency", currency: contract.currency ?? "USD" })}
                    </p>
                  </div>
                </div>
              )}
              {contract.due_date && (
                <div className="rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: "oklch(0.70 0.08 68 / 6%)", border: "1px solid oklch(0.70 0.08 68 / 18%)" }}>
                  <Calendar className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "oklch(0.70 0.08 68)" }} />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-0.5" style={{ color: "oklch(0.70 0.08 68 / 70%)" }}>Due Date</p>
                    <p className="text-[13px] font-semibold" style={{ color: "oklch(0.70 0.08 68)" }}>
                      {new Date(contract.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Deliverables */}
            {contract.deliverables_json && (
              <div className="rounded-xl px-4 py-3" style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-3.5 w-3.5" style={{ color: C.muted }} />
                  <p className="text-[10.5px] uppercase tracking-[0.22em] font-semibold" style={{ color: C.faint }}>Deliverables</p>
                </div>
                <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: C.textSub }}>
                  {contract.deliverables_json.text ?? JSON.stringify(contract.deliverables_json)}
                </p>
              </div>
            )}

            {/* Terms */}
            {contract.terms && (
              <div className="rounded-xl px-4 py-3" style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.border}` }}>
                <p className="text-[10.5px] uppercase tracking-[0.22em] font-semibold mb-2" style={{ color: C.faint }}>General Terms</p>
                <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: C.textSub }}>{contract.terms}</p>
              </div>
            )}

            {/* Ownership / Usage / Cancellation */}
            {(contract.ownership_clause || contract.usage_rights || contract.cancellation_terms) && (
              <div className="space-y-3">
                {contract.ownership_clause && (
                  <div className="rounded-xl px-4 py-3" style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Scale className="h-3.5 w-3.5" style={{ color: C.muted }} />
                      <p className="text-[10.5px] uppercase tracking-[0.22em] font-semibold" style={{ color: C.faint }}>Ownership</p>
                    </div>
                    <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: C.textSub }}>{contract.ownership_clause}</p>
                  </div>
                )}
                {contract.usage_rights && (
                  <div className="rounded-xl px-4 py-3" style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" style={{ color: C.muted }} />
                      <p className="text-[10.5px] uppercase tracking-[0.22em] font-semibold" style={{ color: C.faint }}>Usage Rights</p>
                    </div>
                    <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: C.textSub }}>{contract.usage_rights}</p>
                  </div>
                )}
                {contract.cancellation_terms && (
                  <div className="rounded-xl px-4 py-3" style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" style={{ color: C.muted }} />
                      <p className="text-[10.5px] uppercase tracking-[0.22em] font-semibold" style={{ color: C.faint }}>Cancellation Terms</p>
                    </div>
                    <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: C.textSub }}>{contract.cancellation_terms}</p>
                  </div>
                )}
              </div>
            )}

            {/* Decline reason (if declined) */}
            {contract.status === "declined" && contract.decline_reason && (
              <div className="rounded-xl px-4 py-3" style={{ background: "oklch(0.52 0.15 24 / 8%)", border: "1px solid oklch(0.52 0.15 24 / 18%)" }}>
                <p className="text-[10.5px] font-semibold mb-1" style={{ color: "oklch(0.52 0.15 24)" }}>Decline reason</p>
                <p className="text-[12px] leading-relaxed" style={{ color: C.textSub }}>{contract.decline_reason}</p>
              </div>
            )}

            {/* Signed confirmation */}
            {contract.status === "accepted" && contract.signed_at && (
              <div className="mt-4 rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: "oklch(0.62 0.12 158 / 8%)", border: "1px solid oklch(0.62 0.12 158 / 22%)" }}>
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "oklch(0.62 0.12 158)" }} />
                <div>
                  <p className="text-[11.5px] font-semibold" style={{ color: "oklch(0.62 0.12 158)" }}>
                    Signed {fmtDate(contract.signed_at)}
                  </p>
                  {contract.signer_email && (
                    <p className="text-[10.5px] mt-0.5" style={{ color: "oklch(0.62 0.12 158 / 60%)" }}>
                      {contract.signer_email}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Creator signing flow — only when status is 'sent' */}
            {isCreator && contract.status === "sent" && !showDeclineForm && (
              <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                {/* Agreement checkbox */}
                <label className="flex items-start gap-3 cursor-pointer group rounded-xl p-3" style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${agreementChecked ? "oklch(0.62 0.12 158 / 30%)" : C.border}` }}>
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={agreementChecked}
                      onChange={(e) => setAgreementChecked(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className="h-4 w-4 rounded flex items-center justify-center transition-all"
                      style={{
                        background: agreementChecked ? "oklch(0.62 0.12 158)" : "transparent",
                        border: `1.5px solid ${agreementChecked ? "oklch(0.62 0.12 158)" : "oklch(1 0 0 / 28%)"}`,
                      }}
                    >
                      {agreementChecked && (
                        <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-current" style={{ color: "white" }} strokeWidth={1.8}>
                          <path d="M1 4l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-[12.5px] leading-relaxed" style={{ color: C.textSub }}>
                    I have read and agree to the terms of this contract. I understand this constitutes a legally binding agreement.
                  </span>
                </label>

                {/* Sign + Decline buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!agreementChecked || isAccepting || isDeclining}
                    onClick={(e) => { e.stopPropagation(); onAccept?.(contract.id); }}
                    className="flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px] font-semibold transition-all duration-150 disabled:opacity-40"
                    style={{ background: agreementChecked ? C.chrome : "oklch(1 0 0 / 10%)", color: agreementChecked ? "oklch(0.06 0 0)" : C.muted, border: "none" }}
                    onMouseEnter={(e) => { if (agreementChecked && !isAccepting) (e.currentTarget as HTMLElement).style.background = "oklch(0.90 0.005 0)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = agreementChecked ? C.chrome : "oklch(1 0 0 / 10%)"; }}
                  >
                    {isAccepting
                      ? <span className="h-3.5 w-3.5 rounded-full border-2 border-black/30 border-t-black/80 animate-spin" />
                      : <CheckCircle2 className="h-3.5 w-3.5" />
                    }
                    Sign & Accept
                  </button>
                  <button
                    type="button"
                    disabled={isAccepting || isDeclining}
                    onClick={(e) => { e.stopPropagation(); setShowDeclineForm(true); }}
                    className="flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px] font-medium transition-all duration-150 disabled:opacity-50"
                    style={{ background: "oklch(0.52 0.15 24 / 10%)", color: "oklch(0.52 0.15 24)", border: "1px solid oklch(0.52 0.15 24 / 24%)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.52 0.15 24 / 16%)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.52 0.15 24 / 10%)"; }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Decline
                  </button>
                </div>
              </div>
            )}

            {/* Decline form */}
            {isCreator && contract.status === "sent" && showDeclineForm && (
              <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                <p className="text-[12px] font-medium" style={{ color: C.textSub }}>
                  Reason for declining <span className="opacity-50">(optional)</span>
                </p>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Let the business know why…"
                  rows={3}
                  className="w-full rounded-xl px-3.5 py-2.5 text-[12.5px] resize-none outline-none transition-colors"
                  style={{
                    background:  "oklch(1 0 0 / 4%)",
                    border:      `1px solid ${C.border}`,
                    color:       C.text,
                  }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 20%)"; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isDeclining}
                    onClick={() => onDecline?.(contract.id, declineReason)}
                    className="flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px] font-medium transition-all duration-150 disabled:opacity-50"
                    style={{
                      background: "oklch(0.52 0.15 24 / 10%)",
                      color:      "oklch(0.52 0.15 24)",
                      border:     "1px solid oklch(0.52 0.15 24 / 24%)",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.52 0.15 24 / 16%)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.52 0.15 24 / 10%)"; }}
                  >
                    {isDeclining
                      ? <span className="h-3.5 w-3.5 rounded-full border-2 border-red-400/30 border-t-red-400/80 animate-spin" />
                      : <XCircle className="h-3.5 w-3.5" />
                    }
                    Confirm Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowDeclineForm(false); setDeclineReason(""); }}
                    className="text-[12px] px-3 h-9 rounded-full transition-colors"
                    style={{ color: C.muted }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.text; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Campaign link */}
            <div className="mt-4 flex">
              <a
                href={`/campaigns/${contract.campaign_id}`}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium transition-colors"
                style={{ color: C.muted }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.chrome; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
              >
                <ExternalLink className="h-3 w-3" />
                View campaign
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ContractsPage() {
  const { user } = useAuth();
  const [contracts,   setContracts]   = useState<Contract[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [isCreator,   setIsCreator]   = useState(false);
  const [accepting,   setAccepting]   = useState<string | null>(null);
  const [declining,   setDeclining]   = useState<string | null>(null);

  // ── Load account type & contracts ──
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, onboarding_path")
        .eq("id", user.id)
        .single();

      const creatorRole =
        profile?.account_type === "creator" ||
        profile?.onboarding_path === "creator";
      setIsCreator(creatorRole);

      if (creatorRole) {
        // Creator: contracts sent to me
        const { data: rows, error } = await (supabase as any)
          .from("contracts")
          .select(`
            id, campaign_id, campaign_title, title, terms, status,
            sent_at, accepted_at, signed_at, signer_email,
            declined_at, decline_reason, created_at,
            business_id, business_name, creator_name,
            deliverables_json, amount_cents, currency, due_date,
            ownership_clause, usage_rights, cancellation_terms, contract_version
          `)
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Enrich with business names
        const enriched: Contract[] = await Promise.all(
          (rows ?? []).map(async (row: any) => {
            const { data: bp } = await (supabase as any)
              .from("business_profiles")
              .select("company_name, logo_url")
              .eq("user_id", row.business_id)
              .maybeSingle();
            const { data: p } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", row.business_id)
              .maybeSingle();
            return {
              ...row,
              other_party_name:  bp?.company_name ?? p?.name ?? "Business",
              other_party_image: bp?.logo_url ?? null,
            };
          })
        );
        setContracts(enriched);
      } else {
        // Business: contracts I sent
        const { data: rows, error } = await (supabase as any)
          .from("contracts")
          .select(`
            id, campaign_id, campaign_title, title, terms, status,
            sent_at, accepted_at, signed_at, signer_email,
            declined_at, decline_reason, created_at,
            creator_id, business_name, creator_name,
            deliverables_json, amount_cents, currency, due_date,
            ownership_clause, usage_rights, cancellation_terms, contract_version
          `)
          .eq("business_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const enriched: Contract[] = await Promise.all(
          (rows ?? []).map(async (row: any) => {
            const { data: cp } = await (supabase as any)
              .from("creator_profiles")
              .select("display_name, profile_image_url")
              .eq("user_id", row.creator_id)
              .maybeSingle();
            const { data: p } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", row.creator_id)
              .maybeSingle();
            return {
              ...row,
              other_party_name:  cp?.display_name ?? p?.name ?? "Creator",
              other_party_image: cp?.profile_image_url ?? null,
            };
          })
        );
        setContracts(enriched);
      }
    } catch (err) {
      console.error("Contracts load error:", err);
      toast.error("Failed to load contracts");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ── Sign & Accept (uses server-side RPC: stores snapshot, IP, UA, signer email) ──
  async function handleAccept(contractId: string) {
    if (!user) return;
    setAccepting(contractId);
    try {
      const { data, error } = await (supabase as any).rpc("sign_contract", {
        p_contract_id: contractId,
        p_user_agent:  navigator.userAgent,
        p_ip_address:  null,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const signedAt = data?.signed_at ?? new Date().toISOString();
      setContracts(prev =>
        prev.map(c => c.id === contractId
          ? { ...c, status: "accepted" as ContractStatus, accepted_at: signedAt, signed_at: signedAt }
          : c
        )
      );
      toast.success("Contract signed and accepted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign contract";
      toast.error(msg);
    } finally {
      setAccepting(null);
    }
  }

  // ── Decline ──
  async function handleDecline(contractId: string, reason?: string) {
    if (!user) return;
    setDeclining(contractId);
    try {
      const { error } = await (supabase as any)
        .from("contracts")
        .update({
          status:         "declined",
          declined_at:    new Date().toISOString(),
          decline_reason: reason ?? null,
        })
        .eq("id", contractId)
        .eq("creator_id", user.id);
      if (error) throw error;
      setContracts(prev =>
        prev.map(c => c.id === contractId
          ? { ...c, status: "declined" as ContractStatus, declined_at: new Date().toISOString(), decline_reason: reason ?? null }
          : c
        )
      );
      toast.success("Contract declined");
    } catch {
      toast.error("Failed to decline contract");
    } finally {
      setDeclining(null);
    }
  }

  // ── Tab filter ──
  const [tab, setTab] = useState<"all" | ContractStatus>("all");
  const filtered = tab === "all" ? contracts : contracts.filter(c => c.status === tab);

  // ── Counts ──
  const pendingCount = contracts.filter(c => c.status === "sent").length;

  return (
    <div className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-3xl mx-auto w-full">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-5 w-5" style={{ color: C.chrome }} />
          <h1 className="text-[22px] font-bold leading-tight" style={{ color: C.text }}>
            Contracts
          </h1>
          {pendingCount > 0 && isCreator && (
            <span
              className="text-[10px] font-bold rounded-full px-2 py-0.5 ml-1"
              style={{ background: C.chrome, color: "oklch(0.06 0 0)" }}
            >
              {pendingCount} pending
            </span>
          )}
        </div>
        <p className="text-[13px]" style={{ color: C.muted }}>
          {isCreator
            ? "Contracts sent to you by businesses. Review the terms before accepting."
            : "Contracts you've sent to creators. Track acceptance status here."}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 flex-wrap">
        {(["all", "sent", "accepted", "declined"] as const).map((t) => {
          const count = t === "all" ? contracts.length : contracts.filter(c => c.status === t).length;
          const active = tab === t;
          const label  = t === "all" ? "All" : STATUS[t as ContractStatus]?.label ?? t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[12px] font-medium transition-all duration-100"
              style={{
                background: active ? "oklch(1 0 0 / 10%)"  : "oklch(1 0 0 / 4%)",
                color:      active ? C.text                : C.muted,
                border:     active ? `1px solid oklch(1 0 0 / 18%)` : "1px solid oklch(1 0 0 / 8%)",
              }}
            >
              {label}
              {count > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    background: active ? "oklch(1 0 0 / 16%)" : "oklch(1 0 0 / 8%)",
                    color:      active ? C.text               : C.faint,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-[72px] animate-pulse" style={{ background: "oklch(1 0 0 / 4%)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center"
          style={{ background: C.surface, border: `1px solid ${C.border}` }}
        >
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 10%)" }}
          >
            <FileText className="h-6 w-6" style={{ color: C.muted }} />
          </div>
          <p className="text-[14px] font-semibold mb-1" style={{ color: C.text }}>
            {tab === "all"
              ? isCreator ? "No contracts yet" : "No contracts sent yet"
              : `No ${STATUS[tab as ContractStatus]?.label.toLowerCase() ?? tab} contracts`}
          </p>
          <p className="text-[12px] max-w-[280px]" style={{ color: C.muted }}>
            {tab === "all" && isCreator
              ? "When a business sends you a contract, it will appear here."
              : tab === "all"
              ? "Send contracts to accepted creators from the campaign applicants page."
              : `No contracts with status "${STATUS[tab as ContractStatus]?.label ?? tab}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(contract => (
            <ContractRow
              key={contract.id}
              contract={contract}
              isCreator={isCreator}
              onAccept={(id) => handleAccept(id)}
              onDecline={(id, reason) => handleDecline(id, reason)}
              accepting={accepting}
              declining={declining}
            />
          ))}
        </div>
      )}
    </div>
  );
}
