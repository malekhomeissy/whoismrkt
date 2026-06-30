-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: campaign_payments status constraint vs stripe-checkout function mismatch
--
-- stripe-checkout/index.ts was inserting status='awaiting_payment' which is
-- not in the CHECK constraint, causing every checkout initiation to fail with
-- a DB constraint violation.
--
-- The correct schema value is 'pending' (payment initiated, not yet processed).
-- The edge function has been updated to use 'pending'. This migration ensures
-- any rows that somehow got inserted with 'awaiting_payment' (e.g. before the
-- constraint was applied, or in a test environment) are normalised.
-- ─────────────────────────────────────────────────────────────────────────────

-- Normalise any rows with the old status value
UPDATE public.campaign_payments
SET status = 'pending'
WHERE status = 'awaiting_payment';

-- The CHECK constraint already covers 'pending' — no ALTER needed.
-- Confirmed: status CHECK includes ('pending','processing','held','released',
-- 'completed','disputed','resolved','failed','refunded')
