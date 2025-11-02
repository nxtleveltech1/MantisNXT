-- Create default organization for WooCommerce sync fix
-- This organization ID is used as fallback when no org_id is available

INSERT INTO organization (id, name, slug, plan_type, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Default Organization',
  'default-org',
  'starter',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW()
RETURNING id, name, slug;
