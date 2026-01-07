-- Migration: 0255_add_customer_notes_column.sql
-- Description: Add notes column to customer table (used by CustomerService)
-- Author: System
-- Date: 2026-01-07

-- Add notes column if it doesn't exist
ALTER TABLE customer ADD COLUMN IF NOT EXISTS notes text;

-- Add account_number column (used by customer statement PDF)
ALTER TABLE customer ADD COLUMN IF NOT EXISTS account_number text;

-- Create index for account_number lookups
CREATE INDEX IF NOT EXISTS idx_customer_account_number ON customer(account_number) WHERE account_number IS NOT NULL;

