
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pending_price numeric NULL,
  ADD COLUMN IF NOT EXISTS pending_price_effective_at timestamp with time zone NULL;
