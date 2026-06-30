// ─────────────────────────────────────────────────────────────────────────────
// MatchScoreBadge — compact pill shown on cards / list items
// MatchScoreBreakdownPanel — expandable detail panel
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  scoreColor, scoreBg, scoreBorder,
  SCORE_DIMENSION_LABELS,
  type MatchScoreBreakdown,
} from "@/lib/matchScore";
import { ChevronDown } from "lucide-react";

// ─── Compact badge ────────────────────────────────────────────────────────────

export function MatchScoreBadge({
  score,
  size = "sm",
  showLabel = false,
}: {
  score: number;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}) {
  const color  = scoreColor(score);
  const bg     = scoreBg(score);
  const border = scoreBorder(score);

  const fontSize = size === "xs" ? 9.5 : size === "md" ? 12 : 10.5;
  const px       = size === "xs" ? "6px 8px" : size === "md" ? "4px 12px" : "3px 9px";

  return (
    <span
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        gap:            4,
        padding:        px,
        borderRadius:   99,
        background:     bg,
        border:         `1px solid ${border}`,
        fontSize,
        fontWeight:     700,
        color,
        letterSpacing:  "-0.01em",
        fontVariantNumeric: "tabular-nums",
        whiteSpace:     "nowrap",
        flexShrink:     0,
      }}
    >
      {score}%
      {showLabel && (
        <span style={{ fontWeight: 500, opacity: 0.8, fontSize: fontSize - 0.5 }}>
          {" "}match
        </span>
      )}
    </span>
  );
}

// ─── Breakdown row ────────────────────────────────────────────────────────────

function BreakdownRow({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      <span
        style={{
          flex: "0 0 148px",
          fontSize: 11.5,
          color: "oklch(1 0 0 / 52%)",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 3,
          background: "oklch(1 0 0 / 7%)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width:        `${score}%`,
            height:       "100%",
            background:   color,
            borderRadius: 99,
            transition:   "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
      <span
        style={{
          flex: "0 0 32px",
          textAlign: "right",
          fontSize: 11,
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {score}%
      </span>
    </div>
  );
}

// ─── Breakdown panel — expandable ─────────────────────────────────────────────

export function MatchScoreBreakdownPanel({
  breakdown,
  defaultOpen = false,
}: {
  breakdown: MatchScoreBreakdown;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const color  = scoreColor(breakdown.total);

  const dimensions = (
    Object.entries(SCORE_DIMENSION_LABELS) as Array<
      [keyof typeof SCORE_DIMENSION_LABELS, string]
    >
  ).map(([key, label]) => ({ key, label, score: breakdown[key] }));

  return (
    <div
      style={{
        borderRadius:  10,
        border:        `1px solid ${scoreBorder(breakdown.total)}`,
        background:    scoreBg(breakdown.total),
        overflow:      "hidden",
      }}
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width:          "100%",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "10px 14px",
          background:     "transparent",
          border:         "none",
          cursor:         "pointer",
          fontFamily:     "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize:           17,
              fontWeight:         800,
              color,
              fontVariantNumeric: "tabular-nums",
              letterSpacing:      "-0.02em",
            }}
          >
            {breakdown.total}%
          </span>
          <span style={{ fontSize: 12, color: "oklch(1 0 0 / 44%)", fontWeight: 500 }}>
            match
          </span>
        </div>
        <ChevronDown
          style={{
            width:     14,
            height:    14,
            color:     "oklch(1 0 0 / 36%)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.18s ease",
          }}
        />
      </button>

      {/* Expanded breakdown */}
      {open && (
        <div
          style={{
            padding:    "4px 14px 12px",
            borderTop:  "1px solid oklch(1 0 0 / 8%)",
          }}
        >
          {dimensions.map((d) => (
            <BreakdownRow key={d.key} label={d.label} score={d.score} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inline breakdown — always open, no toggle ────────────────────────────────

export function MatchScoreInline({ breakdown }: { breakdown: MatchScoreBreakdown }) {
  const dimensions = (
    Object.entries(SCORE_DIMENSION_LABELS) as Array<
      [keyof typeof SCORE_DIMENSION_LABELS, string]
    >
  ).map(([key, label]) => ({ key, label, score: breakdown[key] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {dimensions.map((d) => (
        <BreakdownRow key={d.key} label={d.label} score={d.score} />
      ))}
    </div>
  );
}
