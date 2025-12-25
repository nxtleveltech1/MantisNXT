// UPDATE: [2025-12-25] Created base PDF template with platform branding

/**
 * Base PDF Template
 * 
 * Provides consistent styling and layout for all platform documents.
 * Uses platform branding and ensures a professional, cohesive appearance.
 */

import { getPlatformBranding } from '@/lib/services/pdf/platform-branding';

export interface BaseTemplateOptions {
  title: string;
  documentNumber?: string;
  subtitle?: string;
  accentColor?: string;
  showLogo?: boolean;
  showFooter?: boolean;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyVat?: string;
}

/**
 * Get base CSS styles for all documents
 */
export function getBaseStyles(accentHex: string = '#2563eb'): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 18mm 14mm;
    }
    
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: white;
    }
    
    /* Typography */
    h1 {
      font-size: 24pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    
    h2 {
      font-size: 14pt;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
      margin-top: 24px;
    }
    
    h3 {
      font-size: 12pt;
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 8px;
    }
    
    p {
      margin-bottom: 8px;
    }
    
    /* Header */
    .document-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 3px solid ${accentHex};
    }
    
    .company-section {
      flex: 1;
    }
    
    .company-logo {
      height: 48px;
      width: auto;
      margin-bottom: 8px;
    }
    
    .company-name {
      font-size: 18pt;
      font-weight: 700;
      color: ${accentHex};
      margin-bottom: 4px;
    }
    
    .company-details {
      font-size: 9pt;
      color: #6b7280;
      line-height: 1.4;
    }
    
    .document-section {
      text-align: right;
    }
    
    .document-type {
      font-size: 28pt;
      font-weight: 700;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .document-number {
      font-size: 14pt;
      font-weight: 600;
      color: ${accentHex};
      margin-top: 4px;
    }
    
    .document-meta {
      font-size: 9pt;
      color: #6b7280;
      margin-top: 8px;
    }
    
    /* Status Badges */
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-draft { background: #f3f4f6; color: #4b5563; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-sent { background: #dbeafe; color: #1d4ed8; }
    .status-approved { background: #d1fae5; color: #059669; }
    .status-accepted { background: #d1fae5; color: #059669; }
    .status-paid { background: #d1fae5; color: #059669; }
    .status-completed { background: #d1fae5; color: #059669; }
    .status-rejected { background: #fee2e2; color: #dc2626; }
    .status-cancelled { background: #fee2e2; color: #dc2626; }
    .status-overdue { background: #fee2e2; color: #dc2626; }
    .status-expired { background: #f3f4f6; color: #6b7280; }
    .status-active { background: #dbeafe; color: #1d4ed8; }
    .status-partial { background: #fef3c7; color: #92400e; }
    
    /* Address Blocks */
    .address-section {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 24px;
    }
    
    .address-block {
      flex: 1;
      max-width: 48%;
    }
    
    .address-label {
      font-size: 9pt;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .address-content {
      background: #f9fafb;
      padding: 12px 16px;
      border-radius: 6px;
      border-left: 3px solid ${accentHex};
    }
    
    .address-name {
      font-weight: 600;
      font-size: 11pt;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    
    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    
    .data-table th {
      background: ${accentHex};
      color: white;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
    }
    
    .data-table th.right {
      text-align: right;
    }
    
    .data-table th.center {
      text-align: center;
    }
    
    .data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    
    .data-table td.right {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    
    .data-table td.center {
      text-align: center;
    }
    
    .data-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .data-table tbody tr:hover {
      background: #f3f4f6;
    }
    
    .item-name {
      font-weight: 500;
      color: #1a1a1a;
    }
    
    .item-sku {
      font-size: 9pt;
      color: #6b7280;
    }
    
    .item-description {
      font-size: 9pt;
      color: #6b7280;
      margin-top: 2px;
    }
    
    /* Totals */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    
    .totals-table {
      width: 280px;
    }
    
    .totals-table td {
      padding: 6px 12px;
    }
    
    .totals-table .label {
      text-align: left;
      color: #6b7280;
    }
    
    .totals-table .value {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
    
    .totals-table .total-row {
      font-size: 14pt;
      font-weight: 700;
      border-top: 2px solid #1a1a1a;
    }
    
    .totals-table .total-row .value {
      color: ${accentHex};
    }
    
    .totals-table .due-row {
      font-size: 12pt;
      font-weight: 600;
      color: #dc2626;
    }
    
    /* Notes Section */
    .notes-section {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
    
    .notes-label {
      font-size: 9pt;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .notes-content {
      background: #f9fafb;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 10pt;
      white-space: pre-wrap;
    }
    
    /* Signature Section */
    .signature-section {
      margin-top: 48px;
      display: flex;
      justify-content: space-between;
      gap: 48px;
    }
    
    .signature-block {
      flex: 1;
      max-width: 45%;
    }
    
    .signature-line {
      border-bottom: 1px solid #1a1a1a;
      height: 48px;
      margin-bottom: 8px;
    }
    
    .signature-label {
      font-size: 9pt;
      color: #6b7280;
    }
    
    /* Footer */
    .document-footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 9pt;
      color: #9ca3af;
    }
    
    .document-footer p {
      margin-bottom: 4px;
    }
    
    /* Utility Classes */
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-muted { color: #6b7280; }
    .text-small { font-size: 9pt; }
    .text-bold { font-weight: 600; }
    .mt-4 { margin-top: 16px; }
    .mt-8 { margin-top: 32px; }
    .mb-4 { margin-bottom: 16px; }
    .mb-8 { margin-bottom: 32px; }
    
    /* Highlight Box */
    .highlight-box {
      background: #fef3c7;
      border-left: 3px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 24px;
    }
    
    .highlight-box.info {
      background: #dbeafe;
      border-left-color: #3b82f6;
    }
    
    .highlight-box.success {
      background: #d1fae5;
      border-left-color: #10b981;
    }
    
    .highlight-box.danger {
      background: #fee2e2;
      border-left-color: #ef4444;
    }
    
    /* Page Break */
    .page-break {
      page-break-after: always;
    }
    
    .avoid-break {
      page-break-inside: avoid;
    }
  `;
}

/**
 * Generate document header HTML
 */
export async function generateHeader(options: BaseTemplateOptions): Promise<string> {
  const branding = await getPlatformBranding();
  const accentHex = options.accentColor || branding.accentHex;
  
  const logoHtml = options.showLogo !== false
    ? `<img src="${branding.logoDataUri}" alt="Logo" class="company-logo" />`
    : '';
  
  const companyDetailsHtml = `
    <div class="company-details">
      ${options.companyAddress ? `<div>${options.companyAddress}</div>` : ''}
      ${options.companyPhone ? `<div>Tel: ${options.companyPhone}</div>` : ''}
      ${options.companyEmail ? `<div>Email: ${options.companyEmail}</div>` : ''}
      ${options.companyVat ? `<div>VAT: ${options.companyVat}</div>` : ''}
    </div>
  `;
  
  return `
    <div class="document-header">
      <div class="company-section">
        ${logoHtml}
        ${options.companyName ? `<div class="company-name">${options.companyName}</div>` : ''}
        ${companyDetailsHtml}
      </div>
      <div class="document-section">
        <div class="document-type">${options.title}</div>
        ${options.documentNumber ? `<div class="document-number">${options.documentNumber}</div>` : ''}
        ${options.subtitle ? `<div class="document-meta">${options.subtitle}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Generate document footer HTML
 */
export function generateFooter(options: BaseTemplateOptions): string {
  if (options.showFooter === false) return '';
  
  return `
    <div class="document-footer">
      <p>Thank you for your business!</p>
      <p>Document generated on ${new Date().toLocaleString('en-ZA')}</p>
      ${options.companyName ? `<p>${options.companyName}</p>` : ''}
    </div>
  `;
}

/**
 * Generate complete HTML document with base template
 */
export async function generateBaseDocument(
  options: BaseTemplateOptions,
  bodyContent: string
): Promise<string> {
  const branding = await getPlatformBranding();
  const accentHex = options.accentColor || branding.accentHex;
  const header = await generateHeader(options);
  const footer = generateFooter(options);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}${options.documentNumber ? ` - ${options.documentNumber}` : ''}</title>
  <style>
    ${getBaseStyles(accentHex)}
  </style>
</head>
<body>
  ${header}
  <main>
    ${bodyContent}
  </main>
  ${footer}
</body>
</html>
  `.trim();
}

/**
 * Format currency value
 */
export function formatCurrency(amount: number, currency: string = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date short
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Get status class name
 */
export function getStatusClass(status: string): string {
  const normalized = status.toLowerCase().replace(/[^a-z]/g, '');
  return `status-${normalized}`;
}

