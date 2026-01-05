-- Migration: 0231_sales_services_financial_integration.sql
-- Description: Sales Services Financial Integration - Auto-create AR invoices, sync payments, post to GL
-- Date: 2025-01-XX

BEGIN;

-- =====================================================
-- INTEGRATION FUNCTIONS
-- =====================================================

-- Function to create AR invoice from Sales Invoice
CREATE OR REPLACE FUNCTION create_ar_invoice_from_sales_invoice(p_sales_invoice_id uuid)
RETURNS uuid AS $$
DECLARE
    v_sales_invoice invoices%ROWTYPE;
    v_ar_invoice_id uuid;
    v_invoice_number text;
    v_item invoice_items%ROWTYPE;
    v_line_number integer := 1;
    v_next_num integer;
BEGIN
    -- Get sales invoice
    SELECT * INTO v_sales_invoice FROM invoices WHERE id = p_sales_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales invoice not found: %', p_sales_invoice_id;
    END IF;
    
    -- Check if AR invoice already exists
    SELECT id INTO v_ar_invoice_id
    FROM ar_customer_invoices
    WHERE sales_invoice_id = p_sales_invoice_id;
    
    IF v_ar_invoice_id IS NOT NULL THEN
        RETURN v_ar_invoice_id;
    END IF;
    
    -- Generate AR invoice number
    SELECT COALESCE(MAX(CAST(substring(invoice_number FROM '\d+$') AS integer)), 0) + 1
    INTO v_next_num
    FROM ar_customer_invoices
    WHERE org_id = v_sales_invoice.org_id
      AND invoice_number LIKE 'AR-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
    
    v_invoice_number := 'AR-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_next_num::text, 6, '0');
    
    -- Create AR invoice
    INSERT INTO ar_customer_invoices (
        org_id,
        customer_id,
        sales_invoice_id,
        sales_order_id,
        invoice_number,
        source_type,
        invoice_date,
        due_date,
        payment_terms,
        currency,
        subtotal,
        tax_amount,
        discount_amount,
        shipping_amount,
        total_amount,
        paid_amount,
        status,
        billing_address,
        shipping_address,
        metadata,
        created_by,
        updated_by
    ) VALUES (
        v_sales_invoice.org_id,
        v_sales_invoice.customer_id,
        p_sales_invoice_id,
        v_sales_invoice.sales_order_id,
        v_invoice_number,
        'sales_invoice',
        COALESCE(v_sales_invoice.created_at::date, CURRENT_DATE),
        COALESCE(v_sales_invoice.due_date, CURRENT_DATE + INTERVAL '30 days'),
        'Net 30',
        COALESCE(v_sales_invoice.currency, 'ZAR'),
        v_sales_invoice.subtotal,
        v_sales_invoice.total_tax,
        0,
        0,
        v_sales_invoice.total,
        v_sales_invoice.amount_paid,
        CASE
            WHEN v_sales_invoice.status = 'paid' THEN 'paid'
            WHEN v_sales_invoice.status = 'partially_paid' THEN 'partially_paid'
            WHEN v_sales_invoice.status = 'overdue' THEN 'overdue'
            WHEN v_sales_invoice.status = 'sent' THEN 'sent'
            ELSE 'draft'
        END,
        v_sales_invoice.billing_address,
        v_sales_invoice.shipping_address,
        jsonb_build_object('created_from_sales_invoice', p_sales_invoice_id),
        v_sales_invoice.created_by,
        v_sales_invoice.updated_by
    ) RETURNING id INTO v_ar_invoice_id;
    
    -- Copy line items
    FOR v_item IN SELECT * FROM invoice_items WHERE invoice_id = p_sales_invoice_id ORDER BY line_number, id
    LOOP
        INSERT INTO ar_invoice_line_items (
            ar_invoice_id,
            sales_order_item_id,
            product_id,
            description,
            quantity,
            unit_price,
            discount_percent,
            discount_amount,
            tax_rate,
            tax_amount,
            line_total,
            line_number
        ) VALUES (
            v_ar_invoice_id,
            NULL,
            v_item.product_id,
            COALESCE(v_item.description, v_item.name),
            v_item.quantity,
            v_item.unit_price,
            0,
            0,
            v_item.tax_rate,
            v_item.tax_amount,
            v_item.total,
            v_item.line_number
        );
    END LOOP;
    
    RETURN v_ar_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Function to sync AR invoice status from Sales Invoice
CREATE OR REPLACE FUNCTION sync_ar_invoice_status_from_sales_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_ar_invoice_id uuid;
    v_ar_status ar_invoice_status;
BEGIN
    -- Find corresponding AR invoice
    SELECT id INTO v_ar_invoice_id
    FROM ar_customer_invoices
    WHERE sales_invoice_id = NEW.id;
    
    IF v_ar_invoice_id IS NOT NULL THEN
        -- Map sales invoice status to AR invoice status
        v_ar_status := CASE
            WHEN NEW.status = 'paid' THEN 'paid'::ar_invoice_status
            WHEN NEW.status = 'partially_paid' THEN 'partially_paid'::ar_invoice_status
            WHEN NEW.status = 'overdue' THEN 'overdue'::ar_invoice_status
            WHEN NEW.status = 'sent' THEN 'sent'::ar_invoice_status
            WHEN NEW.status = 'cancelled' THEN 'cancelled'::ar_invoice_status
            WHEN NEW.status = 'refunded' THEN 'refunded'::ar_invoice_status
            ELSE 'draft'::ar_invoice_status
        END;
        
        -- Update AR invoice
        UPDATE ar_customer_invoices
        SET
            status = v_ar_status,
            paid_amount = NEW.amount_paid,
            balance_due = NEW.amount_due,
            updated_at = now()
        WHERE id = v_ar_invoice_id;
        
        -- Update sent/viewed timestamps if applicable
        IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
            UPDATE ar_customer_invoices
            SET sent_at = now()
            WHERE id = v_ar_invoice_id;
        END IF;
        
        IF NEW.paid_at IS NOT NULL AND OLD.paid_at IS NULL THEN
            UPDATE ar_customer_invoices
            SET first_payment_at = NEW.paid_at
            WHERE id = v_ar_invoice_id AND first_payment_at IS NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create AR receipt from Sales Invoice payment
CREATE OR REPLACE FUNCTION create_ar_receipt_from_sales_payment(
    p_sales_invoice_id uuid,
    p_payment_amount numeric
)
RETURNS uuid AS $$
DECLARE
    v_sales_invoice invoices%ROWTYPE;
    v_ar_invoice_id uuid;
    v_receipt_id uuid;
    v_receipt_number text;
    v_receipt_next_num integer;
BEGIN
    -- Get sales invoice
    SELECT * INTO v_sales_invoice FROM invoices WHERE id = p_sales_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales invoice not found: %', p_sales_invoice_id;
    END IF;
    
    -- Get AR invoice
    SELECT id INTO v_ar_invoice_id
    FROM ar_customer_invoices
    WHERE sales_invoice_id = p_sales_invoice_id;
    
    IF v_ar_invoice_id IS NULL THEN
        -- Create AR invoice first
        v_ar_invoice_id := create_ar_invoice_from_sales_invoice(p_sales_invoice_id);
    END IF;
    
    -- Generate receipt number
    SELECT COALESCE(MAX(CAST(substring(receipt_number FROM '\d+$') AS integer)), 0) + 1
    INTO v_receipt_next_num
    FROM ar_receipts
    WHERE org_id = v_sales_invoice.org_id
      AND receipt_number LIKE 'RCP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
    
    v_receipt_number := 'RCP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_receipt_next_num::text, 6, '0');
    
    -- Create receipt
    INSERT INTO ar_receipts (
        org_id,
        customer_id,
        receipt_number,
        receipt_date,
        amount,
        currency,
        payment_method,
        status,
        reference_number,
        processed_by
    ) VALUES (
        v_sales_invoice.org_id,
        v_sales_invoice.customer_id,
        v_receipt_number,
        CURRENT_DATE,
        p_payment_amount,
        COALESCE(v_sales_invoice.currency, 'ZAR'),
        'bank_transfer'::payment_method,
        'paid'::payment_status,
        v_sales_invoice.document_number,
        v_sales_invoice.updated_by
    ) RETURNING id INTO v_receipt_id;
    
    -- Create receipt allocation
    INSERT INTO ar_receipt_allocations (
        ar_receipt_id,
        ar_invoice_id,
        allocated_amount
    ) VALUES (
        v_receipt_id,
        v_ar_invoice_id,
        p_payment_amount
    );
    
    RETURN v_receipt_id;
END;
$$ LANGUAGE plpgsql;

-- Function to post Sales Invoice to General Ledger
CREATE OR REPLACE FUNCTION post_sales_invoice_to_gl(p_sales_invoice_id uuid)
RETURNS uuid AS $$
DECLARE
    v_sales_invoice invoices%ROWTYPE;
    v_ar_invoice_id uuid;
    v_journal_entry_id uuid;
    v_entry_number text;
    v_next_num integer;
    v_ar_account_id uuid;
    v_revenue_account_id uuid;
    v_tax_account_id uuid;
    v_item invoice_items%ROWTYPE;
    v_line_number integer := 1;
BEGIN
    -- Get sales invoice
    SELECT * INTO v_sales_invoice FROM invoices WHERE id = p_sales_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales invoice not found: %', p_sales_invoice_id;
    END IF;
    
    -- Check if already posted
    SELECT je.id INTO v_journal_entry_id
    FROM journal_entry je
    WHERE je.reference_type = 'sales_invoice'
      AND je.reference_id = p_sales_invoice_id
      AND je.is_posted = true;
    
    IF v_journal_entry_id IS NOT NULL THEN
        RETURN v_journal_entry_id;
    END IF;
    
    -- Get AR invoice
    SELECT id INTO v_ar_invoice_id
    FROM ar_customer_invoices
    WHERE sales_invoice_id = p_sales_invoice_id;
    
    IF v_ar_invoice_id IS NULL THEN
        v_ar_invoice_id := create_ar_invoice_from_sales_invoice(p_sales_invoice_id);
    END IF;
    
    -- Get default accounts (these should be configured in account table)
    -- For now, we'll use placeholder logic - in production, these should come from account configuration
    SELECT id INTO v_ar_account_id
    FROM account
    WHERE org_id = v_sales_invoice.org_id
      AND account_type = 'asset'
      AND code LIKE '1200%'
    LIMIT 1;
    
    SELECT id INTO v_revenue_account_id
    FROM account
    WHERE org_id = v_sales_invoice.org_id
      AND account_type = 'revenue'
      AND code LIKE '4000%'
    LIMIT 1;
    
    SELECT id INTO v_tax_account_id
    FROM account
    WHERE org_id = v_sales_invoice.org_id
      AND account_type = 'liability'
      AND code LIKE '2200%'
    LIMIT 1;
    
    -- Generate journal entry number
    SELECT COALESCE(MAX(CAST(substring(entry_number FROM '\d+$') AS integer)), 0) + 1
    INTO v_next_num
    FROM journal_entry
    WHERE org_id = v_sales_invoice.org_id
      AND entry_number LIKE 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
    
    v_entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_next_num::text, 6, '0');
    
    -- Create journal entry
    INSERT INTO journal_entry (
        org_id,
        entry_number,
        description,
        entry_date,
        reference_type,
        reference_id,
        total_debits,
        total_credits,
        is_posted,
        posted_at,
        posted_by,
        created_by,
        period,
        fiscal_year
    ) VALUES (
        v_sales_invoice.org_id,
        v_entry_number,
        'Sales Invoice ' || v_sales_invoice.document_number,
        v_sales_invoice.created_at::date,
        'sales_invoice',
        p_sales_invoice_id,
        v_sales_invoice.total,
        v_sales_invoice.total,
        true,
        now(),
        v_sales_invoice.created_by,
        v_sales_invoice.created_by,
        TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
        EXTRACT(YEAR FROM CURRENT_DATE)::integer
    ) RETURNING id INTO v_journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Accounts Receivable
    IF v_ar_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_line (
            journal_entry_id,
            account_id,
            description,
            debit_amount,
            credit_amount,
            line_number
        ) VALUES (
            v_journal_entry_id,
            v_ar_account_id,
            'Accounts Receivable - ' || v_sales_invoice.document_number,
            v_sales_invoice.total,
            0,
            v_line_number
        );
        v_line_number := v_line_number + 1;
    END IF;
    
    -- Credit: Revenue
    IF v_revenue_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_line (
            journal_entry_id,
            account_id,
            description,
            debit_amount,
            credit_amount,
            line_number
        ) VALUES (
            v_journal_entry_id,
            v_revenue_account_id,
            'Sales Revenue - ' || v_sales_invoice.document_number,
            0,
            v_sales_invoice.subtotal,
            v_line_number
        );
        v_line_number := v_line_number + 1;
    END IF;
    
    -- Credit: Tax Payable (if tax exists)
    IF v_sales_invoice.total_tax > 0 AND v_tax_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_line (
            journal_entry_id,
            account_id,
            description,
            debit_amount,
            credit_amount,
            line_number
        ) VALUES (
            v_journal_entry_id,
            v_tax_account_id,
            'Tax Payable - ' || v_sales_invoice.document_number,
            0,
            v_sales_invoice.total_tax,
            v_line_number
        );
    END IF;
    
    RETURN v_journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Auto-create AR invoice when Sales Invoice is created
CREATE OR REPLACE FUNCTION trigger_create_ar_invoice_on_sales_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_ar_invoice_id uuid;
BEGIN
    -- Only create AR invoice if status is not draft
    IF NEW.status != 'draft' THEN
        BEGIN
            v_ar_invoice_id := create_ar_invoice_from_sales_invoice(NEW.id);
            
            -- If status is 'sent' or 'paid', post to GL
            IF NEW.status IN ('sent', 'paid', 'partially_paid') THEN
                PERFORM post_sales_invoice_to_gl(NEW.id);
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but don't fail the transaction
                RAISE WARNING 'Failed to create AR invoice for sales invoice %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_ar_invoice_on_sales_invoice
    AFTER INSERT ON invoices
    FOR EACH ROW
    WHEN (NEW.status != 'draft')
    EXECUTE FUNCTION trigger_create_ar_invoice_on_sales_invoice();

-- Trigger: Sync AR invoice status and create receipt on payment
CREATE OR REPLACE FUNCTION trigger_sync_ar_on_sales_invoice_update()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_amount numeric;
    v_receipt_id uuid;
BEGIN
    -- Sync AR invoice status
    PERFORM sync_ar_invoice_status_from_sales_invoice();
    
    -- If payment amount increased, create receipt
    IF NEW.amount_paid > OLD.amount_paid THEN
        v_payment_amount := NEW.amount_paid - OLD.amount_paid;
        
        BEGIN
            v_receipt_id := create_ar_receipt_from_sales_payment(NEW.id, v_payment_amount);
            
            -- Post payment to GL
            -- Debit: Cash/Bank, Credit: Accounts Receivable
            -- This would be handled by a separate function or service
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to create receipt for sales invoice payment %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    -- Post to GL if status changed to sent/paid
    IF (OLD.status != 'sent' AND NEW.status = 'sent') OR
       (OLD.status != 'paid' AND NEW.status = 'paid') THEN
        BEGIN
            PERFORM post_sales_invoice_to_gl(NEW.id);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to post sales invoice to GL %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_ar_on_sales_invoice_update
    AFTER UPDATE ON invoices
    FOR EACH ROW
    WHEN (
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.amount_paid IS DISTINCT FROM NEW.amount_paid
    )
    EXECUTE FUNCTION trigger_sync_ar_on_sales_invoice_update();

COMMIT;

-- Record migration
INSERT INTO schema_migrations (migration_name)
VALUES ('0231_sales_services_financial_integration')
ON CONFLICT (migration_name) DO NOTHING;

