-- Insert system users for authentication
-- These users are referenced by the authenticateRequest function in api-utils.ts

-- Development user
INSERT INTO users (id, email, created_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'dev@mantisnxt.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Production/Default user
INSERT INTO users (id, email, created_at)
VALUES ('22222222-2222-2222-2222-222222222222', 'user@example.com', NOW())
ON CONFLICT (id) DO NOTHING;
