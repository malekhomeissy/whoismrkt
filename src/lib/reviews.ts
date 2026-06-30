// ─────────────────────────────────────────────────────────────────────────────
// MRKT Reviews & Ratings — Types and category configuration
// ─────────────────────────────────────────────────────────────────────────────

export type ReviewerRole = "business" | "creator";
export type ReviewType   = "business_reviews_creator" | "creator_reviews_business";

export interface Review {
  id: string;
  campaign_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  reviewer_role: ReviewerRole;
  rating: number;
  communication_rating?:       number | null;
  professionalism_rating?:     number | null;
  reliability_rating?:         number | null;
  content_quality_rating?:     number | null;  // creator-specific
  timeliness_rating?:          number | null;  // creator-specific
  brief_quality_rating?:       number | null;  // business-specific
  responsiveness_rating?:      number | null;  // business-specific
  payment_reliability_rating?: number | null;  // business-specific
  written_review?: string | null;
  created_at: string;
}

export interface CategoryDef {
  key: keyof Pick<Review,
    | "communication_rating"
    | "professionalism_rating"
    | "reliability_rating"
    | "content_quality_rating"
    | "timeliness_rating"
    | "brief_quality_rating"
    | "responsiveness_rating"
    | "payment_reliability_rating"
  >;
  label: string;
}

/** Categories when a Business rates a Creator */
export const CREATOR_CATEGORIES: CategoryDef[] = [
  { key: "communication_rating",   label: "Communication"   },
  { key: "professionalism_rating", label: "Professionalism" },
  { key: "content_quality_rating", label: "Content Quality" },
  { key: "reliability_rating",     label: "Reliability"     },
  { key: "timeliness_rating",      label: "Timeliness"      },
];

/** Categories when a Creator rates a Business */
export const BUSINESS_CATEGORIES: CategoryDef[] = [
  { key: "communication_rating",        label: "Communication"       },
  { key: "brief_quality_rating",        label: "Brief Quality"       },
  { key: "professionalism_rating",      label: "Professionalism"     },
  { key: "responsiveness_rating",       label: "Responsiveness"      },
  { key: "payment_reliability_rating",  label: "Payment Reliability" },
];
