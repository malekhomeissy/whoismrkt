// ─────────────────────────────────────────────────────────────────────────────
// Verification — client-side profile completeness checks
// Mirrors the SQL trigger logic in 20260608000000_verification.sql exactly.
// Used for the profile verification status card and real-time feedback.
// ─────────────────────────────────────────────────────────────────────────────

export interface VerificationCheck {
  key:   string;
  label: string;
  met:   boolean;
}

export interface VerificationResult {
  verified: boolean;
  checks:   VerificationCheck[];
  /** 0–100 based on checks met */
  score:    number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Creator — 6 checks
// ─────────────────────────────────────────────────────────────────────────────

interface CreatorInput {
  display_name?:      string | null;
  profile_image_url?: string | null;
  bio?:               string | null;
  platforms?:         string[] | null;
  follower_count?:    number  | null;
  audience_location?: string  | null;
  audience_age_range?:string  | null;
  media_kit_url?:     string  | null;
  featured_link_1?:   string  | null;
  featured_link_2?:   string  | null;
  featured_link_3?:   string  | null;
}

export function computeCreatorVerification(cp: CreatorInput | null): VerificationResult {
  const checks: VerificationCheck[] = [
    {
      key:   "profile",
      label: "Profile complete",
      met:   !!cp?.display_name?.trim(),
    },
    {
      key:   "avatar",
      label: "Avatar uploaded",
      met:   !!cp?.profile_image_url,
    },
    {
      key:   "bio",
      label: "Bio added",
      met:   !!cp?.bio?.trim(),
    },
    {
      key:   "platforms",
      label: "Platforms added",
      met:   (cp?.platforms?.length ?? 0) > 0,
    },
    {
      key:   "audience",
      label: "Audience info added",
      met:   !!(cp?.follower_count || cp?.audience_location || cp?.audience_age_range),
    },
    {
      key:   "portfolio",
      label: "Portfolio or Media Kit added",
      met:   !!(cp?.media_kit_url || cp?.featured_link_1 || cp?.featured_link_2 || cp?.featured_link_3),
    },
  ];

  const metCount = checks.filter((c) => c.met).length;
  return {
    verified: metCount === checks.length,
    checks,
    score: Math.round((metCount / checks.length) * 100),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Business — 6 checks
// ─────────────────────────────────────────────────────────────────────────────

interface BusinessInput {
  company_name?: string | null;
  logo_url?:     string | null;
  description?:  string | null;
  website?:      string | null;
  industry?:     string | null;
  location?:     string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MRKT Creator Verification — follower-based trust tier
//
// Verification = Instagram followers. Nothing else.
// Profile completion is onboarding — these are separate systems.
//
// Tiers:
//   organic_70k   — 70,000+ followers → auto-verified, white badge
//   paid_10k_plus — purchased (10,000+ followers required)
//   eligible_paid — 10,000–69,999 followers → can purchase
//   not_eligible  — under 10,000 followers
// ─────────────────────────────────────────────────────────────────────────────

export type CreatorVerificationTier =
  | "not_eligible"    // < 10k followers
  | "eligible_paid"   // 10k–69,999 followers — eligible to purchase
  | "organic_70k"     // 70k+ followers — auto-verified
  | "paid_10k_plus";  // purchased verification

export interface CreatorMrktVerification {
  tier:        CreatorVerificationTier;
  isVerified:  boolean;
  igFollowers: number;
}

interface MrktVerificationInput {
  instagram_followers?:       number | null;
  is_verified?:               boolean;
  creator_verification_type?: string | null;
}

export function computeCreatorMrktVerification(
  cp: MrktVerificationInput | null,
): CreatorMrktVerification {
  const igFollowers = cp?.instagram_followers ?? 0;

  // Preserve paid verification set by payment flow
  if (cp?.is_verified && cp?.creator_verification_type === "paid_10k_plus") {
    return { tier: "paid_10k_plus", isVerified: true, igFollowers };
  }

  // Automatic — 70k+
  if (igFollowers >= 70_000) {
    return { tier: "organic_70k", isVerified: true, igFollowers };
  }

  // Eligible for paid — 10k–69,999
  if (igFollowers >= 10_000) {
    return { tier: "eligible_paid", isVerified: false, igFollowers };
  }

  // Not eligible — under 10k
  return { tier: "not_eligible", isVerified: false, igFollowers };
}

export function computeBusinessVerification(bp: BusinessInput | null): VerificationResult {
  const checks: VerificationCheck[] = [
    {
      key:   "name",
      label: "Company name added",
      met:   !!bp?.company_name?.trim(),
    },
    {
      key:   "logo",
      label: "Company logo uploaded",
      met:   !!bp?.logo_url,
    },
    {
      key:   "description",
      label: "Description added",
      met:   !!bp?.description?.trim(),
    },
    {
      key:   "website",
      label: "Website added",
      met:   !!bp?.website?.trim(),
    },
    {
      key:   "industry",
      label: "Industry selected",
      met:   !!bp?.industry?.trim(),
    },
    {
      key:   "location",
      label: "Location added",
      met:   !!bp?.location?.trim(),
    },
  ];

  const metCount = checks.filter((c) => c.met).length;
  return {
    verified: metCount === checks.length,
    checks,
    score: Math.round((metCount / checks.length) * 100),
  };
}
