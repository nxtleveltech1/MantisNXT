-- Migration: 0231_enhanced_delivery_options.sql
-- Description: Enhanced delivery options for Shiplogic integration
-- Date: 2025-12-25

BEGIN;

-- Add default pickup address to organization settings
ALTER TABLE organization ADD COLUMN IF NOT EXISTS 
  default_pickup_address jsonb DEFAULT '{}';

-- Add enhanced fields to delivery_cost_quotes for Shiplogic data
ALTER TABLE delivery_cost_quotes 
  ADD COLUMN IF NOT EXISTS service_name text,
  ADD COLUMN IF NOT EXISTS service_code text,
  ADD COLUMN IF NOT EXISTS pickup_eta text,
  ADD COLUMN IF NOT EXISTS delivery_eta text,
  ADD COLUMN IF NOT EXISTS provider_quote_id text,
  ADD COLUMN IF NOT EXISTS vat_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS courier_image text;

-- Add enhanced fields to quotation_delivery_options
ALTER TABLE quotation_delivery_options
  ADD COLUMN IF NOT EXISTS delivery_contact_email text,
  ADD COLUMN IF NOT EXISTS weight_kg numeric(8,3),
  ADD COLUMN IF NOT EXISTS dimensions_length_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS dimensions_width_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS dimensions_height_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS package_description text,
  ADD COLUMN IF NOT EXISTS declared_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS is_insured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_signature boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_fragile boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS delivery_cost_vat numeric(12,2),
  ADD COLUMN IF NOT EXISTS delivery_cost_total numeric(12,2);

-- Add enhanced fields to sales_order_delivery_options
ALTER TABLE sales_order_delivery_options
  ADD COLUMN IF NOT EXISTS delivery_contact_email text,
  ADD COLUMN IF NOT EXISTS weight_kg numeric(8,3),
  ADD COLUMN IF NOT EXISTS dimensions_length_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS dimensions_width_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS dimensions_height_cm numeric(8,2),
  ADD COLUMN IF NOT EXISTS package_description text,
  ADD COLUMN IF NOT EXISTS declared_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS is_insured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_signature boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_fragile boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS delivery_cost_vat numeric(12,2),
  ADD COLUMN IF NOT EXISTS delivery_cost_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS selected_cost_quote_id uuid REFERENCES delivery_cost_quotes(id) ON DELETE SET NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_delivery_cost_quotes_service_code ON delivery_cost_quotes(service_code);
CREATE INDEX IF NOT EXISTS idx_delivery_cost_quotes_courier_name ON delivery_cost_quotes(courier_name);

-- Update organization table to include default Shiplogic credentials
COMMENT ON COLUMN organization.default_pickup_address IS 'Default pickup address for courier services in JSON format: {street, suburb, city, province, postalCode, country, contact_name, contact_phone, contact_email}';

-- Add Shiplogic as a courier provider type (for existing code compatibility)
DO $$
BEGIN
  -- Insert Shiplogic as a provider template if not exists
  -- This is a template that organizations can copy and configure
  INSERT INTO courier_providers (
    id,
    org_id,
    name,
    code,
    status,
    api_endpoint,
    supports_tracking,
    supports_quotes,
    metadata
  )
  SELECT 
    uuid_generate_v4(),
    org.id,
    'Shiplogic (The Courier Guy)',
    'shiplogic',
    'inactive'::courier_provider_status,
    'https://api.shiplogic.com',
    true,
    true,
    '{"description": "Shiplogic API integration for The Courier Guy and other SA couriers"}'::jsonb
  FROM organization org
  WHERE NOT EXISTS (
    SELECT 1 FROM courier_providers cp 
    WHERE cp.org_id = org.id AND cp.code = 'shiplogic'
  );
EXCEPTION
  WHEN others THEN
    -- Ignore if organization table doesn't exist yet
    NULL;
END $$;

COMMIT;

-- Record migration
INSERT INTO schema_migrations (migration_name)
VALUES ('0231_enhanced_delivery_options')
ON CONFLICT (migration_name) DO NOTHING;

