-- Add payment_status column to contracts so webhook can mark payment received
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));
