// ─────────────────────────────────────────────────────────────────────────────
// StarRating — interactive and read-only star rating component
// Amber star color: oklch(0.70 0.08 68)
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";

const GOLD  = "oklch(0.70 0.08 68)";
const EMPTY = "oklch(1 0 0 / 18%)";

interface StarRatingProps {
  value: number;               // 0 = unset, 1–5 = rating
  onChange?: (v: number) => void;
  size?: number;               // px width/height per star (default 20)
  readOnly?: boolean;
  gap?: number;                // gap between stars in px (default 3)
}

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill={filled ? GOLD : EMPTY}
      aria-hidden="true"
    >
      <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.27l-4.94 2.43.94-5.49-4-3.9 5.53-.8z" />
    </svg>
  );
}

export function StarRating({
  value,
  onChange,
  size = 20,
  readOnly = false,
  gap = 3,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  if (readOnly) {
    return (
      <div className="flex items-center" style={{ gap }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} filled={i <= display} size={size} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center"
      style={{ gap }}
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          onMouseEnter={() => setHovered(i)}
          style={{
            padding: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            lineHeight: 0,
          }}
          aria-label={`Rate ${i} star${i !== 1 ? "s" : ""}`}
        >
          <Star filled={i <= display} size={size} />
        </button>
      ))}
    </div>
  );
}
