DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE audit_action AS ENUM (
      'INSERT',
      'UPDATE',
      'DELETE',
      'LOGIN',
      'LOGOUT',
      'API_CALL',
      'EXPORT',
      'IMPORT',
      'CONFIG_CHANGE',
      'PASSWORD_RESET'
    );
  END IF;
END;
$$;

