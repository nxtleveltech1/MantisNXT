-- ============================================================================
-- MantisNXT Database Migration - Agreement Delivery Tracking
-- ============================================================================
-- Migration: 0041
-- Description: Add tables for tracking rental agreement delivery via SMS/WhatsApp
-- Author: System
-- Date: 2025-12-25
-- Target: Neon Primary Database
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CREATE AGREEMENT DELIVERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rentals.agreement_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID NOT NULL REFERENCES rentals.rental_agreements(agreement_id) ON DELETE CASCADE,
    reservation_id UUID NOT NULL REFERENCES rentals.reservations(reservation_id) ON DELETE CASCADE,
    
    -- Delivery channel
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
    phone_number VARCHAR(30),
    email VARCHAR(255),
    
    -- Message tracking
    message_id VARCHAR(100), -- Twilio message SID
    
    -- Signing token and URL
    signing_token VARCHAR(64) NOT NULL UNIQUE,
    signing_url TEXT NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'delivered', 'failed', 'viewed', 'signed', 'expired'
    )),
    
    -- Timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_agreement_deliveries_agreement 
    ON rentals.agreement_deliveries(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_deliveries_reservation 
    ON rentals.agreement_deliveries(reservation_id);
CREATE INDEX IF NOT EXISTS idx_agreement_deliveries_token 
    ON rentals.agreement_deliveries(signing_token);
CREATE INDEX IF NOT EXISTS idx_agreement_deliveries_status 
    ON rentals.agreement_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_agreement_deliveries_phone 
    ON rentals.agreement_deliveries(phone_number) WHERE phone_number IS NOT NULL;

COMMENT ON TABLE rentals.agreement_deliveries IS 'Tracks delivery of rental agreements via SMS/WhatsApp for customer signature';
COMMENT ON COLUMN rentals.agreement_deliveries.signing_token IS 'Unique token for customer to access and sign agreement';
COMMENT ON COLUMN rentals.agreement_deliveries.channel IS 'Delivery channel: sms, whatsapp, or email';

-- ============================================================================
-- SECTION 2: ADD CUSTOMER SIGNATURE COLUMNS TO RENTAL_AGREEMENTS
-- ============================================================================

-- Add signature tracking columns to rental_agreements if they don't exist
DO $$
BEGIN
    -- Customer signature
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'rentals' 
        AND table_name = 'rental_agreements' 
        AND column_name = 'customer_signature'
    ) THEN
        ALTER TABLE rentals.rental_agreements 
        ADD COLUMN customer_signature TEXT;
    END IF;

    -- Customer signed timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'rentals' 
        AND table_name = 'rental_agreements' 
        AND column_name = 'customer_signed_at'
    ) THEN
        ALTER TABLE rentals.rental_agreements 
        ADD COLUMN customer_signed_at TIMESTAMPTZ;
    END IF;

    -- Customer signed IP address
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'rentals' 
        AND table_name = 'rental_agreements' 
        AND column_name = 'customer_signed_ip'
    ) THEN
        ALTER TABLE rentals.rental_agreements 
        ADD COLUMN customer_signed_ip VARCHAR(45);
    END IF;

    -- Customer signed user agent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'rentals' 
        AND table_name = 'rental_agreements' 
        AND column_name = 'customer_signed_user_agent'
    ) THEN
        ALTER TABLE rentals.rental_agreements 
        ADD COLUMN customer_signed_user_agent TEXT;
    END IF;

    -- Company representative signature
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'rentals' 
        AND table_name = 'rental_agreements' 
        AND column_name = 'company_signature'
    ) THEN
        ALTER TABLE rentals.rental_agreements 
        ADD COLUMN company_signature TEXT;
    END IF;

    -- Company signed by user
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'rentals' 
        AND table_name = 'rental_agreements' 
        AND column_name = 'company_signed_by'
    ) THEN
        ALTER TABLE rentals.rental_agreements 
        ADD COLUMN company_signed_by UUID;
    END IF;

    -- Company signed timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'rentals' 
        AND table_name = 'rental_agreements' 
        AND column_name = 'company_signed_at'
    ) THEN
        ALTER TABLE rentals.rental_agreements 
        ADD COLUMN company_signed_at TIMESTAMPTZ;
    END IF;

    -- Signature status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'rentals' 
        AND table_name = 'rental_agreements' 
        AND column_name = 'signature_status'
    ) THEN
        ALTER TABLE rentals.rental_agreements 
        ADD COLUMN signature_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (signature_status IN ('pending', 'customer_signed', 'fully_signed', 'declined'));
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: CREATE UPDATE TIMESTAMP TRIGGER
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION rentals.update_agreement_delivery_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agreement_delivery_update_timestamp ON rentals.agreement_deliveries;
CREATE TRIGGER agreement_delivery_update_timestamp
    BEFORE UPDATE ON rentals.agreement_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION rentals.update_agreement_delivery_timestamp();

-- ============================================================================
-- SECTION 4: CREATE MESSAGING SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.messaging_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    
    -- Twilio SMS settings
    twilio_account_sid VARCHAR(100),
    twilio_auth_token VARCHAR(100), -- Should be encrypted in production
    twilio_phone_number VARCHAR(30),
    
    -- WhatsApp settings
    whatsapp_enabled BOOLEAN DEFAULT false,
    twilio_whatsapp_number VARCHAR(30),
    
    -- Default settings
    default_channel VARCHAR(20) DEFAULT 'sms' CHECK (default_channel IN ('sms', 'whatsapp', 'email')),
    
    -- Rate limiting
    daily_sms_limit INTEGER DEFAULT 100,
    daily_whatsapp_limit INTEGER DEFAULT 500,
    sms_sent_today INTEGER DEFAULT 0,
    whatsapp_sent_today INTEGER DEFAULT 0,
    limit_reset_at TIMESTAMPTZ DEFAULT NOW()::date + interval '1 day',
    
    -- Templates
    agreement_sms_template TEXT,
    agreement_whatsapp_template TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_messaging_settings_org UNIQUE (org_id)
);

CREATE INDEX IF NOT EXISTS idx_messaging_settings_org ON public.messaging_settings(org_id);

COMMENT ON TABLE public.messaging_settings IS 'Organization-specific messaging/SMS/WhatsApp configuration';

-- ============================================================================
-- SECTION 5: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check if an agreement delivery token is valid
CREATE OR REPLACE FUNCTION rentals.validate_signing_token(
    p_token VARCHAR(64)
) RETURNS TABLE (
    valid BOOLEAN,
    expired BOOLEAN,
    agreement_id UUID,
    reservation_id UUID,
    delivery_id UUID
) AS $$
DECLARE
    v_delivery rentals.agreement_deliveries%ROWTYPE;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Find the delivery
    SELECT * INTO v_delivery
    FROM rentals.agreement_deliveries
    WHERE signing_token = p_token;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, FALSE, NULL::UUID, NULL::UUID, NULL::UUID;
        RETURN;
    END IF;
    
    -- Check expiration (7 days from sent_at or created_at)
    v_expires_at := COALESCE(v_delivery.expires_at, 
                             COALESCE(v_delivery.sent_at, v_delivery.created_at) + interval '7 days');
    
    IF NOW() > v_expires_at THEN
        -- Mark as expired
        UPDATE rentals.agreement_deliveries
        SET status = 'expired', updated_at = NOW()
        WHERE id = v_delivery.id AND status NOT IN ('signed', 'expired');
        
        RETURN QUERY SELECT FALSE, TRUE, v_delivery.agreement_id, 
                            v_delivery.reservation_id, v_delivery.id;
        RETURN;
    END IF;
    
    -- Valid token
    RETURN QUERY SELECT TRUE, FALSE, v_delivery.agreement_id, 
                        v_delivery.reservation_id, v_delivery.id;
END;
$$ LANGUAGE plpgsql;

COMMIT;

