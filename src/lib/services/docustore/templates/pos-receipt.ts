/**
 * POS Receipt Template
 * 
 * Compact receipt format optimized for thermal printers (80mm width).
 * Includes: Store info, items, totals, payment method, transaction ID.
 */

import { formatCurrency, formatDateShort } from './base-template';

export interface POSReceiptData {
  transaction_id: string;
  invoice_number: string;
  sales_order_number?: string;
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_vat?: string;
  customer_name?: string;
  customer_email?: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax_amount: number;
  total: number;
  payment_method: string;
  payment_reference?: string;
  amount_tendered?: number;
  change_due?: number;
  cashier_name?: string;
  created_at: string;
}

/**
 * Get CSS styles for thermal receipt (80mm width)
 */
function getReceiptStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: 80mm auto;
      margin: 2mm;
    }
    
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      line-height: 1.3;
      color: #000;
      background: #fff;
      width: 76mm;
      padding: 2mm;
    }
    
    .receipt {
      width: 100%;
    }
    
    /* Header */
    .receipt-header {
      text-align: center;
      padding-bottom: 3mm;
      border-bottom: 1px dashed #000;
      margin-bottom: 3mm;
    }
    
    .store-name {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 2mm;
    }
    
    .store-details {
      font-size: 8pt;
      line-height: 1.4;
    }
    
    /* Transaction Info */
    .transaction-info {
      font-size: 9pt;
      padding-bottom: 2mm;
      border-bottom: 1px dashed #000;
      margin-bottom: 3mm;
    }
    
    .transaction-info div {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1mm;
    }
    
    .transaction-info .label {
      font-weight: normal;
    }
    
    .transaction-info .value {
      font-weight: bold;
      text-align: right;
    }
    
    /* Customer Info */
    .customer-info {
      font-size: 9pt;
      padding-bottom: 2mm;
      margin-bottom: 3mm;
      border-bottom: 1px dashed #000;
    }
    
    /* Items */
    .items-section {
      margin-bottom: 3mm;
    }
    
    .item {
      margin-bottom: 2mm;
    }
    
    .item-line1 {
      display: flex;
      justify-content: space-between;
    }
    
    .item-name {
      flex: 1;
      font-weight: normal;
      font-size: 9pt;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 45mm;
    }
    
    .item-subtotal {
      font-weight: bold;
      text-align: right;
      width: 20mm;
    }
    
    .item-line2 {
      font-size: 8pt;
      color: #333;
      margin-left: 2mm;
    }
    
    .item-qty-price {
      display: inline-block;
    }
    
    /* Divider */
    .divider {
      border-top: 1px dashed #000;
      margin: 2mm 0;
    }
    
    .divider-double {
      border-top: 2px solid #000;
      margin: 2mm 0;
    }
    
    /* Totals */
    .totals-section {
      font-size: 10pt;
      padding-bottom: 2mm;
    }
    
    .total-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1mm;
    }
    
    .total-line.grand-total {
      font-size: 12pt;
      font-weight: bold;
      padding-top: 2mm;
      border-top: 2px solid #000;
      margin-top: 2mm;
    }
    
    .total-line .label {
      text-align: left;
    }
    
    .total-line .value {
      text-align: right;
      font-weight: bold;
    }
    
    /* Payment */
    .payment-section {
      font-size: 9pt;
      padding: 2mm 0;
      border-top: 1px dashed #000;
      margin-top: 2mm;
    }
    
    .payment-method {
      text-align: center;
      font-weight: bold;
      font-size: 10pt;
      text-transform: uppercase;
      margin-bottom: 2mm;
    }
    
    /* Footer */
    .receipt-footer {
      text-align: center;
      padding-top: 3mm;
      border-top: 1px dashed #000;
      margin-top: 3mm;
      font-size: 8pt;
    }
    
    .thank-you {
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 2mm;
    }
    
    .transaction-id {
      font-size: 8pt;
      margin-top: 2mm;
      word-break: break-all;
    }
    
    .barcode-placeholder {
      text-align: center;
      margin: 3mm 0;
      font-family: 'Libre Barcode 39', monospace;
      font-size: 24pt;
    }
    
    /* Utilities */
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-bold { font-weight: bold; }
    .text-small { font-size: 8pt; }
  `;
}

/**
 * Generate POS receipt HTML
 */
export function generatePOSReceiptHtml(data: POSReceiptData): string {
  const formattedDate = new Date(data.created_at).toLocaleString('en-ZA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const paymentMethodDisplay = {
    cash: 'CASH',
    card: 'CARD',
    digital: 'DIGITAL/EFT',
    account: 'ON ACCOUNT',
  }[data.payment_method] || data.payment_method.toUpperCase();

  // Generate items HTML
  const itemsHtml = data.items
    .map(
      (item) => `
      <div class="item">
        <div class="item-line1">
          <span class="item-name">${escapeHtml(item.name)}</span>
          <span class="item-subtotal">${formatCurrency(item.subtotal)}</span>
        </div>
        <div class="item-line2">
          <span class="item-qty-price">${item.quantity} x ${formatCurrency(item.unit_price)}</span>
          ${item.sku ? `<span> (${item.sku})</span>` : ''}
        </div>
      </div>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${data.invoice_number}</title>
  <style>${getReceiptStyles()}</style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="receipt-header">
      <div class="store-name">${escapeHtml(data.store_name || 'NXT Store')}</div>
      <div class="store-details">
        ${data.store_address ? `<div>${escapeHtml(data.store_address)}</div>` : ''}
        ${data.store_phone ? `<div>Tel: ${escapeHtml(data.store_phone)}</div>` : ''}
        ${data.store_vat ? `<div>VAT: ${escapeHtml(data.store_vat)}</div>` : ''}
      </div>
    </div>
    
    <!-- Transaction Info -->
    <div class="transaction-info">
      <div>
        <span class="label">Invoice:</span>
        <span class="value">${escapeHtml(data.invoice_number)}</span>
      </div>
      <div>
        <span class="label">Date:</span>
        <span class="value">${formattedDate}</span>
      </div>
      ${data.cashier_name ? `
      <div>
        <span class="label">Cashier:</span>
        <span class="value">${escapeHtml(data.cashier_name)}</span>
      </div>
      ` : ''}
    </div>
    
    ${data.customer_name ? `
    <!-- Customer Info -->
    <div class="customer-info">
      <div><strong>Customer:</strong> ${escapeHtml(data.customer_name)}</div>
      ${data.customer_email ? `<div>${escapeHtml(data.customer_email)}</div>` : ''}
    </div>
    ` : ''}
    
    <!-- Items -->
    <div class="items-section">
      ${itemsHtml}
    </div>
    
    <div class="divider"></div>
    
    <!-- Totals -->
    <div class="totals-section">
      <div class="total-line">
        <span class="label">Subtotal:</span>
        <span class="value">${formatCurrency(data.subtotal)}</span>
      </div>
      ${data.tax_amount > 0 ? `
      <div class="total-line">
        <span class="label">VAT (15%):</span>
        <span class="value">${formatCurrency(data.tax_amount)}</span>
      </div>
      ` : ''}
      <div class="total-line grand-total">
        <span class="label">TOTAL:</span>
        <span class="value">${formatCurrency(data.total)}</span>
      </div>
    </div>
    
    <!-- Payment -->
    <div class="payment-section">
      <div class="payment-method">Paid by ${paymentMethodDisplay}</div>
      ${data.amount_tendered ? `
      <div class="total-line">
        <span class="label">Tendered:</span>
        <span class="value">${formatCurrency(data.amount_tendered)}</span>
      </div>
      ` : ''}
      ${data.change_due ? `
      <div class="total-line">
        <span class="label">Change:</span>
        <span class="value">${formatCurrency(data.change_due)}</span>
      </div>
      ` : ''}
      ${data.payment_reference ? `
      <div class="text-small text-center">Ref: ${escapeHtml(data.payment_reference)}</div>
      ` : ''}
    </div>
    
    <!-- Footer -->
    <div class="receipt-footer">
      <div class="thank-you">Thank you for your purchase!</div>
      <div>Goods sold are not returnable</div>
      <div>unless faulty or by arrangement.</div>
      <div class="transaction-id">
        ID: ${data.transaction_id.substring(0, 8).toUpperCase()}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

export default generatePOSReceiptHtml;

