SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype;

