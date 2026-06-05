-- ============================================================
-- Creator Location Area — sub-city precision for MRKT Globe
-- Adds neighborhood/district field so creators can specify
-- "Achrafieh, Beirut" instead of just "Beirut", giving the
-- Globe real geographic spread instead of stacked markers.
-- ============================================================

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS location_area text;

COMMENT ON COLUMN public.creator_profiles.location_area IS
  'Neighborhood or district within the city (e.g. Achrafieh, Hamra, DIFC). '
  'Used by MRKT Globe for sub-city placement precision.';
