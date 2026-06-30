// ─────────────────────────────────────────────────────────────────────────────
// RatingsDisplay — compact gold star rating chip
// Shows: ★ 4.9  (32 reviews)
// ─────────────────────────────────────────────────────────────────────────────

interface RatingsDisplayProps {
  avgRating?:   number | null;
  reviewCount?: number;
  /** "compact"  → inline text  ★ 4.9 (32)   — for cards, popups, sidebars
   *  "badge"    → pill chip  ★ 4.9 (32)   — for profile headers */
  variant?: "compact" | "badge";
}

const GOLD = "oklch(0.70 0.08 68)";

export function RatingsDisplay({
  avgRating,
  reviewCount = 0,
  variant = "compact",
}: RatingsDisplayProps) {
  if (!avgRating || reviewCount === 0) return null;

  const display = avgRating.toFixed(1);

  if (variant === "badge") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
        style={{
          background: "oklch(1 0 0 / 8%)",
          border:     "1px solid oklch(1 0 0 / 20%)",
          color:      GOLD,
        }}
      >
        ★ {display}
        <span className="font-normal" style={{ color: "oklch(0.82 0.005 0 / 65%)" }}>
          ({reviewCount})
        </span>
      </span>
    );
  }

  // compact
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold"
      style={{ color: GOLD }}
    >
      ★ {display}
      <span className="font-normal" style={{ color: "oklch(0.82 0.005 0 / 65%)" }}>
        ({reviewCount})
      </span>
    </span>
  );
}
