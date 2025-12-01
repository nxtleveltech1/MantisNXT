-- Migration 016: add rsp column to inventory_items for recommended selling price

BEGIN;

ALTER TABLE IF EXISTS public.inventory_items
  ADD COLUMN IF NOT EXISTS rsp NUMERIC(15,4);

COMMIT;














