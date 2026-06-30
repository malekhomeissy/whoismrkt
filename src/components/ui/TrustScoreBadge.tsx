import { ShieldCheck } from "lucide-react";
import type { TrustTier } from "@/lib/matchScore";
import { TRUST_TIER_CONFIG } from "@/lib/matchScore";

interface TrustScoreBadgeProps {
  score:   number;
  tier:    TrustTier;
  size?:   "sm" | "md" | "lg";
  showScore?: boolean;
}

export function TrustScoreBadge({ score, tier, size = "md", showScore = true }: TrustScoreBadgeProps) {
  const cfg = TRUST_TIER_CONFIG[tier];

  const px    = size === "sm" ? "px-2 py-0.5" : size === "lg" ? "px-3.5 py-1.5" : "px-2.5 py-1";
  const text  = size === "sm" ? "text-[9.5px]" : size === "lg" ? "text-[13px]" : "text-[10.5px]";
  const icon  = size === "sm" ? "h-2.5 w-2.5" : size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${px} ${text}`}
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <ShieldCheck className={icon} />
      {showScore && <span>{score}</span>}
      <span>{cfg.label}</span>
    </div>
  );
}
