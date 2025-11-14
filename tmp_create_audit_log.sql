CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organization(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  timestamp timestamptz DEFAULT now(),
  CONSTRAINT audit_table_name_valid CHECK (table_name ~ '^[a-z_]+$'),
  CONSTRAINT audit_data_present CHECK (old_data IS NOT NULL OR new_data IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_org_timestamp ON audit_log(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_timestamp ON audit_log(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_table_action ON audit_log(table_name, action);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id) WHERE record_id IS NOT NULL;

