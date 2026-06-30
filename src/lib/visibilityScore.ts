// ─────────────────────────────────────────────────────────────────────────────
// Visibility Score — single source of truth across all MRKT surfaces
//
// Score is 0–100. Each check contributes a fixed number of points.
// The weighting reflects what most impacts discoverability in AI matching.
//
// | Check                      | Points | Rationale                          |
// |----------------------------|--------|------------------------------------|
// | Profile is active/live     |   20   | Must be live to appear in matching |
// | Profile photo uploaded     |   10   | Visual trust signal for businesses |
// | Bio filled                 |   15   | Describes creator to AI + humans   |
// | Categories selected        |   15   | Core matching signal               |
// | Platforms selected         |   15   | Core matching signal               |
// | Audience data completed    |   10   | Improves match quality             |
// | Portfolio links added      |   10   | Social proof for businesses        |
// | Rate range set             |    5   | Helps businesses qualify fit       |
// | Total                      |  100   |                                    |
//
// ─────────────────────────────────────────────────────────────────────────────

import type { CreatorProfile } from "@/types/creator";

export interface VisibilityResult {
  score: number;
  suggestions: string[];
}

export function computeVisibilityScore(cp: CreatorProfile): VisibilityResult {
  const checks: Array<{ pts: number; met: boolean; suggestion: string }> = [
    {
      pts:        20,
      met:        cp.status === "active",
      suggestion: "Publish your profile so it appears in matching results",
    },
    {
      pts:        10,
      met:        !!cp.profile_image_url,
      suggestion: "Upload a profile photo",
    },
    {
      pts:        15,
      met:        !!(cp.bio && cp.bio.trim().length > 10),
      suggestion: "Write a bio that describes what you create",
    },
    {
      pts:        15,
      met:        cp.categories.length > 0,
      suggestion: "Select at least one creator category",
    },
    {
      pts:        15,
      met:        cp.platforms.length > 0,
      suggestion: "Add the platforms where you create content",
    },
    {
      pts:        10,
      met:        !!(cp.audience_location || cp.audience_age_range || cp.audience_gender_split || cp.primary_language),
      suggestion: "Complete your audience information",
    },
    {
      pts:        10,
      met:        !!(cp.featured_link_1 || cp.featured_link_2 || cp.featured_link_3),
      suggestion: "Add portfolio links to showcase your work",
    },
    {
      pts:         5,
      met:         !!cp.rate_range,
      suggestion:  "Set a rate range so brands can evaluate fit",
    },
  ];

  const score       = checks.reduce((s, c) => s + (c.met ? c.pts : 0), 0);
  const suggestions = checks.filter((c) => !c.met).map((c) => c.suggestion);
  return { score, suggestions };
}
