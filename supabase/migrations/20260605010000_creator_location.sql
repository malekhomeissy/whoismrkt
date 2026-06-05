-- ============================================================
-- Creator Location + Availability — MRKT Globe foundation
-- Adds geographic coordinates to creator_profiles and creates
-- the creator_availability table for the Globe feature.
-- ============================================================

-- ── Extend creator_profiles with geographic data ──────────────

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS location_lat      double precision,
  ADD COLUMN IF NOT EXISTS location_lng      double precision,
  ADD COLUMN IF NOT EXISTS location_city     text,
  ADD COLUMN IF NOT EXISTS location_country  text;

-- Index for spatial queries (lat/lng pair)
CREATE INDEX IF NOT EXISTS creator_profiles_location_coords_idx
  ON public.creator_profiles (location_lat, location_lng)
  WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS creator_profiles_location_city_idx
  ON public.creator_profiles (location_city)
  WHERE location_city IS NOT NULL;

-- ── Creator availability table ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creator_availability (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id      uuid        NOT NULL
    REFERENCES public.creator_profiles(id) ON DELETE CASCADE,

  -- Current location (overrides creator_profiles.location for globe display)
  current_city            text,
  current_country         text,
  current_lat             double precision,
  current_lng             double precision,

  -- Availability window
  available_until         date,

  -- Travel plans (future location)
  traveling_to_city       text,
  traveling_to_country    text,
  traveling_to_lat        double precision,
  traveling_to_lng        double precision,
  travel_date             date,

  -- Availability status
  status                  text        NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'busy', 'traveling')),

  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT creator_availability_profile_unique
    UNIQUE (creator_profile_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS creator_availability_status_idx
  ON public.creator_availability (status);

CREATE INDEX IF NOT EXISTS creator_availability_travel_date_idx
  ON public.creator_availability (travel_date)
  WHERE travel_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS creator_availability_current_city_idx
  ON public.creator_availability (current_city)
  WHERE current_city IS NOT NULL;

-- ── Row-Level Security ────────────────────────────────────────

ALTER TABLE public.creator_availability ENABLE ROW LEVEL SECURITY;

-- Public availability is readable by anyone
CREATE POLICY "Public can read creator availability"
  ON public.creator_availability FOR SELECT
  USING (true);

-- Creators can manage their own availability
CREATE POLICY "Creators can insert own availability"
  ON public.creator_availability FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.creator_profiles
      WHERE id = creator_profile_id
    )
  );

CREATE POLICY "Creators can update own availability"
  ON public.creator_availability FOR UPDATE
  USING (
    auth.uid() = (
      SELECT user_id FROM public.creator_profiles
      WHERE id = creator_profile_id
    )
  );

CREATE POLICY "Creators can delete own availability"
  ON public.creator_availability FOR DELETE
  USING (
    auth.uid() = (
      SELECT user_id FROM public.creator_profiles
      WHERE id = creator_profile_id
    )
  );

-- ── updated_at trigger ────────────────────────────────────────

CREATE TRIGGER creator_availability_touch
  BEFORE UPDATE ON public.creator_availability
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
