-- Minimal SPP schema initializer (staging layer for pricelist uploads)
-- Safe to run multiple times

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS spp;

-- Pricelist upload metadata
CREATE TABLE IF NOT EXISTS spp.pricelist_upload (
    upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    filename VARCHAR(255) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    row_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'validating', 'validated', 'merged', 'failed', 'rejected')),
    errors_json JSONB,
    processed_by VARCHAR(255),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pricelist rows
CREATE TABLE IF NOT EXISTS spp.pricelist_row (
    upload_id UUID NOT NULL REFERENCES spp.pricelist_upload(upload_id) ON DELETE CASCADE,
    row_num INTEGER NOT NULL,
    supplier_sku VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    brand VARCHAR(100),
    uom VARCHAR(50) NOT NULL,
    pack_size VARCHAR(50),
    price DECIMAL(15,4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    category_raw VARCHAR(200),
    vat_code VARCHAR(20),
    barcode VARCHAR(50),
    attrs_json JSONB,
    validation_errors TEXT[],
    PRIMARY KEY (upload_id, row_num)
);

