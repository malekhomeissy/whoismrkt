-- System config table for server-side tokens that need automatic rotation
-- Only service_role can read/write (edge functions use service_role)
CREATE TABLE IF NOT EXISTS system_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- No public access — edge functions use service_role which bypasses RLS
CREATE POLICY "no_public_access" ON system_config FOR ALL TO anon, authenticated USING (false);

-- Tokens are seeded separately via: supabase/seed_higgsfield_tokens.sh
-- (never commit credentials to migration files)
