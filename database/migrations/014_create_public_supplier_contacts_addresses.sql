-- Create compatibility tables in public schema for supplier repo
-- Date: 2025-10-29

BEGIN;

-- supplier_contacts
CREATE TABLE IF NOT EXISTS public.supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  type TEXT,
  name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  department TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- supplier_addresses
CREATE TABLE IF NOT EXISTS public.supplier_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  type TEXT,
  name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- supplier_performance (public, to satisfy repo operations)
CREATE TABLE IF NOT EXISTS public.supplier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  overall_rating NUMERIC(3,2) DEFAULT 0,
  quality_rating NUMERIC(3,2) DEFAULT 0,
  delivery_rating NUMERIC(3,2) DEFAULT 0,
  service_rating NUMERIC(3,2) DEFAULT 0,
  price_rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
