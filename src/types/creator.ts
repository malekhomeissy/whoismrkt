// ─────────────────────────────────────────────────────────────────────────────
// MRKT Creator Profile — TypeScript types (V2)
// Matches creator_profiles schema in 20260530080000_creator_profiles.sql
// ─────────────────────────────────────────────────────────────────────────────

export type CreatorCategory =
  | "fashion"
  | "fitness"
  | "beauty"
  | "food"
  | "travel"
  | "tech"
  | "lifestyle"
  | "business"
  | "gaming"
  | "other";

export type CreatorProfileStatus = "incomplete" | "pending_review" | "active" | "hidden";

// ─────────────────────────────────────────────────────────────────────────────
// Database row type — mirrors creator_profiles table
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string;
  username: string | null;
  bio: string | null;
  location: string | null;
  profile_image_url: string | null;
  niche: string | null;
  categories: string[];
  platforms: string[];
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  follower_count: number | null;
  audience_location: string | null;
  audience_age_range: string | null;
  audience_gender_split: string | null;
  primary_language: string | null;
  accepts_paid: boolean;
  accepts_gifted: boolean;
  accepts_affiliate: boolean;
  rate_range: string | null;
  preferred_content_types: string[];
  featured_link_1: string | null;
  featured_link_2: string | null;
  featured_link_3: string | null;
  media_kit_url: string | null;
  previous_collaborations: string | null;
  is_public: boolean;
  status: CreatorProfileStatus;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding form state
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatorOnboardingData {
  // Step 1 — Basic Info
  display_name: string;
  username: string;
  bio: string;
  // Location — split into area / city / country for Globe precision
  location: string;        // composed "Area, City, Country" (derived on save)
  location_area: string;   // neighbourhood / district (optional)
  location_city: string;   // city
  location_country: string; // country
  profile_image_url: string;
  // Step 2 — Creator Details
  niche: string;
  categories: CreatorCategory[];
  platforms: string[];
  instagram_handle: string;
  tiktok_handle: string;
  youtube_handle: string;
  follower_count: string;
  // Step 3 — Audience
  audience_location: string;
  audience_age_range: string;
  audience_gender_split: string;
  primary_language: string;
  // Step 4 — Collaboration
  accepts_paid: boolean;
  accepts_gifted: boolean;
  accepts_affiliate: boolean;
  rate_range: string;
  preferred_content_types: string[];
  // Step 5 — Portfolio
  featured_link_1: string;
  featured_link_2: string;
  featured_link_3: string;
  media_kit_url: string;
  previous_collaborations: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<CreatorCategory, string> = {
  fashion:   "Fashion",
  fitness:   "Fitness",
  beauty:    "Beauty",
  food:      "Food",
  travel:    "Travel",
  tech:      "Tech",
  lifestyle: "Lifestyle",
  business:  "Business",
  gaming:    "Gaming",
  other:     "Other",
};

export const PLATFORMS = [
  "Instagram", "TikTok", "YouTube", "Twitter/X",
  "LinkedIn", "Pinterest", "Snapchat", "Twitch", "Facebook",
] as const;

export const CONTENT_TYPES = [
  "Static Posts", "Reels / Short Video", "Stories",
  "Long-Form Video", "Blog / Editorial", "Podcast",
  "Live Stream", "UGC Videos", "Product Photography", "Event Coverage",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatFollowers(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

const PLATFORM_SHORT_MAP: Record<string, string> = {
  "Instagram": "IG",
  "TikTok": "TK",
  "YouTube": "YT",
  "Twitter/X": "X",
  "LinkedIn": "LI",
  "Pinterest": "PT",
  "Snapchat": "SC",
  "Twitch": "TV",
  "Facebook": "FB",
};
export function platformShort(p: string): string {
  return PLATFORM_SHORT_MAP[p] ?? p.slice(0, 2).toUpperCase();
}

const PLATFORM_COLOR_MAP: Record<string, string> = {
  "Instagram": "oklch(0.70 0.12 0)",
  "TikTok":    "oklch(0.88 0 0)",
  "YouTube":   "oklch(0.65 0.18 25)",
  "Twitter/X": "oklch(0.80 0 0)",
  "LinkedIn":  "oklch(0.55 0.15 235)",
  "Pinterest": "oklch(0.62 0.15 20)",
  "Snapchat":  "oklch(0.88 0.15 90)",
  "Twitch":    "oklch(0.65 0.18 290)",
  "Facebook":  "oklch(0.55 0.15 250)",
};
export function platformColor(p: string): string {
  return PLATFORM_COLOR_MAP[p] ?? "oklch(0.75 0 0)";
}
