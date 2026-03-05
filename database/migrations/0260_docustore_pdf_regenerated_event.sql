-- Migration: 0260_docustore_pdf_regenerated_event.sql
-- Description: Add pdf_regenerated to docustore_event_type enum (used by DocumentGenerator.regeneratePdf)

ALTER TYPE docustore_event_type ADD VALUE IF NOT EXISTS 'pdf_regenerated';
