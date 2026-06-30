/**
 * MRKT Canonical Design Tokens
 *
 * Single source of truth for all component inline styles.
 * Import C from here — do not define local token objects in page files.
 *
 * Philosophy: Apple Intelligence aesthetic.
 * Pure black foundation. Chrome brand. Soft AI blue for intelligence.
 * Status colors only where they carry meaning.
 */

export const C = {
  // ── Foundation ──────────────────────────────────────────────────────────
  canvas:       "#000000",                     // body / page bg — pure black
  base:         "oklch(0.065 0 0)",            // #0A0A0A — sidebar, nav, chrome areas
  surface:      "oklch(0.10 0 0)",             // #111111 — cards, panels
  raised:       "oklch(0.135 0 0)",            // elevated within cards
  high:         "oklch(0.17 0 0)",             // highest foreground elevation
  overlay:      "oklch(0 0 0 / 72%)",          // modal / drawer backdrop

  // ── Borders ─────────────────────────────────────────────────────────────
  borderFaint:  "oklch(1 0 0 / 6%)",
  borderSubtle: "oklch(1 0 0 / 8%)",           // default card border
  borderNormal: "oklch(1 0 0 / 12%)",          // interactive / hover border
  borderStrong: "oklch(1 0 0 / 18%)",          // prominent border
  borderFocus:  "oklch(1 0 0 / 28%)",          // focus ring
  // Short alias (matches pages that use C.border)
  border:       "oklch(1 0 0 / 8%)",

  // ── Shadows ─────────────────────────────────────────────────────────────
  shadowCard:    "inset 0 1px 0 oklch(1 0 0 / 8%), 0 2px 8px oklch(0 0 0 / 55%), 0 1px 2px oklch(0 0 0 / 40%)",
  shadowWidget:  "inset 0 1px 0 oklch(1 0 0 / 8%), 0 4px 16px oklch(0 0 0 / 55%)",
  shadowComposer:"inset 0 1px 0 oklch(1 0 0 / 12%), 0 8px 40px oklch(0 0 0 / 60%), 0 2px 8px oklch(0 0 0 / 45%)",

  // ── Text ────────────────────────────────────────────────────────────────
  textPrimary:    "oklch(1 0 0)",              // pure white — headings, key values
  textSecondary:  "oklch(1 0 0 / 65%)",        // body text
  textTertiary:   "oklch(1 0 0 / 40%)",        // labels, metadata
  textQuaternary: "oklch(1 0 0 / 28%)",        // very subtle
  textMuted:      "oklch(1 0 0 / 20%)",        // barely visible
  // Short aliases (for pages that use C.text / C.muted / C.faint)
  text:           "oklch(1 0 0)",
  muted:          "oklch(1 0 0 / 40%)",
  faint:          "oklch(1 0 0 / 26%)",
  // Additional alias patterns
  textSub:        "oklch(1 0 0 / 65%)",

  // ── Chrome — MRKT brand silver ───────────────────────────────────────────
  chrome:   "oklch(0.84 0 0)",

  // ── Apple Intelligence Blue ──────────────────────────────────────────────
  // #7DB7FF — soft premium, NOT neon. Use only for AI, active states, focus.
  aiBlue:       "oklch(0.72 0.10 224)",
  aiBlueGlow:   "oklch(0.72 0.10 224 / 16%)",
  aiBlueGlowSm: "oklch(0.72 0.10 224 / 10%)",
  aiBlueBorder: "oklch(0.72 0.10 224 / 24%)",
  // Unified accent aliases — always AI blue, never chrome
  accent:       "oklch(0.72 0.10 224)",
  accentMuted:  "oklch(0.72 0.10 224 / 14%)",
  accentBorder: "oklch(0.72 0.10 224 / 22%)",
  blue:         "oklch(0.72 0.10 224)",
  blueBg:       "oklch(0.72 0.10 224 / 14%)",
  blueBorder:   "oklch(0.72 0.10 224 / 22%)",

  // ── Muted Emerald — Success / Approved / Earned / Live ──────────────────
  // Sophisticated deep emerald — not neon, not Apple bright green
  green:       "oklch(0.62 0.12 158)",
  greenMuted:  "oklch(0.62 0.12 158 / 10%)",
  greenBorder: "oklch(0.62 0.12 158 / 18%)",

  // ── Titanium Gold — Pending / Review / Attention ─────────────────────────
  // Warm aerospace gold — not yellow, not orange
  amber:       "oklch(0.70 0.08 68)",
  amberMuted:  "oklch(0.70 0.08 68 / 10%)",
  amberBorder: "oklch(0.70 0.08 68 / 18%)",

  // ── Deep Muted Red — Error / Rejected / Destructive ─────────────────────
  // Serious, not alarm-y — high-end error state
  red:       "oklch(0.52 0.15 24)",
  redMuted:  "oklch(0.52 0.15 24 / 10%)",
  redBorder: "oklch(0.52 0.15 24 / 18%)",

  // ── Hover utility aliases ────────────────────────────────────────────────
  surfaceHov:  "oklch(0.13 0 0)",
  borderHov:   "oklch(1 0 0 / 14%)",
  raisedHover: "oklch(0.16 0 0)",

  // ── Misc aliases for page-specific patterns ───────────────────────────────
  bg:          "#000000",
  accentBg:    "oklch(0.72 0.10 224 / 14%)",
  greenBg:     "oklch(0.62 0.12 158 / 10%)",
  amberBg:     "oklch(0.70 0.08 68 / 10%)",
  redBg:       "oklch(0.52 0.15 24 / 10%)",
  yellow:      "oklch(0.70 0.08 68)",           // → titanium gold (not yellow)

  // ── Semantic aliases (page-compat) ────────────────────────────────────────
  borderMid:   "oklch(1 0 0 / 12%)",           // alias → borderNormal
  gold:        "oklch(0.70 0.08 68)",           // → titanium gold (star ratings, earnings)
  dim:         "oklch(1 0 0 / 20%)",            // dimmed / disabled text
  yellowMuted: "oklch(0.70 0.08 68 / 10%)",    // alias → amberMuted
  textFaint:   "oklch(1 0 0 / 20%)",            // alias → textMuted
  active:      "oklch(0.72 0.10 224 / 16%)",   // active row bg (messages sidebar)
  sidebar:     "oklch(0.065 0 0)",              // sidebar bg (messages)

  // ── Shadow aliases ────────────────────────────────────────────────────────
  shadowPanel: "inset 0 1px 0 oklch(1 0 0 / 8%), 0 4px 20px oklch(0 0 0 / 60%)",
  shadowModal: "inset 0 1px 0 oklch(1 0 0 / 10%), 0 8px 40px oklch(0 0 0 / 65%), 0 2px 8px oklch(0 0 0 / 40%)",

  // ── Text hierarchy aliases (instagram-callback compat) ───────────────────
  text1:       "oklch(1 0 0)",                  // alias → textPrimary
  text2:       "oklch(1 0 0 / 65%)",            // alias → textSecondary
  text3:       "oklch(1 0 0 / 40%)",            // alias → textTertiary
} as const;

export type DesignTokens = typeof C;
