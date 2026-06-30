// ─────────────────────────────────────────────────────────────────────────────
// Profile Completion — single source of truth for creator profile completeness.
//
// Used by: Analytics page, Growth Hub, AI scoring
// Returns score (0–100) and per-item completion state with actionable labels.
//
// Score formula: (completed checks / total checks) × 100 — equal weight per check.
// ─────────────────────────────────────────────────────────────────────────────

import type { CreatorProfile } from "@/types/creator";

export interface CompletionItem {
  id:    string;
  label: string;
  done:  boolean;
  link:  string;
}

export interface CreatorCompletionResult {
  score: number;
  items: CompletionItem[];
}

export function computeCreatorCompletion(cp: CreatorProfile): CreatorCompletionResult {
  const items: CompletionItem[] = [
    {
      id:    "display_name",
      label: "Set your display name",
      done:  !!cp.display_name,
      link:  "/profile",
    },
    {
      id:    "photo",
      label: "Add a profile photo",
      done:  !!cp.profile_image_url,
      link:  "/profile",
    },
    {
      id:    "bio",
      label: "Write your bio",
      done:  !!(cp.bio && cp.bio.trim().length > 10),
      link:  "/profile",
    },
    {
      id:    "categories",
      label: "Set your niche & categories",
      done:  cp.categories.length > 0,
      link:  "/profile",
    },
    {
      id:    "platforms",
      label: "Connect social platforms",
      done:  cp.platforms.length > 0,
      link:  "/profile",
    },
    {
      id:    "social",
      label: "Add your social handles",
      done:  !!(cp.instagram_handle || cp.tiktok_handle || cp.youtube_handle),
      link:  "/profile",
    },
    {
      id:    "audience",
      label: "Complete your audience info",
      done:  !!(cp.audience_location || cp.audience_age_range),
      link:  "/profile",
    },
    {
      id:    "portfolio",
      label: "Add portfolio links to showcase your work",
      done:  !!(cp.featured_link_1 || cp.featured_link_2 || cp.featured_link_3),
      link:  "/profile",
    },
    {
      id:    "rate",
      label: "Set a collaboration rate range",
      done:  !!cp.rate_range,
      link:  "/profile",
    },
  ];

  const completed = items.filter((i) => i.done).length;
  const score     = Math.round((completed / items.length) * 100);

  return { score, items };
}
