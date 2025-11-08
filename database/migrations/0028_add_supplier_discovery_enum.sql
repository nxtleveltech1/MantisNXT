-- Add supplier_discovery to ai_service_type enum
DO $$ 
BEGIN
    -- Check if supplier_discovery already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'ai_service_type' 
        AND e.enumlabel = 'supplier_discovery'
    ) THEN
        ALTER TYPE ai_service_type ADD VALUE 'supplier_discovery';
    END IF;
END $$;

