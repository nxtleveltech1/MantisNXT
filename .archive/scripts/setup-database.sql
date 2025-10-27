-- ================================================
-- MANTISNXT LIVE DATABASE SETUP SCRIPT
-- Complete enterprise platform schema for live operations
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================
-- ORGANIZATIONS & MULTI-TENANCY
-- ================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    settings JSONB DEFAULT '{}',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    max_users INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- ENHANCED AUTHENTICATION
-- ================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

-- ================================
-- SUPPLIERS MANAGEMENT
-- ================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(255),
    website VARCHAR(255),
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100),
    primary_category VARCHAR(100),
    geographic_region VARCHAR(100),
    preferred_supplier BOOLEAN DEFAULT false,
    bee_level VARCHAR(20),
    local_content_percentage DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'active',
    performance_tier VARCHAR(20) DEFAULT 'unrated',
    spend_last_12_months DECIMAL(15,2) DEFAULT 0,
    rating DECIMAL(3,2),
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- INVENTORY MANAGEMENT
-- ================================

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    brand VARCHAR(100),
    supplier_id UUID REFERENCES suppliers(id),
    supplier_sku VARCHAR(100),
    cost_price DECIMAL(15,2) NOT NULL,
    sale_price DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'ZAR',
    stock_qty INTEGER DEFAULT 0,
    reserved_qty INTEGER DEFAULT 0,
    available_qty INTEGER GENERATED ALWAYS AS (stock_qty - reserved_qty) STORED,
    reorder_point INTEGER DEFAULT 0,
    max_stock INTEGER,
    unit VARCHAR(50),
    weight DECIMAL(10,3),
    dimensions JSONB,
    barcode VARCHAR(100),
    location VARCHAR(100),
    tags TEXT[],
    images TEXT[],
    status VARCHAR(50) DEFAULT 'active',
    tax_rate DECIMAL(5,4) DEFAULT 0.15,
    custom_fields JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- STOCK MOVEMENTS
-- ================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'transfer', 'adjustment'
    quantity INTEGER NOT NULL,
    cost DECIMAL(15,2),
    reason VARCHAR(255) NOT NULL,
    reference VARCHAR(255),
    location_from VARCHAR(100),
    location_to VARCHAR(100),
    batch_id VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- UPLOAD SESSIONS & PROCESSING
-- ================================

CREATE TABLE IF NOT EXISTS upload_sessions (
    id VARCHAR(100) PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255),
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    total_rows INTEGER NOT NULL,
    processed_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    error_rows INTEGER DEFAULT 0,
    warning_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'uploading',
    progress INTEGER DEFAULT 0,
    headers JSONB,
    sample_data JSONB,
    field_mappings JSONB,
    validation_results JSONB,
    import_results JSONB,
    backup_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS upload_temp_data (
    session_id VARCHAR(100) PRIMARY KEY REFERENCES upload_sessions(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upload_backups (
    id VARCHAR(100) PRIMARY KEY,
    session_id VARCHAR(100) REFERENCES upload_sessions(id),
    affected_records JSONB,
    original_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- ACTIVITY LOGGING & AUDIT
-- ================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- CUSTOMERS & CRM
-- ================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_number VARCHAR(50) UNIQUE,
    company_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    industry VARCHAR(100),
    billing_address JSONB,
    shipping_address JSONB,
    payment_terms VARCHAR(50) DEFAULT 'net_30',
    credit_limit DECIMAL(15,2),
    tax_exempt BOOLEAN DEFAULT false,
    tax_id VARCHAR(50),
    customer_type VARCHAR(50) DEFAULT 'business',
    status VARCHAR(50) DEFAULT 'active',
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- SALES & ORDERS
-- ================================

CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    user_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft',
    order_date DATE DEFAULT CURRENT_DATE,
    required_date DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'ZAR',
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- PURCHASING
-- ================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    user_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft',
    order_date DATE DEFAULT CURRENT_DATE,
    required_date DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'ZAR',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    received_qty INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Authentication indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory_items(stock_qty);

-- Supplier indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(primary_category);

-- Movement indexes
CREATE INDEX IF NOT EXISTS idx_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_type ON stock_movements(movement_type);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_resource ON activity_logs(resource, resource_id);

-- Upload session indexes
CREATE INDEX IF NOT EXISTS idx_upload_sessions_supplier ON upload_sessions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);

-- ================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- DEFAULT DATA SETUP
-- ================================

-- Insert default organization
INSERT INTO organizations (id, name, slug, domain, subscription_plan, max_users)
VALUES (
    uuid_generate_v4(),
    'MantisNXT Enterprise',
    'mantisnxt-enterprise',
    'mantisnxt.com',
    'enterprise',
    1000
) ON CONFLICT (slug) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
('suppliers.view', 'View suppliers', 'suppliers', 'read'),
('suppliers.create', 'Create suppliers', 'suppliers', 'create'),
('suppliers.update', 'Update suppliers', 'suppliers', 'update'),
('suppliers.delete', 'Delete suppliers', 'suppliers', 'delete'),
('inventory.view', 'View inventory', 'inventory', 'read'),
('inventory.create', 'Create inventory items', 'inventory', 'create'),
('inventory.update', 'Update inventory items', 'inventory', 'update'),
('inventory.delete', 'Delete inventory items', 'inventory', 'delete'),
('inventory.upload', 'Upload inventory files', 'inventory', 'upload'),
('orders.view', 'View orders', 'orders', 'read'),
('orders.create', 'Create orders', 'orders', 'create'),
('orders.update', 'Update orders', 'orders', 'update'),
('orders.delete', 'Delete orders', 'orders', 'delete'),
('admin.access', 'Access admin functions', 'admin', 'access'),
('users.manage', 'Manage users', 'users', 'manage'),
('reports.view', 'View reports', 'reports', 'read')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles
INSERT INTO roles (organization_id, name, description, permissions, is_system_role)
SELECT
    o.id,
    'super_admin',
    'Full system administrator access',
    '["suppliers.view", "suppliers.create", "suppliers.update", "suppliers.delete", "inventory.view", "inventory.create", "inventory.update", "inventory.delete", "inventory.upload", "orders.view", "orders.create", "orders.update", "orders.delete", "admin.access", "users.manage", "reports.view"]'::jsonb,
    true
FROM organizations o
WHERE o.slug = 'mantisnxt-enterprise'
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO roles (organization_id, name, description, permissions, is_system_role)
SELECT
    o.id,
    'admin',
    'Administrator access',
    '["suppliers.view", "suppliers.create", "suppliers.update", "inventory.view", "inventory.create", "inventory.update", "inventory.upload", "orders.view", "orders.create", "orders.update", "reports.view"]'::jsonb,
    true
FROM organizations o
WHERE o.slug = 'mantisnxt-enterprise'
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO roles (organization_id, name, description, permissions, is_system_role)
SELECT
    o.id,
    'user',
    'Standard user access',
    '["suppliers.view", "inventory.view", "orders.view", "orders.create"]'::jsonb,
    true
FROM organizations o
WHERE o.slug = 'mantisnxt-enterprise'
ON CONFLICT (organization_id, name) DO NOTHING;

-- Insert default admin user (password: admin123)
INSERT INTO users (organization_id, email, first_name, last_name, password_hash, is_active, email_verified)
SELECT
    o.id,
    'admin@mantisnxt.com',
    'System',
    'Administrator',
    '$2a$10$rGKmS3P9vGmxQpX6Q8VXsOQ8KTZyOQ5J1F1xLM8dZ6q2G8fV7u3z2', -- bcrypt hash of 'admin123'
    true,
    true
FROM organizations o
WHERE o.slug = 'mantisnxt-enterprise'
ON CONFLICT (email) DO NOTHING;

-- Assign super_admin role to default user
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT
    u.id,
    r.id,
    NOW()
FROM users u
JOIN organizations o ON u.organization_id = o.id
JOIN roles r ON r.organization_id = o.id
WHERE u.email = 'admin@mantisnxt.com'
AND r.name = 'super_admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ================================
-- DATABASE SETUP COMPLETE
-- ================================

-- Log completion
INSERT INTO activity_logs (action, resource, details, created_at)
VALUES (
    'database_setup',
    'system',
    jsonb_build_object('message', 'Database schema setup completed successfully', 'timestamp', NOW()),
    NOW()
);

SELECT 'Database setup completed successfully!' as result;