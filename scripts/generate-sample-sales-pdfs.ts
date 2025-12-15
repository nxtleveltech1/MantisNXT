#!/usr/bin/env bun
/**
 * Generate sample Quotation/Invoice PDFs using the standardized sales document template.
 *
 * Usage:
 *   bun --bun scripts/generate-sample-sales-pdfs.ts
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderHtmlToPdfBuffer } from '@/lib/services/pdf/html-to-pdf';
import { getPlatformBranding } from '@/lib/services/pdf/platform-branding';
import { renderSalesDocumentHtml } from '@/lib/services/sales/documents/sales-document-template';

async function main() {
  const outDir = path.join(process.cwd(), 'tmp', 'samples', 'sales-docs');
  await mkdir(outDir, { recursive: true });

  const branding = await getPlatformBranding();

  const quotationHtml = renderSalesDocumentHtml({
    kind: 'quotation',
    logoDataUri: branding.logoDataUri,
    accentHex: branding.accentHex,
    companyDisplayName: 'NXT Level Tech',
    customer: {
      name: 'Example Customer',
      company: 'Example Org (Pty) Ltd',
      email: 'accounts@example.com',
      phone: '+27 21 000 0000',
      addressLines: ['Cape Town', 'South Africa'],
    },
    header: {
      documentNumber: 'S11440',
      status: 'sent',
      currency: 'ZAR',
      issueDate: '2025-12-10',
      validUntil: '2025-12-17',
      salesperson: 'Jason',
    },
    items: [
      {
        line_number: 1,
        sku: 'SPEHYB014',
        name: 'Hybrid+ HP15 15" 600W Passive Speaker',
        quantity: 2,
        unit_price: 11153,
        tax_rate: 0.15,
        tax_amount: 0,
        subtotal: 0,
        total: 19396.52,
      },
      {
        line_number: 2,
        sku: 'SPEHYB036',
        name: 'Hybrid LB218 MKIII Dual 18" 800W Passive Subwoofer',
        quantity: 2,
        unit_price: 8823,
        tax_rate: 0.15,
        tax_amount: 0,
        subtotal: 0,
        total: 15344.35,
      },
      {
        line_number: 3,
        sku: null,
        name: 'MAY BE STOCK ISSUES OF THE ABOVE LB218 SUB',
        description: null,
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        tax_amount: 0,
        subtotal: 0,
        total: 0,
        metadata: { kind: 'note' },
      },
      {
        line_number: 4,
        sku: 'AMPHYB054',
        name: 'Hybrid B4000 MK6 2 X 2000W RMS @ 4Ohm Power Amplifier',
        quantity: 1,
        unit_price: 10071,
        tax_rate: 0.15,
        tax_amount: 0,
        subtotal: 0,
        total: 8757.39,
      },
      {
        line_number: 5,
        sku: 'AMPHYB053',
        name: 'Hybrid B2400 MK6 2 X 1200W RMS @ 4Ohm Power Amplifier',
        quantity: 1,
        unit_price: 7281,
        tax_rate: 0.15,
        tax_amount: 0,
        subtotal: 0,
        total: 6331.3,
      },
      {
        line_number: 6,
        sku: 'MG16XU',
        name: 'Yamaha MG16XU Mixer',
        quantity: 1,
        unit_price: 14999,
        tax_rate: 0.15,
        tax_amount: 0,
        subtotal: 0,
        total: 13042.61,
      },
      {
        line_number: 7,
        sku: 'CABHYB007',
        name: 'Hybrid Speakon-Speakon 20m',
        quantity: 4,
        unit_price: 441,
        tax_rate: 0.15,
        tax_amount: 0,
        subtotal: 0,
        total: 1533.91,
      },
      {
        line_number: 8,
        sku: 'SAMS-SP50P',
        name: 'Samson SP50P Pair heavy duty Speaker Stand Set',
        quantity: 1,
        unit_price: 1309,
        tax_rate: 0.15,
        tax_amount: 0,
        subtotal: 0,
        total: 1138.26,
      },
      {
        line_number: 9,
        sku: 'BLX288E/PG58-H8E',
        name: 'Shure Wireless Dual Vocal System with two PG58',
        quantity: 1,
        unit_price: 15549,
        tax_rate: 0.15,
        tax_amount: 0,
        subtotal: 0,
        total: 13520.87,
      },
    ],
    totals: {
      subtotal: 79065.21,
      totalTax: 11859.79,
      total: 90925,
    },
    notes: null,
  });

  const invoiceHtml = renderSalesDocumentHtml({
    kind: 'invoice',
    logoDataUri: branding.logoDataUri,
    accentHex: branding.accentHex,
    companyDisplayName: 'NXT Level Tech',
    customer: {
      name: 'Example Customer',
      company: 'Example Org (Pty) Ltd',
      email: 'accounts@example.com',
      phone: '+27 21 000 0000',
      addressLines: ['Cape Town', 'South Africa'],
    },
    header: {
      documentNumber: 'INV/2025/06461',
      status: 'sent',
      currency: 'ZAR',
      issueDate: '2025-12-10',
      dueDate: '2025-12-10',
      source: 'S11407',
    },
    items: [
      {
        line_number: 1,
        sku: 'MICHYB084',
        name: 'Hybrid U-DVFE Dual UHF wireless microphone system',
        quantity: 1,
        unit_price: 2494,
        tax_rate: 0.15,
        tax_amount: 0,
        subtotal: 0,
        total: 2168.7,
      },
      {
        line_number: 2,
        sku: 'CABHYB025',
        name: 'Hybrid XLR Male-XLR Female 1m',
        quantity: 2,
        unit_price: 72,
        tax_rate: 0.15,
        tax_amount: 0,
        subtotal: 0,
        total: 125.22,
      },
    ],
    totals: {
      subtotal: 2293.92,
      totalTax: 344.08,
      total: 2638,
      amountPaid: 0,
      amountDue: 2638,
    },
    notes: 'Payment Communication: INV/2025/06461',
  });

  const quotationPdf = await renderHtmlToPdfBuffer({ html: quotationHtml });
  const invoicePdf = await renderHtmlToPdfBuffer({ html: invoiceHtml });

  const quotationOut = path.join(outDir, 'quotation-S11440.pdf');
  const invoiceOut = path.join(outDir, 'invoice-INV-2025-06461.pdf');

  await writeFile(quotationOut, quotationPdf);
  await writeFile(invoiceOut, invoicePdf);

  // eslint-disable-next-line no-console
  console.log(`Generated:\n- ${quotationOut}\n- ${invoiceOut}`);
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


