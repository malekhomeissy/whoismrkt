import { C } from "@/lib/theme";
import { ShieldCheck, AlertTriangle, Instagram, Clock, CheckCircle2, ChevronDown } from "lucide-react";
import { useState } from "react";

export interface MatchExplanationData {
  score: number;
  success_probability: number;
  strengths: string[];
  warnings: string[];
  breakdown: {
    platform:     number;
    niche:        number;
    audience:     number;
    location:     number;
    requirements: number;
  };
  trust_tier: string;
  trust_score: number;
  instagram_verified: boolean;
  total_campaigns: number;
  avg_rating: number | null;
  avg_response_time_hours: number | null;
}

const TIER_LABELS: Record<string, string> = {
  elite:    "Elite",
  trusted:  "Trusted",
  reliable: "Reliable",
  rising:   "Rising",
  new:      "New",
};

const TIER_COLORS: Record<string, string> = {
  elite:    "oklch(0.70 0.08 68)",
  trusted:  "oklch(0.72 0.10 224)",
  reliable: "oklch(0.62 0.12 158)",
  rising:   "oklch(0.70 0.08 68)",
  new:      "oklch(1 0 0 / 38%)",
};

function scoreColor(s: number): string {
  if (s >= 75) return "oklch(0.62 0.12 158)";
  if (s >= 50) return "oklch(0.70 0.08 68)";
  return "oklch(0.52 0.15 24)";
}

function DimBar({ label, value }: { label: string; value: number }) {
  const c = scoreColor(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px]" style={{ color: C.muted }}>{label}</span>
        <span className="text-[10.5px] font-semibold tabular-nums" style={{ color: c }}>{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 7%)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: c }} />
      </div>
    </div>
  );
}

/**
 * Full match explanation panel. Shows score, success probability,
 * strengths, warnings, dimension breakdown, and trust tier.
 *
 * Collapsible — collapsed by default, expands on click.
 */
export function MatchExplanation({
  data,
  defaultOpen = false,
}: {
  data: MatchExplanationData;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sc = scoreColor(data.score);
  const tierLabel = TIER_LABELS[data.trust_tier] ?? data.trust_tier;
  const tierColor = TIER_COLORS[data.trust_tier] ?? "oklch(1 0 0 / 40%)";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid oklch(1 0 0 / 9%)` }}
    >
      {/* Header — always visible, click to expand */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left gap-3"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <div className="flex items-center gap-3">
          {/* Score ring */}
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-display font-bold text-[13px]"
            style={{
              background: "oklch(1 0 0 / 4%)",
              border: `2px solid ${sc}`,
              color: sc,
              boxShadow: `0 0 12px ${sc}30`,
            }}
          >
            {data.score}
          </div>

          <div>
            <div className="text-[13px] font-semibold" style={{ color: C.text }}>
              {data.score}% Match
            </div>
            <div className="text-[10.5px] mt-0.5" style={{ color: C.faint }}>
              {data.success_probability}% success likelihood · {tierLabel} creator
            </div>
          </div>
        </div>

        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
          style={{ color: C.faint, transform: open ? "rotate(180deg)" : "" }}
        />
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: `1px solid oklch(1 0 0 / 8%)` }}>

          {/* Success probability bar */}
          <div className="pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] uppercase tracking-[0.22em] font-medium" style={{ color: C.faint }}>
                Success likelihood
              </span>
              <span className="text-[12px] font-bold tabular-nums" style={{ color: scoreColor(data.success_probability) }}>
                {data.success_probability}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 7%)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${data.success_probability}%`, background: scoreColor(data.success_probability) }}
              />
            </div>
          </div>

          {/* Strengths */}
          {data.strengths.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] font-medium mb-2" style={{ color: C.faint }}>
                Why this matches
              </div>
              <div className="space-y-1.5">
                {data.strengths.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "oklch(0.62 0.12 158)" }} />
                    <span className="text-[12px]" style={{ color: C.muted }}>{s}</span>
                  </div>
                ))}
                {data.instagram_verified && !data.strengths.includes("Verified Instagram") && (
                  <div className="flex items-center gap-2">
                    <Instagram className="h-3 w-3 shrink-0" style={{ color: "oklch(0.72 0.10 224)" }} />
                    <span className="text-[12px]" style={{ color: C.muted }}>Verified Instagram account</span>
                  </div>
                )}
                {data.avg_response_time_hours != null && data.avg_response_time_hours <= 6 && !data.strengths.includes("Fast responder") && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 shrink-0" style={{ color: "oklch(0.70 0.08 68)" }} />
                    <span className="text-[12px]" style={{ color: C.muted }}>
                      Fast responder ({data.avg_response_time_hours.toFixed(0)}h avg)
                    </span>
                  </div>
                )}
                {data.total_campaigns >= 3 && (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3 shrink-0" style={{ color: tierColor }} />
                    <span className="text-[12px]" style={{ color: C.muted }}>
                      {tierLabel} creator · {data.total_campaigns} campaigns
                      {data.avg_rating ? ` · ${data.avg_rating.toFixed(1)}★` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] font-medium mb-2" style={{ color: C.faint }}>
                Considerations
              </div>
              <div className="space-y-1.5">
                {data.warnings.map((w) => (
                  <div key={w} className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: "oklch(0.70 0.08 68)" }} />
                    <span className="text-[12px]" style={{ color: C.muted }}>{w}</span>
                  </div>
                ))}
                {!data.instagram_verified && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: "oklch(1 0 0 / 22%)" }} />
                    <span className="text-[12px]" style={{ color: C.faint }}>Follower count is self-reported</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dimension breakdown */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] font-medium mb-3" style={{ color: C.faint }}>
              Score breakdown
            </div>
            <div className="space-y-2">
              <DimBar label="Platform alignment"  value={data.breakdown.platform}     />
              <DimBar label="Niche fit"           value={data.breakdown.niche}        />
              <DimBar label="Audience size"       value={data.breakdown.audience}     />
              <DimBar label="Location match"      value={data.breakdown.location}     />
              <DimBar label="Budget & content"    value={data.breakdown.requirements} />
            </div>
          </div>

          {/* Trust tier */}
          <div
            className="flex items-center justify-between rounded-xl px-3.5 py-2.5"
            style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid oklch(1 0 0 / 8%)` }}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: tierColor }} />
              <span className="text-[12px] font-medium" style={{ color: C.muted }}>Trust tier</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                style={{
                  color: tierColor,
                  background: `${tierColor}18`,
                  border: `1px solid ${tierColor}30`,
                }}
              >
                {tierLabel}
              </span>
              <span className="text-[11px] tabular-nums" style={{ color: C.faint }}>
                {data.trust_score}/100
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
