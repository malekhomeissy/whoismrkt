// ─────────────────────────────────────────────────────────────────────────────
// MRKT Creator Trust Score Engine
//
// Formula: behavioral base score + identity bonuses → tier assignment
//
// Base score (0-100), behavioral signals:
//   Completion rate   30%  — delivers what was agreed
//   Approval rate     25%  — brands approve their work
//   Average rating    25%  — actual quality rating (0-5 → normalized to 0-100)
//   Repeat rate       20%  — brands come back for more
//
// Identity bonuses (additive, capped at 100):
//   Beta Pioneer      +5   — early adopter signal; community trust
//   Verified          +10  — identity or business verified; brand confidence
//
// Tier thresholds (score after bonuses):
//   Elite    ≥ 88  — requires ≥ 15 campaigns (data confidence)
//   Trusted  ≥ 70  — requires ≥  5 campaigns
//   Rising   ≥ 45  — requires ≥  1 campaign
//   New      < 45  or insufficient campaign history
//
// Match score modifier per tier (from TRUST_TIER_CONFIG in matchScore.ts):
//   Elite   +8 pts   Trusted  +4 pts   Rising  +2 pts   New  +0 pts
// ─────────────────────────────────────────────────────────────────────────────

import type { TrustTier } from "./matchScore";

// ─── Input shape ──────────────────────────────────────────────────────────────

export interface TrustScoreInput {
  completion_rate:  number;  // 0-100, % of campaigns delivered
  approval_rate:    number;  // 0-100, % of submissions approved by brand
  avg_rating:       number;  // 0-5 star scale
  repeat_rate:      number;  // 0-100, % of brands who re-hired the creator
  total_campaigns:  number;  // total completed campaigns (gating signal)
  total_reviews:    number;  // total reviews received
  is_beta_pioneer:  boolean; // from profiles.is_beta_pioneer
  is_verified:      boolean; // from creator_profiles.is_verified
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const TRUST_IDENTITY_BONUSES = {
  is_beta_pioneer: 5,   // early community signal
  is_verified:     10,  // identity/business verification
} as const;

export const TRUST_TIER_THRESHOLDS: Record<Exclude<TrustTier, "new">, number> = {
  elite:   88,
  trusted: 70,
  rising:  45,
};

const MIN_CAMPAIGNS: Record<Exclude<TrustTier, "new">, number> = {
  elite:   15,
  trusted: 5,
  rising:  1,
};

// ─── Result shape ─────────────────────────────────────────────────────────────

export interface TrustScoreResult {
  score:         number;    // final score 0-100 (after bonuses)
  baseScore:     number;    // behavioral score before bonuses
  identityBonus: number;    // bonus from is_beta_pioneer + is_verified
  tier:          TrustTier;
}

// ─── Main computation ─────────────────────────────────────────────────────────

export function computeTrustScore(input: TrustScoreInput): TrustScoreResult {
  const identityBonus =
    (input.is_beta_pioneer ? TRUST_IDENTITY_BONUSES.is_beta_pioneer : 0) +
    (input.is_verified     ? TRUST_IDENTITY_BONUSES.is_verified     : 0);

  // New creators with no campaign history get only identity bonuses
  if (input.total_campaigns < MIN_CAMPAIGNS.rising) {
    return { score: identityBonus, baseScore: 0, identityBonus, tier: "new" };
  }

  // Normalize avg_rating (0-5) to 0-100
  const ratingNorm = Math.min(100, (input.avg_rating / 5) * 100);

  const baseScore = Math.round(
    input.completion_rate * 0.30 +
    input.approval_rate   * 0.25 +
    ratingNorm            * 0.25 +
    input.repeat_rate     * 0.20,
  );

  const score = Math.min(100, Math.max(0, baseScore + identityBonus));

  // Tier assignment — higher tiers require minimum campaign counts for data confidence
  let tier: TrustTier = "new";
  if (score >= TRUST_TIER_THRESHOLDS.elite && input.total_campaigns >= MIN_CAMPAIGNS.elite) {
    tier = "elite";
  } else if (score >= TRUST_TIER_THRESHOLDS.trusted && input.total_campaigns >= MIN_CAMPAIGNS.trusted) {
    tier = "trusted";
  } else if (score >= TRUST_TIER_THRESHOLDS.rising) {
    tier = "rising";
  }

  return { score, baseScore, identityBonus, tier };
}

// ─── Derive tier from stored score (for DB-read paths) ────────────────────────

export function tierFromScore(score: number, totalCampaigns: number): TrustTier {
  if (score >= TRUST_TIER_THRESHOLDS.elite   && totalCampaigns >= MIN_CAMPAIGNS.elite)   return "elite";
  if (score >= TRUST_TIER_THRESHOLDS.trusted && totalCampaigns >= MIN_CAMPAIGNS.trusted) return "trusted";
  if (score >= TRUST_TIER_THRESHOLDS.rising  && totalCampaigns >= MIN_CAMPAIGNS.rising)  return "rising";
  return "new";
}
