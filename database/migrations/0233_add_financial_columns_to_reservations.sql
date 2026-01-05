-- Add financial columns to rentals.reservations table
-- These columns were missing from the original schema but are required for financial calculations

ALTER TABLE rentals.reservations
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.15,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rental_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount_due DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_due DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ZAR',
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6) DEFAULT 1.0;

-- Add comments
COMMENT ON COLUMN rentals.reservations.subtotal IS 'Equipment rental subtotal before tax';
COMMENT ON COLUMN rentals.reservations.tax_rate IS 'Tax rate (e.g., 0.15 for 15% VAT)';
COMMENT ON COLUMN rentals.reservations.tax_amount IS 'Calculated tax amount';
COMMENT ON COLUMN rentals.reservations.total_rental_amount IS 'Total rental amount including tax (subtotal + tax)';
COMMENT ON COLUMN rentals.reservations.total_amount_due IS 'Total amount due including security deposit';
COMMENT ON COLUMN rentals.reservations.payment_status IS 'Payment status of the reservation';
COMMENT ON COLUMN rentals.reservations.currency IS 'Currency code (e.g., ZAR, USD)';
COMMENT ON COLUMN rentals.reservations.discount_amount IS 'Discount amount applied to reservation';
COMMENT ON COLUMN rentals.reservations.amount_due IS 'Current amount due (may differ from total_amount_due after partial payments)';
COMMENT ON COLUMN rentals.reservations.exchange_rate IS 'Exchange rate if currency differs from base currency';

