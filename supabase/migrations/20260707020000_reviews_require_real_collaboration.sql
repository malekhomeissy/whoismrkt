-- ─────────────────────────────────────────────────────────────────────────────
-- reviews: require a real accepted contract before a review can be filed.
--
-- The original INSERT policy only checked `auth.uid() = reviewer_id` — any
-- creator or business could POST a review for an arbitrary campaign_id they
-- never worked on and any reviewed_user_id, inflating their own avg_rating or
-- bombing a rival's, which feeds directly into compute_creator_trust_score /
-- compute_business_trust_score (both read from creator_profiles.avg_rating /
-- business_profiles.avg_rating, updated by update_review_aggregates()).
--
-- Fix: require an accepted contracts row on that exact campaign_id where the
-- reviewer and reviewee are the two counterparties (business_id/creator_id in
-- either order — reviews are bidirectional).
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can submit their own reviews" ON public.reviews;

CREATE POLICY "Users can submit reviews for real collaborations"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.campaign_id = reviews.campaign_id
        AND c.status = 'accepted'
        AND (
          (c.business_id = reviews.reviewer_id AND c.creator_id = reviews.reviewed_user_id)
          OR
          (c.creator_id = reviews.reviewer_id AND c.business_id = reviews.reviewed_user_id)
        )
    )
  );
