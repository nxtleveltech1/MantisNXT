-- Make analytics_dashboard.created_by nullable to allow system-created dashboards
-- This fixes foreign key constraint violations when users don't exist yet

-- First, insert the system users that are referenced by authenticateRequest
INSERT INTO users (id, email, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'dev@mantisnxt.com', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'user@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Optionally, make created_by nullable for system-generated dashboards
-- This allows dashboards to be created without a specific user
ALTER TABLE analytics_dashboard
  ALTER COLUMN created_by DROP NOT NULL;

-- Add a comment explaining the nullable field
COMMENT ON COLUMN analytics_dashboard.created_by IS
  'User who created the dashboard. Can be NULL for system-generated dashboards.';
