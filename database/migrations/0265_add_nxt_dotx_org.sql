-- Add NXT DOTX organization for org switcher
-- Run: psql "$DATABASE_URL" -f database/migrations/0265_add_nxt_dotx_org.sql

INSERT INTO organization (id, name, slug, plan_type, is_active)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'NXT DOTX',
  'nxt-dotx',
  'starter',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
