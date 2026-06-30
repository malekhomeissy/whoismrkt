-- Fix get_business_public_profile: campaigns uses user_id, not business_id

CREATE OR REPLACE FUNCTION public.get_business_public_profile(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id',              bp.id,
    'user_id',         bp.user_id,
    'company_name',    bp.company_name,
    'industry',        bp.industry,
    'company_size',    bp.company_size,
    'website',         bp.website,
    'location',        bp.location,
    'description',     bp.description,
    'logo_url',        bp.logo_url,
    'is_verified',     COALESCE(bp.is_verified, false),
    'campaign_count',  (
      SELECT COUNT(*) FROM public.campaigns
      WHERE user_id = bp.user_id AND status IN ('active', 'completed')
    ),
    'active_campaigns', (
      SELECT COUNT(*) FROM public.campaigns
      WHERE user_id = bp.user_id AND status = 'active'
    ),
    'created_at',      bp.created_at
  )
  INTO v_result
  FROM public.business_profiles bp
  WHERE bp.user_id = p_business_id;

  RETURN COALESCE(v_result, jsonb_build_object('error', 'Business profile not found'));
END;
$$;
