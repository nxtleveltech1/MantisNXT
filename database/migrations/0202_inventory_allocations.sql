BEGIN;

CREATE TABLE IF NOT EXISTS inventory_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('allocation','consignment')),
  allocated_qty INTEGER NOT NULL CHECK (allocated_qty >= 0),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_allocations_item ON inventory_allocations(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_allocations_supplier ON inventory_allocations(supplier_id);

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0202_inventory_allocations')
ON CONFLICT (migration_name) DO NOTHING;

