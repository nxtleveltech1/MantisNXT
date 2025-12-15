## Sales Documents (Invoice / Quotation) — Standardized PDF Layout

This repo supports **standardized, brand-consistent PDFs** for sales documents.

### What’s standardized
- **Layout**: header, customer block, metadata block, line items table, totals card, payment + terms footer
- **Branding**: uses the **platform logo** (`public/images/nxt-logo.svg`) and platform accent color
- **Copy**: payment/bank details + terms are centralized in `src/lib/services/sales/documents/nxt-document-copy.ts`

### API endpoints
- **Invoice PDF**: `GET /api/v1/sales/invoices/:id/pdf`
- **Quotation PDF**: `GET /api/v1/sales/quotations/:id/pdf`

Both endpoints return `application/pdf` with an inline `Content-Disposition` filename.

### Local sample generation (no DB required)
To generate sample PDFs that roughly mirror the reference layout and copy:

```bash
bun --bun scripts/generate-sample-sales-pdfs.ts
```

Outputs:
- `tmp/samples/sales-docs/quotation-S11440.pdf`
- `tmp/samples/sales-docs/invoice-INV-2025-06461.pdf`

### Where to edit the template
- **HTML template**: `src/lib/services/sales/documents/sales-document-template.ts`
- **Default copy** (bank details + terms): `src/lib/services/sales/documents/nxt-document-copy.ts`
- **HTML → PDF rendering**: `src/lib/services/pdf/html-to-pdf.ts`

### Notes
- Terms URL: `https://nxtleveltech.odoo.com/terms`


