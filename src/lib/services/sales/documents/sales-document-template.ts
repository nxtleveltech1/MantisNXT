import { NXT_DEFAULT_DOCUMENT_COPY } from './nxt-document-copy';

export type SalesDocumentKind = 'invoice' | 'quotation' | 'proforma' | 'proforma_invoice' | 'sales_order' | 'credit_note';

export type SalesParty = {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLines?: string[] | null;
};

export type SalesLineItem = {
  line_number?: number | null;
  sku?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number; // 0..1
  tax_amount: number;
  subtotal: number;
  total: number;
  metadata?: Record<string, unknown> | null;
};

export type SalesDocumentHeader = {
  documentNumber: string;
  status?: string | null;
  currency: string;
  issueDate?: string | null;
  dueDate?: string | null; // invoice
  validUntil?: string | null; // quotation
  referenceNumber?: string | null;
  source?: string | null; // e.g. "S11407"
  salesperson?: string | null;
};

export type SalesDocumentTotals = {
  subtotal: number;
  totalTax: number;
  total: number;
  amountPaid?: number;
  amountDue?: number;
};

export type SalesDocumentTemplateInput = {
  kind: SalesDocumentKind;
  logoDataUri: string;
  accentHex: string;
  companyDisplayName: string;
  customer: SalesParty;
  header: SalesDocumentHeader;
  items: SalesLineItem[];
  totals: SalesDocumentTotals;
  notes?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    d
  );
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback: currency codes that Intl might not support in some environments.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatPercent(rate: number) {
  const pct = rate * 100;
  return `${pct.toFixed(pct % 1 === 0 ? 0 : 2)}%`;
}

function isNoteLine(item: SalesLineItem) {
  return item.metadata?.kind === 'note' || item.metadata?.is_note_line === true;
}

export function renderSalesDocumentHtml(input: SalesDocumentTemplateInput): string {
  const docTitle = input.kind === 'invoice' ? 'Invoice' : 'Quotation';
  const accent = input.accentHex;

  const metaRows: Array<{ label: string; value: string }> = [];
  metaRows.push({ label: `${docTitle} #`, value: input.header.documentNumber });

  if (input.header.issueDate) metaRows.push({ label: 'Date', value: formatDate(input.header.issueDate) });
  if (input.kind === 'invoice' && input.header.dueDate) {
    metaRows.push({ label: 'Due date', value: formatDate(input.header.dueDate) });
  }
  if (input.kind === 'quotation' && input.header.validUntil) {
    metaRows.push({ label: 'Valid until', value: formatDate(input.header.validUntil) });
  }
  if (input.header.salesperson) metaRows.push({ label: 'Salesperson', value: input.header.salesperson });
  if (input.header.source) metaRows.push({ label: 'Source', value: input.header.source });
  if (input.header.referenceNumber) metaRows.push({ label: 'Reference', value: input.header.referenceNumber });

  const customerLines: string[] = [];
  customerLines.push(input.customer.company ? `${input.customer.company}` : input.customer.name);
  if (input.customer.company) customerLines.push(input.customer.name);
  if (input.customer.email) customerLines.push(input.customer.email);
  if (input.customer.phone) customerLines.push(input.customer.phone);
  if (input.customer.addressLines && input.customer.addressLines.length > 0) {
    customerLines.push(...input.customer.addressLines);
  }

  const notesBlock = input.notes ? escapeHtml(input.notes).replaceAll('\n', '<br />') : '';

  const tableRowsHtml = input.items
    .map(item => {
      if (isNoteLine(item)) {
        return `
          <tr class="note-row">
            <td class="col-line">${item.line_number ?? ''}</td>
            <td class="col-desc" colspan="6">
              <div class="desc-title">${escapeHtml(item.name)}</div>
              ${item.description ? `<div class="desc-sub">${escapeHtml(item.description)}</div>` : ''}
            </td>
          </tr>
        `.trim();
      }

      return `
        <tr>
          <td class="col-line">${item.line_number ?? ''}</td>
          <td class="col-sku">${item.sku ? escapeHtml(item.sku) : ''}</td>
          <td class="col-desc">
            <div class="desc-title">${escapeHtml(item.name)}</div>
            ${item.description ? `<div class="desc-sub">${escapeHtml(item.description)}</div>` : ''}
          </td>
          <td class="col-qty">${item.quantity.toFixed(2)}</td>
          <td class="col-unit">${formatCurrency(item.unit_price, input.header.currency)}</td>
          <td class="col-tax">${formatPercent(item.tax_rate)}</td>
          <td class="col-amount">${formatCurrency(item.total, input.header.currency)}</td>
        </tr>
      `.trim();
    })
    .join('\n');

  const totalsRows: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: 'Subtotal', value: formatCurrency(input.totals.subtotal, input.header.currency) },
    { label: 'VAT', value: formatCurrency(input.totals.totalTax, input.header.currency) },
    { label: 'Total', value: formatCurrency(input.totals.total, input.header.currency), strong: true },
  ];

  if (input.kind === 'invoice') {
    if (typeof input.totals.amountPaid === 'number') {
      totalsRows.push({ label: 'Paid', value: formatCurrency(input.totals.amountPaid, input.header.currency) });
    }
    if (typeof input.totals.amountDue === 'number') {
      totalsRows.push({
        label: 'Amount due',
        value: formatCurrency(input.totals.amountDue, input.header.currency),
        strong: true,
      });
    }
  }

  const footerCompanyLines = [
    ...NXT_DEFAULT_DOCUMENT_COPY.companyLines,
    ...NXT_DEFAULT_DOCUMENT_COPY.addressLines,
    NXT_DEFAULT_DOCUMENT_COPY.contactLine,
    `${NXT_DEFAULT_DOCUMENT_COPY.website} / VAT: ${NXT_DEFAULT_DOCUMENT_COPY.vatNumber}`,
  ];

  const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(docTitle)} ${escapeHtml(input.header.documentNumber)}</title>
    <style>
      :root {
        --accent: ${accent};
        --ink: #0f172a;
        --muted: #475569;
        --line: #e2e8f0;
        --soft: #f8fafc;
      }

      * { box-sizing: border-box; }
      body {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
        color: var(--ink);
        margin: 0;
        padding: 0;
      }

      .page {
        padding: 0;
      }

      .header {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 16px;
        align-items: start;
        padding: 18mm 14mm 10mm 14mm;
        border-bottom: 2px solid var(--accent);
      }

      .brand {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .brand img {
        width: 44px;
        height: 44px;
        object-fit: contain;
      }
      .brand-title {
        font-weight: 800;
        letter-spacing: -0.02em;
        font-size: 16px;
        line-height: 1.2;
      }
      .brand-sub {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.2;
        margin-top: 2px;
      }

      .doc-title {
        text-align: right;
      }
      .doc-title h1 {
        margin: 0;
        font-size: 18px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .doc-title .badge {
        display: inline-block;
        margin-top: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid var(--line);
        color: var(--muted);
      }

      .content {
        padding: 10mm 14mm 14mm 14mm;
      }

      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-bottom: 14px;
      }

      .card {
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 12px;
      }

      .card h2 {
        margin: 0 0 8px 0;
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .kv {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2px;
        font-size: 12px;
        line-height: 1.35;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 10px;
        font-size: 12px;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        border-bottom: 1px dashed #eef2f7;
        padding-bottom: 6px;
      }
      .meta-row:last-child { border-bottom: none; padding-bottom: 0; }
      .meta-row .k { color: var(--muted); }
      .meta-row .v { font-weight: 600; }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        font-size: 12px;
      }
      thead th {
        text-align: left;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
        padding: 10px 8px;
        border-bottom: 2px solid var(--line);
      }
      tbody td {
        padding: 10px 8px;
        border-bottom: 1px solid #eef2f7;
        vertical-align: top;
      }
      tbody tr:nth-child(even) td { background: #fcfcfd; }

      .col-line { width: 36px; color: var(--muted); }
      .col-sku { width: 110px; color: var(--muted); }
      .col-qty { width: 64px; text-align: right; }
      .col-unit { width: 110px; text-align: right; }
      .col-tax { width: 64px; text-align: right; color: var(--muted); }
      .col-amount { width: 130px; text-align: right; font-weight: 700; }

      .desc-title { font-weight: 700; }
      .desc-sub { margin-top: 2px; color: var(--muted); font-size: 11px; line-height: 1.3; }

      .note-row td { background: #fff7ed !important; }
      .note-row .desc-title { color: #9a3412; }

      .totals {
        margin-top: 14px;
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 14px;
        align-items: start;
      }

      .notes h3 {
        margin: 0 0 6px 0;
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .notes .body {
        font-size: 12px;
        color: var(--ink);
        line-height: 1.45;
        white-space: normal;
      }

      .totals-card {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 12px;
        background: var(--soft);
      }
      .totals-card .row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 6px 0;
        border-bottom: 1px dashed #e5e7eb;
        font-size: 12px;
      }
      .totals-card .row:last-child { border-bottom: none; }
      .totals-card .k { color: var(--muted); }
      .totals-card .v { font-weight: 700; }
      .totals-card .row.strong .k { color: var(--ink); font-weight: 700; }
      .totals-card .row.strong .v { font-size: 14px; }

      .footer {
        padding: 10mm 14mm 14mm 14mm;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 10.5px;
        line-height: 1.4;
      }
      .footer .cols {
        display: grid;
        grid-template-columns: 1.3fr 1fr;
        gap: 14px;
      }
      .footer .title {
        color: var(--ink);
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 10px;
        margin-bottom: 6px;
      }
      .footer a { color: var(--accent); text-decoration: none; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

      @page {
        size: A4;
        margin: 0;
      }

      @media print {
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div class="brand">
          <img src="${input.logoDataUri}" alt="Logo" />
          <div>
            <div class="brand-title">${escapeHtml(input.companyDisplayName)}</div>
            <div class="brand-sub">${escapeHtml(NXT_DEFAULT_DOCUMENT_COPY.contactLine)}</div>
          </div>
        </div>

        <div class="doc-title">
          <h1>${escapeHtml(docTitle)}</h1>
          <div class="badge">${escapeHtml(input.header.status ?? '')}</div>
        </div>
      </div>

      <div class="content">
        <div class="grid-2">
          <div class="card">
            <h2>Bill To</h2>
            <div class="kv">
              ${customerLines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}
            </div>
          </div>

          <div class="card">
            <h2>Document Details</h2>
            <div class="meta-grid">
              ${metaRows
                .map(
                  r => `
                    <div class="meta-row">
                      <div class="k">${escapeHtml(r.label)}</div>
                      <div class="v">${escapeHtml(r.value)}</div>
                    </div>
                  `.trim()
                )
                .join('')}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="col-line">#</th>
              <th class="col-sku">Code</th>
              <th>Description</th>
              <th class="col-qty">Qty</th>
              <th class="col-unit">Unit</th>
              <th class="col-tax">Tax</th>
              <th class="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="notes">
            ${notesBlock ? `<h3>Notes</h3><div class="body">${notesBlock}</div>` : ''}
          </div>

          <div class="totals-card">
            ${totalsRows
              .map(
                r => `
                  <div class="row ${r.strong ? 'strong' : ''}">
                    <div class="k">${escapeHtml(r.label)}</div>
                    <div class="v">${escapeHtml(r.value)}</div>
                  </div>
                `.trim()
              )
              .join('')}
          </div>
        </div>
      </div>

      <div class="footer">
        <div class="cols">
          <div>
            <div class="title">Company</div>
            ${footerCompanyLines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}
          </div>
          <div>
            <div class="title">Payment & Terms</div>
            ${NXT_DEFAULT_DOCUMENT_COPY.bankDetailsLines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}
            <div style="margin-top: 8px" class="mono">${escapeHtml(NXT_DEFAULT_DOCUMENT_COPY.termsTitle)}</div>
            ${NXT_DEFAULT_DOCUMENT_COPY.termsBodyLines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}
            <div style="margin-top: 6px">
              <a href="${escapeHtml(NXT_DEFAULT_DOCUMENT_COPY.termsUrl)}">${escapeHtml(
    NXT_DEFAULT_DOCUMENT_COPY.termsUrl
  )}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim();

  return html;
}


