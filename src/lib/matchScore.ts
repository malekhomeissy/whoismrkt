// ─────────────────────────────────────────────────────────────────────────────
// MRKT Match Score Engine
//
// Computes creator ↔ campaign compatibility as a weighted percentage.
//
// Dimension weights:
//   Platform      25%  — does the creator post on required platforms?
//   Niche         25%  — does the creator's content align with the campaign?
//   Audience      20%  — does the creator's audience match where the brand needs?
//   Location      15%  — is the creator in the right market?
//   Requirements  15%  — followers, language, content type fit
//
// All scores are 0-100. Total is a weighted sum, always 0-100.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreatorInput {
  platforms:              string[];
  niche:                  string | null;
  categories:             string[];
  audience_location:      string | null;
  location:               string | null;
  location_city?:         string | null;
  location_country?:      string | null;
  follower_count:         number | null;
  primary_language:       string | null;
  accepts_paid:           boolean;
  accepts_gifted:         boolean;
  accepts_affiliate:      boolean;
  preferred_content_types?: string[];
}

export interface CampaignInput {
  required_platforms: string[];
  required_niches:    string[];
  business_industry:  string | null;
  required_country:   string | null;
  required_language:  string | null;
  min_followers:      number | null;
  compensation_type:  string;
  deliverables?:      Array<{ platform: string; content_type?: string }>;
}

export interface MatchScoreBreakdown {
  total:        number; // 0-100
  platform:     number;
  niche:        number;
  audience:     number;
  location:     number;
  requirements: number;
  trustModifier?: number; // bonus/penalty from creator trust score (-8 to +8)
}

// ─── Trust tier types ─────────────────────────────────────────────────────────

export type TrustTier = "new" | "rising" | "trusted" | "elite";

export interface CreatorTrustScore {
  score:             number;
  tier:              TrustTier;
  completion_rate:   number;
  approval_rate:     number;
  avg_rating:        number;
  repeat_rate:       number;
  total_campaigns:   number;
  total_reviews:     number;
  last_computed_at:  string;
  // Identity signals — loaded from profiles/creator_profiles alongside the trust row
  is_beta_pioneer?:  boolean;
  is_verified?:      boolean;
}

export interface BusinessTrustScore {
  score:               number;
  tier:                TrustTier;
  payment_rate:        number;
  contract_completion: number;
  avg_rating_given:    number;
  repeat_creator_rate: number;
  total_campaigns:     number;
  total_reviews_given: number;
  last_computed_at:    string;
}

// ─── Trust tier config ────────────────────────────────────────────────────────

export const TRUST_TIER_CONFIG: Record<TrustTier, {
  label: string; color: string; bg: string; border: string; matchModifier: number;
}> = {
  elite:   { label: "Elite",   color: "oklch(0.70 0.08 68)",  bg: "oklch(0.78 0.14 76 / 10%)", border: "oklch(0.78 0.14 76 / 28%)", matchModifier: +8  },
  trusted: { label: "Trusted", color: "oklch(0.62 0.12 158)", bg: "oklch(0.72 0.18 152 / 10%)", border: "oklch(0.72 0.18 152 / 24%)", matchModifier: +4  },
  rising:  { label: "Rising",  color: "oklch(0.72 0.10 224)", bg: "oklch(0.62 0.10 224 / 10%)", border: "oklch(0.62 0.10 224 / 22%)", matchModifier: +2  },
  new:     { label: "New",     color: "oklch(1 0 0 / 45%)",   bg: "oklch(1 0 0 / 4%)",          border: "oklch(1 0 0 / 10%)",         matchModifier:  0  },
};

// ─── Industry → creator category mapping ────────────────────────────────────

const INDUSTRY_CATS: Record<string, string[]> = {
  "fashion & apparel":   ["fashion", "lifestyle"],
  "beauty & skincare":   ["beauty", "lifestyle"],
  "food & beverage":     ["food", "lifestyle"],
  "health & fitness":    ["fitness", "lifestyle"],
  "technology":          ["tech", "business"],
  "travel & hospitality":["travel", "lifestyle"],
  "entertainment":       ["gaming", "lifestyle", "fashion"],
  "home & lifestyle":    ["lifestyle"],
  "finance":             ["business"],
  "education":           ["business", "tech"],
  "retail & e-commerce": ["fashion", "lifestyle"],
};

// Remote / no-location-constraint keywords
const REMOTE_KEYWORDS = new Set(["remote", "worldwide", "anywhere", "global", "all"]);

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => n && haystack.includes(n));
}

// ─── Dimension 1: Platform (25%) ─────────────────────────────────────────────

function scorePlatform(
  creatorPlatforms: string[],
  required: string[],
): number {
  if (!required || required.length === 0) return 100; // no constraint

  const creatorNorm = creatorPlatforms.map(normalize);
  const overlap = required.filter((p) => creatorNorm.includes(normalize(p))).length;
  return Math.round((overlap / required.length) * 100);
}

// ─── Dimension 2: Niche (25%) ─────────────────────────────────────────────

function scoreNiche(creator: CreatorInput, campaign: CampaignInput): number {
  const required  = campaign.required_niches ?? [];
  const industry  = normalize(campaign.business_industry ?? "");
  const cNiche    = normalize(creator.niche ?? "");
  const cCats     = creator.categories.map(normalize);
  const allKeywords = [...new Set([cNiche, ...cCats].filter(Boolean))];

  // Nothing to compare → neutral
  if (required.length === 0 && !industry) return 75;

  let score = 0;

  // Required niches → creator keywords
  if (required.length > 0) {
    const matches = required.filter((n) => {
      const norm = normalize(n);
      return allKeywords.some((k) => k.includes(norm) || norm.includes(k));
    }).length;
    score = (matches / required.length) * 100;
  }

  // Industry → category alignment
  if (industry) {
    const mapped = INDUSTRY_CATS[industry] ?? [];
    const aligned = mapped.some(
      (cat) => cCats.includes(cat) || cNiche.includes(cat),
    );

    if (required.length === 0) {
      score = aligned ? 88 : 52;
    } else if (aligned) {
      score = Math.min(100, score + 18);
    }
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ─── Dimension 3: Audience (20%) ─────────────────────────────────────────────

function scoreAudience(creator: CreatorInput, campaign: CampaignInput): number {
  let score = 78; // neutral when no data

  const reqCountry = normalize(campaign.required_country ?? "");

  if (reqCountry && !REMOTE_KEYWORDS.has(reqCountry)) {
    const audienceLoc  = normalize(creator.audience_location ?? "");
    const cCountry     = normalize(creator.location_country ?? "");
    const cCity        = normalize(creator.location_city ?? "");
    const cLoc         = normalize(creator.location ?? "");
    const allGeo       = [audienceLoc, cCountry, cCity, cLoc].join(" ");

    if (audienceLoc && audienceLoc.includes(reqCountry)) {
      score = 100; // explicit audience location hit
    } else if (containsAny(allGeo, [reqCountry])) {
      score = 82;  // creator is from right area
    } else {
      score = 38;  // mismatch
    }
  }

  // Compensation compatibility
  const comp = campaign.compensation_type;
  const accepts =
    comp === "paid"      ? creator.accepts_paid :
    comp === "gifted"    ? creator.accepts_gifted :
    comp === "affiliate" ? creator.accepts_affiliate :
    true; // revenue_share / unpaid — no explicit flag

  if (!accepts) score = Math.round(score * 0.45); // hard penalty

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ─── Dimension 4: Location (15%) ─────────────────────────────────────────────

function scoreLocation(creator: CreatorInput, campaign: CampaignInput): number {
  const reqCountry = normalize(campaign.required_country ?? "");

  if (!reqCountry || REMOTE_KEYWORDS.has(reqCountry)) return 100;

  const cCountry = normalize(creator.location_country ?? "");
  const cLoc     = normalize(creator.location ?? "");
  const allGeo   = [cCountry, cLoc].filter(Boolean).join(" ");

  if (!allGeo) return 72; // unknown location, mild discount
  if (allGeo.includes(reqCountry) || (cCountry && reqCountry.includes(cCountry))) return 100;
  return 50;
}

// ─── Dimension 5: Requirements (15%) ─────────────────────────────────────────

function scoreRequirements(creator: CreatorInput, campaign: CampaignInput): number {
  let totalWeight   = 0;
  let weightedScore = 0;

  // Follower count (weight 40)
  if (campaign.min_followers && campaign.min_followers > 0) {
    totalWeight += 40;
    const fc = creator.follower_count ?? 0;
    if (fc >= campaign.min_followers)                   weightedScore += 40;
    else if (fc >= campaign.min_followers * 0.75)       weightedScore += 28;
    else if (fc >= campaign.min_followers * 0.5)        weightedScore += 16;
    // else 0 — well below requirement
  }

  // Language (weight 35)
  if (campaign.required_language) {
    totalWeight += 35;
    const reqLang    = normalize(campaign.required_language);
    const cLang      = normalize(creator.primary_language ?? "");
    if (!creator.primary_language) {
      weightedScore += 24; // unknown — mild benefit of the doubt
    } else if (cLang.includes(reqLang) || reqLang.includes(cLang)) {
      weightedScore += 35;
    }
  }

  // Deliverable platform ↔ creator platform overlap (weight 25)
  const deliverables = campaign.deliverables ?? [];
  if (deliverables.length > 0) {
    totalWeight += 25;
    const delivPlatforms   = deliverables.map((d) => normalize(d.platform));
    const creatorPlatforms = creator.platforms.map(normalize);
    const overlap = delivPlatforms.filter((p) => creatorPlatforms.includes(p)).length;
    const ratio   = overlap / delivPlatforms.length;
    weightedScore += Math.round(ratio * 25);
  }

  if (totalWeight === 0) return 85; // no specific requirements → high but not perfect
  return Math.round(Math.min(100, (weightedScore / totalWeight) * 100));
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function computeMatchScore(
  creator: CreatorInput,
  campaign: CampaignInput,
  creatorTrust?: CreatorTrustScore | null,
): MatchScoreBreakdown {
  const platform     = scorePlatform(creator.platforms, campaign.required_platforms);
  const niche        = scoreNiche(creator, campaign);
  const audience     = scoreAudience(creator, campaign);
  const location     = scoreLocation(creator, campaign);
  const requirements = scoreRequirements(creator, campaign);

  const baseTotal = Math.round(
    platform     * 0.25 +
    niche        * 0.25 +
    audience     * 0.20 +
    location     * 0.15 +
    requirements * 0.15,
  );

  // Trust modifier: earned reputation adjusts the match score
  const trustModifier = creatorTrust
    ? TRUST_TIER_CONFIG[creatorTrust.tier].matchModifier
    : 0;

  const total = Math.max(0, Math.min(100, baseTotal + trustModifier));

  return { total, platform, niche, audience, location, requirements, trustModifier };
}

// ─── Color helpers ────────────────────────────────────────────────────────────

export function scoreColor(score: number): string {
  if (score >= 80) return "oklch(0.62 0.12 158)";   // emerald green — strong match
  if (score >= 60) return "oklch(0.72 0.10 224)";   // electric blue — good match
  if (score >= 40) return "oklch(0.70 0.08 68)";    // amber — partial match
  return "oklch(1 0 0 / 36%)";                       // muted — weak
}

export function scoreBg(score: number): string {
  if (score >= 80) return "oklch(0.72 0.18 152 / 12%)";
  if (score >= 60) return "oklch(0.62 0.10 224 / 12%)";
  if (score >= 40) return "oklch(0.78 0.14 76 / 10%)";
  return "oklch(1 0 0 / 4%)";
}

export function scoreBorder(score: number): string {
  if (score >= 80) return "oklch(0.72 0.18 152 / 28%)";
  if (score >= 60) return "oklch(0.62 0.10 224 / 26%)";
  if (score >= 40) return "oklch(0.78 0.14 76 / 24%)";
  return "oklch(1 0 0 / 10%)";
}

export const SCORE_DIMENSION_LABELS: Record<keyof Omit<MatchScoreBreakdown, "total" | "trustModifier">, string> = {
  platform:     "Platform Match",
  niche:        "Niche Match",
  audience:     "Audience Match",
  location:     "Location Match",
  requirements: "Requirements",
};
