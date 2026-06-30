// ─────────────────────────────────────────────────────────────────────────────
// VerifiedBadge — role-specific verification badges
//
// Creator badge:  solid white circle, black checkmark — premium, Apple-like
// Business badge: dark circle, chrome gradient ring + checkmark
//
// Usage:  <VerifiedBadge type="creator"  size="sm" />
//         <VerifiedBadge type="business" size="md" />
// ─────────────────────────────────────────────────────────────────────────────

import type { SVGProps } from "react";

type BadgeSize = "xs" | "sm" | "md" | "lg";
type BadgeType = "creator" | "business";

const SIZE_PX: Record<BadgeSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
};

interface VerifiedBadgeProps extends SVGProps<SVGSVGElement> {
  size?: BadgeSize;
  type?: BadgeType;
  className?: string;
}

// ─── Creator Badge ────────────────────────────────────────────────────────────
// Electric blue circle + white tick — AI-trust, verification, intelligence.

function CreatorBadge({ px, tooltip, className, ...rest }: {
  px: number; tooltip: string; className: string;
} & SVGProps<SVGSVGElement>) {
  const gradId = `vb-creator-grad-${px}`;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={tooltip}
      className={`shrink-0 ${className}`}
      style={{ display: "inline-block", verticalAlign: "middle" }}
      {...rest}
    >
      <title>{tooltip}</title>
      <defs>
        <linearGradient id={gradId} x1="2" y1="2" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6BA8FF" />
          <stop offset="100%" stopColor="#3B72F0" />
        </linearGradient>
      </defs>

      {/* Electric blue filled circle */}
      <circle cx="10" cy="10" r="8.5" fill={`url(#${gradId})`} />

      {/* White checkmark */}
      <path
        d="M6.2 10.1L8.8 12.8L13.8 7.2"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Business Badge ───────────────────────────────────────────────────────────
// Dark circle + chrome gradient ring + chrome checkmark — premium enterprise feel.

function BusinessBadge({ px, tooltip, className, ...rest }: {
  px: number; tooltip: string; className: string;
} & SVGProps<SVGSVGElement>) {
  const ringId = `vb-ring-business-${px}`;
  const markId = `vb-mark-business-${px}`;
  const glowId = `vb-glow-business-${px}`;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={tooltip}
      className={`shrink-0 ${className}`}
      style={{ display: "inline-block", verticalAlign: "middle" }}
      {...rest}
    >
      <title>{tooltip}</title>

      <defs>
        <linearGradient id={ringId} x1="2" y1="2" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#E8E8E8" stopOpacity="0.95" />
          <stop offset="35%"  stopColor="#C8C8C8" stopOpacity="0.90" />
          <stop offset="65%"  stopColor="#D4D4D4" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#787878" stopOpacity="0.80" />
        </linearGradient>

        <linearGradient id={markId} x1="5" y1="8" x2="15" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#F0F0F0" />
          <stop offset="50%"  stopColor="#D8D8D8" />
          <stop offset="100%" stopColor="#A0A0A0" />
        </linearGradient>

        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Dark fill */}
      <circle cx="10" cy="10" r="8.5" fill="oklch(0.07 0 0)" />

      {/* Chrome ring */}
      <circle
        cx="10" cy="10" r="8.5"
        stroke={`url(#${ringId})`}
        strokeWidth="1.4"
        fill="none"
        filter={`url(#${glowId})`}
      />

      {/* Chrome checkmark */}
      <path
        d="M6.2 10.1L8.8 12.8L13.8 7.2"
        stroke={`url(#${markId})`}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function VerifiedBadge({
  size      = "md",
  type      = "creator",
  className = "",
  ...rest
}: VerifiedBadgeProps) {
  const px      = SIZE_PX[size];
  const tooltip = type === "creator" ? "Verified Creator" : "Verified Business";

  if (type === "creator") {
    return <CreatorBadge px={px} tooltip={tooltip} className={className} {...rest} />;
  }
  return <BusinessBadge px={px} tooltip={tooltip} className={className} {...rest} />;
}

// ─── Beta Pioneer Badge ───────────────────────────────────────────────────────
// Amber-gold octagon with a bolt — early adopter, first-mover status.

export function BetaPioneerBadge({
  size      = "md",
  className = "",
  ...rest
}: Omit<VerifiedBadgeProps, "type">) {
  const px      = SIZE_PX[size];
  const gradId  = `bp-grad-${px}`;
  const glowId  = `bp-glow-${px}`;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Beta Pioneer"
      className={`shrink-0 ${className}`}
      style={{ display: "inline-block", verticalAlign: "middle" }}
      {...rest}
    >
      <title>Beta Pioneer — MRKT early adopter</title>
      <defs>
        <linearGradient id={gradId} x1="2" y1="2" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#F5C842" />
          <stop offset="100%" stopColor="#E09520" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Amber filled circle */}
      <circle cx="10" cy="10" r="8.5" fill={`url(#${gradId})`} filter={`url(#${glowId})`} />

      {/* White bolt (Zap shape) */}
      <path
        d="M11.5 4L7 11h3.5L8.5 16L14 9h-3.5L11.5 4z"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}
