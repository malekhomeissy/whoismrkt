-- Explicit deny for SELECT on leads (defense in depth — ensures no future
-- permissive policy accidentally exposes PII). Service role bypasses RLS.
CREATE POLICY "No one can read leads via API"
  ON public.leads FOR SELECT
  TO anon, authenticated
  USING (false);