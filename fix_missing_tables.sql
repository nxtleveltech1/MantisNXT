-- Fix missing supplier_performance table and other required tables
-- Connection: postgresql://nxtdb_admin:P@33w0rd-1@62.169.20.53:6600/nxtprod-db_001

-- Create supplier_performance table
CREATE TABLE IF NOT EXISTS supplier_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    orders_placed INTEGER DEFAULT 0,
    orders_delivered INTEGER DEFAULT 0,
    orders_on_time INTEGER DEFAULT 0,
    total_order_value DECIMAL(15,2) DEFAULT 0,
    delivery_rate DECIMAL(5,2) DEFAULT 0,
    on_time_rate DECIMAL(5,2) DEFAULT 0,
    quality_score DECIMAL(3,1) DEFAULT 0,
    response_time_hours DECIMAL(6,2) DEFAULT 0,
    defect_rate DECIMAL(5,4) DEFAULT 0,
    cost_savings DECIMAL(15,2) DEFAULT 0,
    performance_tier VARCHAR(20) DEFAULT 'unrated',
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplier_performance_supplier_id ON supplier_performance(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_performance_period ON supplier_performance(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_supplier_performance_tier ON supplier_performance(performance_tier);
CREATE INDEX IF NOT EXISTS idx_supplier_performance_delivery_rate ON supplier_performance(delivery_rate);

-- Insert sample performance data for existing suppliers
INSERT INTO supplier_performance (supplier_id, period_start, period_end, orders_placed, orders_delivered, orders_on_time, total_order_value, delivery_rate, on_time_rate, quality_score, response_time_hours, performance_tier)
SELECT
    s.id as supplier_id,
    CURRENT_DATE - INTERVAL '30 days' as period_start,
    CURRENT_DATE as period_end,
    FLOOR(RANDOM() * 50 + 10)::INTEGER as orders_placed,
    FLOOR(RANDOM() * 45 + 8)::INTEGER as orders_delivered,
    FLOOR(RANDOM() * 40 + 5)::INTEGER as orders_on_time,
    ROUND((RANDOM() * 500000 + 50000)::NUMERIC, 2) as total_order_value,
    ROUND((RANDOM() * 20 + 80)::NUMERIC, 2) as delivery_rate,
    ROUND((RANDOM() * 15 + 85)::NUMERIC, 2) as on_time_rate,
    ROUND((RANDOM() * 2 + 8)::NUMERIC, 1) as quality_score,
    ROUND((RANDOM() * 12 + 2)::NUMERIC, 2) as response_time_hours,
    CASE
        WHEN RANDOM() > 0.8 THEN 'platinum'
        WHEN RANDOM() > 0.6 THEN 'gold'
        WHEN RANDOM() > 0.4 THEN 'silver'
        ELSE 'bronze'
    END as performance_tier
FROM supplier s
ON CONFLICT (supplier_id, period_start, period_end) DO NOTHING;

-- Create supplier_contacts table if missing
CREATE TABLE IF NOT EXISTS supplier_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    position VARCHAR(100),
    department VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    is_billing_contact BOOLEAN DEFAULT false,
    is_technical_contact BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_addresses table if missing
CREATE TABLE IF NOT EXISTS supplier_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    address_type VARCHAR(50) DEFAULT 'business',
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'South Africa',
    is_primary BOOLEAN DEFAULT false,
    is_billing_address BOOLEAN DEFAULT false,
    is_shipping_address BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier_id ON supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_primary ON supplier_contacts(is_primary);
CREATE INDEX IF NOT EXISTS idx_supplier_addresses_supplier_id ON supplier_addresses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_addresses_primary ON supplier_addresses(is_primary);

-- Insert sample contacts for existing suppliers
INSERT INTO supplier_contacts (supplier_id, first_name, last_name, email, phone, position, is_primary)
SELECT
    s.id as supplier_id,
    'John' as first_name,
    'Smith' as last_name,
    'john.smith@' || LOWER(REPLACE(s.name, ' ', '')) || '.com' as email,
    '+27 11 ' || LPAD(FLOOR(RANDOM() * 9000000 + 1000000)::TEXT, 7, '0') as phone,
    'Sales Manager' as position,
    true as is_primary
FROM supplier s
WHERE NOT EXISTS (
    SELECT 1 FROM supplier_contacts sc WHERE sc.supplier_id = s.id
);

-- Insert sample addresses for existing suppliers
INSERT INTO supplier_addresses (supplier_id, address_line_1, city, state_province, postal_code, country, is_primary, is_billing_address)
SELECT
    s.id as supplier_id,
    FLOOR(RANDOM() * 999 + 1)::TEXT || ' Business Street' as address_line_1,
    CASE
        WHEN RANDOM() > 0.7 THEN 'Johannesburg'
        WHEN RANDOM() > 0.4 THEN 'Cape Town'
        WHEN RANDOM() > 0.2 THEN 'Durban'
        ELSE 'Pretoria'
    END as city,
    'Gauteng' as state_province,
    LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0') as postal_code,
    'South Africa' as country,
    true as is_primary,
    true as is_billing_address
FROM supplier s
WHERE NOT EXISTS (
    SELECT 1 FROM supplier_addresses sa WHERE sa.supplier_id = s.id
);

SELECT 'Missing tables created successfully!' as status,
       'supplier_performance, supplier_contacts, supplier_addresses' as tables_created,
       (SELECT count(*) FROM supplier_performance) as performance_records,
       (SELECT count(*) FROM supplier_contacts) as contact_records,
       (SELECT count(*) FROM supplier_addresses) as address_records;