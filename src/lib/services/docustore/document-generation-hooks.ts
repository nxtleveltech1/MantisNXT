/**
 * Document Generation Hooks
 *
 * Event-driven document generation for automatic PDF creation when entities are created/updated.
 * Calls module-specific PDF services with full entity data - no mock/placeholder.
 */

import { InvoiceService } from '@/lib/services/sales';
import { SalesPDFService } from '@/lib/services/sales/documents/sales-pdf-service';
import { SalesOrderService } from '@/lib/services/sales/SalesOrderService';
import { QuotationPDFService } from '@/lib/services/docustore/quotation-pdf-service';
import { LogisticsPDFService, type DeliveryNoteData } from '@/lib/services/logistics/logistics-pdf-service';
import { PurchaseOrderPDFService, type PurchaseOrderData } from '@/lib/services/purchasing/purchase-order-pdf-service';
import { FinancialPDFService, type JournalEntryData } from '@/lib/services/financial/financial-pdf-service';
import {
  generateRepairOrderPDF,
  getCustomerForRepair,
  type RepairOrder,
  type RepairOrderItem,
} from '@/services/repairs/repairPDFService';
import { query } from '@/lib/database';

/**
 * Event listener for entity creation events
 * Auto-generates PDF documents and stores them in DocuStore via module-specific services
 */
export class DocumentGenerationHooks {
  /**
   * Handle quotation creation event
   * Note: QuotationService.createQuotation may also generate PDF - hook provides backup/consistency
   */
  static async onQuotationCreated(
    quotationId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      const quotationData = await QuotationPDFService.getQuotationForPDF(quotationId);
      if (quotationData) {
        await QuotationPDFService.generateQuotationPDF(quotationData, orgId, userId);
      }
    } catch (error) {
      console.error('Error auto-generating quotation PDF:', error);
    }
  }

  /**
   * Handle invoice creation event
   */
  static async onInvoiceCreated(
    invoiceId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      const invoice = await InvoiceService.getInvoiceById(invoiceId, orgId);
      if (!invoice) return;

      const items = await InvoiceService.getInvoiceItems(invoiceId);
      const customer = await SalesPDFService.getCustomerInfo(orgId, invoice.customer_id);

      await SalesPDFService.generatePDF({
        document: {
          id: invoice.id,
          org_id: orgId,
          customer_id: invoice.customer_id,
          document_number: invoice.document_number,
          reference_number: invoice.reference_number,
          status: invoice.status,
          currency: invoice.currency,
          subtotal: invoice.subtotal,
          total_tax: invoice.total_tax,
          total: invoice.total,
          amount_paid: invoice.amount_paid,
          amount_due: invoice.amount_due,
          notes: invoice.notes,
          due_date: invoice.due_date,
          created_at: invoice.created_at,
          metadata: invoice.metadata,
        },
        items,
        customer: customer || { id: invoice.customer_id, name: 'Customer' },
        documentKind: 'invoice',
        storeInDocuStore: true,
        userId,
      });
    } catch (error) {
      console.error('Error auto-generating invoice PDF:', error);
    }
  }

  /**
   * Handle sales order creation event
   */
  static async onSalesOrderCreated(
    salesOrderId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      const order = await SalesOrderService.getSalesOrderById(salesOrderId, orgId);
      if (!order || !order.customer_id) return;

      const items = await SalesOrderService.getSalesOrderItems(salesOrderId);
      const customer = await SalesPDFService.getCustomerInfo(orgId, order.customer_id);

      const documentNumber = order.document_number || order.order_number || `SO-${salesOrderId.slice(0, 8)}`;

      await SalesPDFService.generatePDF({
        document: {
          id: order.id,
          org_id: orgId,
          customer_id: order.customer_id,
          document_number: documentNumber,
          reference_number: order.reference_number,
          status: order.status || order.status_enum || 'draft',
          currency: order.currency || 'ZAR',
          subtotal: (order.total ?? 0) - (order.total_tax ?? 0),
          total_tax: order.total_tax ?? 0,
          total: order.total ?? 0,
          created_at: order.created_at || new Date().toISOString(),
          metadata: order.metadata,
        },
        items: items.map((i) => ({
          name: i.name || 'Item',
          quantity: i.quantity,
          unit_price: i.price ?? 0,
          tax_rate: 0,
          tax_amount: i.tax ?? 0,
          subtotal: i.subtotal ?? 0,
          total: i.total ?? 0,
        })),
        customer: customer || { id: order.customer_id, name: 'Customer' },
        documentKind: 'sales_order',
        storeInDocuStore: true,
        userId,
      });
    } catch (error) {
      console.error('Error auto-generating sales order PDF:', error);
    }
  }

  /**
   * Handle rental reservation creation event
   * Rental agreements use agreementService - skip if no PDF service exists
   */
  static async onRentalReservationCreated(
    _reservationId: string,
    _orgId: string,
    _userId?: string
  ): Promise<void> {
    // Rental agreement PDF is generated by agreementService.generateRentalAgreement
    // when reservation is confirmed. No separate DocuStore hook needed.
  }

  /**
   * Handle repair order creation event
   */
  static async onRepairOrderCreated(
    repairOrderId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      const { order, items, customer } = await getRepairOrderData(repairOrderId, orgId);
      if (!order || !customer) return;

      await generateRepairOrderPDF(
        order as RepairOrder,
        items as RepairOrderItem[],
        customer,
        userId
      );
    } catch (error) {
      console.error('Error auto-generating repair order PDF:', error);
    }
  }

  /**
   * Handle purchase order creation event
   */
  static async onPurchaseOrderCreated(
    purchaseOrderId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      const data = await getPurchaseOrderData(purchaseOrderId, orgId);
      if (data) {
        await PurchaseOrderPDFService.generatePurchaseOrder(data, userId);
      }
    } catch (error) {
      console.error('Error auto-generating purchase order PDF:', error);
    }
  }

  /**
   * Handle journal entry creation event
   */
  static async onJournalEntryCreated(
    journalEntryId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      const data = await getJournalEntryData(journalEntryId, orgId);
      if (data) {
        await FinancialPDFService.generateJournalEntry(data, userId);
      }
    } catch (error) {
      console.error('Error auto-generating journal entry PDF:', error);
    }
  }

  /**
   * Handle delivery creation event
   */
  static async onDeliveryCreated(
    deliveryId: string,
    orgId: string,
    userId?: string
  ): Promise<void> {
    try {
      const data = await getDeliveryNoteData(deliveryId, orgId);
      if (data) {
        await LogisticsPDFService.generateDeliveryNote(data, userId);
      }
    } catch (error) {
      console.error('Error auto-generating delivery note PDF:', error);
    }
  }

  /**
   * Handle stock adjustment creation event
   * Stock adjustments are operational - no PDF generation per plan
   */
  static async onStockAdjustmentCreated(
    _adjustmentId: string,
    _orgId: string,
    _userId?: string
  ): Promise<void> {
    // Skipped: operational/internal, doesn't return document ID per DOCUSTORE_IMPLEMENTATION_STATUS
  }

  /**
   * Handle POS sale completed event
   */
  static async onPOSSaleCompleted(
    _transactionId: string,
    salesOrderId: string,
    invoiceId: string,
    orgId: string,
    userId?: string
  ): Promise<{ receiptHtml?: string; receiptUrl?: string } | void> {
    try {
      await this.onSalesOrderCreated(salesOrderId, orgId, userId);
      await this.onInvoiceCreated(invoiceId, orgId, userId);
    } catch (error) {
      console.error('Error generating POS documents:', error);
    }
  }
}

// ---------------------------------------------------------------------------
// Data fetch helpers for PDF generation
// ---------------------------------------------------------------------------

async function getDeliveryNoteData(
  deliveryId: string,
  orgId: string
): Promise<DeliveryNoteData | null> {
  const deliveryResult = await query<{
    id: string;
    delivery_number: string;
    order_id: string | null;
    order_number: string | null;
    customer_name: string | null;
    customer_company: string | null;
    customer_phone: string | null;
    delivery_address: string | Record<string, unknown>;
    delivery_date: string | null;
    delivery_contact: string | null;
    notes: string | null;
    driver_name: string | null;
    vehicle_registration: string | null;
  }>(
    `SELECT 
       d.id, d.delivery_number, d.sales_order_id as order_id,
       o.document_number as order_number,
       c.name as customer_name, c.company as customer_company,
       c.phone as customer_phone,
       d.delivery_address::text as delivery_address,
       COALESCE(d.actual_delivery_date::text, d.requested_delivery_date::text, d.created_at::text) as delivery_date,
       d.delivery_contact_name as delivery_contact,
       d.special_instructions as notes,
       (d.metadata->>'driver_name')::text as driver_name,
       (d.metadata->>'vehicle_registration')::text as vehicle_registration
     FROM deliveries d
     LEFT JOIN sales_orders o ON o.id = d.sales_order_id
     LEFT JOIN customer c ON c.id = d.customer_id
     WHERE d.id = $1 AND d.org_id = $2`,
    [deliveryId, orgId]
  );

  if (deliveryResult.rows.length === 0) return null;

  const d = deliveryResult.rows[0];
  const orderId = d.order_id || deliveryId;
  const orderNumber = d.order_number || d.delivery_number;

  const itemsResult = await query<{ product_name: string; sku: string | null; quantity: number }>(
    `SELECT 
       COALESCE(p.name, di.product_name, 'Item') as product_name,
       COALESCE(p.sku, di.sku) as sku,
       di.quantity::numeric::float as quantity
     FROM delivery_items di
     LEFT JOIN inventory.products p ON p.id = di.product_id
     WHERE di.delivery_id = $1
     ORDER BY di.id`,
    [deliveryId]
  );

  const deliveryAddress =
    typeof d.delivery_address === 'string'
      ? d.delivery_address
      : d.delivery_address && typeof d.delivery_address === 'object'
        ? Object.values(d.delivery_address as Record<string, string>).filter(Boolean).join(', ')
        : '';

  return {
    deliveryId: d.id,
    deliveryNumber: d.delivery_number,
    orgId,
    orderId,
    orderNumber,
    customer: {
      name: d.customer_name || 'Customer',
      company: d.customer_company || undefined,
      phone: d.customer_phone || undefined,
    },
    deliveryAddress: deliveryAddress || 'Address not specified',
    deliveryDate: d.delivery_date || new Date().toISOString().slice(0, 10),
    deliveryContact: d.delivery_contact || undefined,
    items: itemsResult.rows.map((i) => ({
      name: i.product_name,
      sku: i.sku || undefined,
      quantity: Number(i.quantity),
    })),
    notes: d.notes || undefined,
    driver: d.driver_name || undefined,
    vehicleReg: d.vehicle_registration || undefined,
  };
}

async function getPurchaseOrderData(
  purchaseOrderId: string,
  orgId: string
): Promise<PurchaseOrderData | null> {
  const poResult = await query<{
    id: string;
    po_number: string;
    status: string;
    supplier_id: string;
    supplier_name: string;
    supplier_contact: string | null;
    supplier_email: string | null;
    supplier_phone: string | null;
    supplier_address: string | null;
    ship_to_name: string | null;
    ship_to_address: string | null;
    order_date: string;
    expected_date: string | null;
    currency: string;
    subtotal: number;
    total_tax: number;
    total: number;
    notes: string | null;
    terms: string | null;
  }>(
    `SELECT 
       po.id, po.po_number, po.status,
       po.supplier_id, s.name as supplier_name,
       s.contact_name as supplier_contact, s.email as supplier_email,
       s.phone as supplier_phone, s.address as supplier_address,
       po.ship_to_name, po.ship_to_address,
       po.order_date, po.expected_date, po.currency,
       po.subtotal, po.total_tax, po.total,
       po.notes, po.terms
     FROM purchasing.purchase_orders po
     LEFT JOIN purchasing.suppliers s ON s.id = po.supplier_id
     WHERE po.id = $1 AND po.org_id = $2`,
    [purchaseOrderId, orgId]
  );

  if (poResult.rows.length === 0) return null;

  const po = poResult.rows[0];

  const itemsResult = await query<{
    line_number: number;
    product_name: string | null;
    sku: string | null;
    description: string | null;
    quantity: number;
    unit: string | null;
    unit_price: number;
    tax_rate: number | null;
    tax_amount: number | null;
    subtotal: number;
    total: number;
  }>(
    `SELECT 
       poi.line_number, p.name as product_name, p.sku,
       poi.description, poi.quantity, poi.unit,
       poi.unit_price, poi.tax_rate, poi.tax_amount,
       poi.subtotal, poi.total
     FROM purchasing.purchase_order_items poi
     LEFT JOIN inventory.products p ON p.id = poi.product_id
     WHERE poi.purchase_order_id = $1
     ORDER BY poi.line_number`,
    [purchaseOrderId]
  );

  return {
    purchaseOrderId: po.id,
    poNumber: po.po_number,
    orgId,
    status: po.status,
    supplier: {
      id: po.supplier_id,
      name: po.supplier_name,
      contactName: po.supplier_contact || undefined,
      email: po.supplier_email || undefined,
      phone: po.supplier_phone || undefined,
      address: po.supplier_address || undefined,
    },
    shipTo: po.ship_to_name ? { name: po.ship_to_name, address: po.ship_to_address || '' } : undefined,
    orderDate: po.order_date,
    expectedDate: po.expected_date || undefined,
    currency: po.currency,
    items: itemsResult.rows.map((i) => ({
      lineNumber: i.line_number,
      productName: i.product_name || 'Unlisted Item',
      sku: i.sku || undefined,
      description: i.description || undefined,
      quantity: i.quantity,
      unit: i.unit || undefined,
      unitPrice: i.unit_price,
      taxRate: i.tax_rate || undefined,
      taxAmount: i.tax_amount || undefined,
      subtotal: i.subtotal,
      total: i.total,
    })),
    subtotal: po.subtotal,
    totalTax: po.total_tax,
    total: po.total,
    notes: po.notes || undefined,
    terms: po.terms || undefined,
  };
}

async function getJournalEntryData(
  journalEntryId: string,
  orgId: string
): Promise<JournalEntryData | null> {
  const entryResult = await query<{
    id: string;
    entry_number: string;
    entry_date: string;
    description: string;
    currency: string;
    total_debit: number;
    total_credit: number;
  }>(
    `SELECT id, entry_number, entry_date, description, currency, total_debit, total_credit
     FROM financial.journal_entries
     WHERE id = $1 AND org_id = $2`,
    [journalEntryId, orgId]
  );

  if (entryResult.rows.length === 0) return null;

  const entry = entryResult.rows[0];

  const linesResult = await query<{
    account_code: string;
    account_name: string;
    debit_amount: number;
    credit_amount: number;
    description: string;
  }>(
    `SELECT a.account_code, a.account_name, jl.debit_amount, jl.credit_amount, jl.description
     FROM financial.journal_entry_lines jl
     JOIN financial.accounts a ON a.id = jl.account_id
     WHERE jl.journal_entry_id = $1
     ORDER BY jl.line_number`,
    [journalEntryId]
  );

  return {
    entryId: entry.id,
    entryNumber: entry.entry_number,
    orgId,
    entryDate: entry.entry_date,
    description: entry.description,
    currency: entry.currency || 'ZAR',
    lines: linesResult.rows.map((l) => ({
      accountCode: l.account_code,
      accountName: l.account_name,
      description: l.description || undefined,
      debit: l.debit_amount || 0,
      credit: l.credit_amount || 0,
    })),
    totalDebit: entry.total_debit,
    totalCredit: entry.total_credit,
  };
}

async function getRepairOrderData(
  repairOrderId: string,
  _orgId: string
): Promise<{
  order: RepairOrder | null;
  items: RepairOrderItem[];
  customer: Awaited<ReturnType<typeof getCustomerForRepair>> | null;
}> {
  const orderResult = await query<{
    order_id: string;
    org_id: string;
    order_number: string;
    customer_id: string;
    equipment_name: string;
    equipment_model: string | null;
    equipment_serial: string | null;
    issue_description: string;
    diagnosis: string | null;
    status: string;
    priority: string;
    labor_hours: number | null;
    labor_rate: number | null;
    parts_total: number | null;
    subtotal: number;
    total_tax: number;
    total: number;
    notes: string | null;
    estimated_completion_date: string | null;
    actual_completion_date: string | null;
    created_at: string;
  }>(
    `SELECT repair_order_id as order_id, org_id, order_number, customer_id,
            equipment_name, equipment_model, equipment_serial, issue_description,
            diagnosis, status, priority, labor_hours, labor_rate, parts_total,
            subtotal, total_tax, total, notes,
            estimated_completion_date, actual_completion_date, created_at
     FROM repairs.repair_orders
     WHERE repair_order_id = $1`,
    [repairOrderId]
  );

  if (orderResult.rows.length === 0) return { order: null, items: [], customer: null };

  const o = orderResult.rows[0];
  const customer = await getCustomerForRepair(o.customer_id);

  const itemsResult = await query<{
    item_id: string;
    part_name: string;
    part_number: string | null;
    quantity: number;
    unit_cost: number;
    total_cost: number;
  }>(
    `SELECT item_id, part_name, part_number, quantity, unit_cost, total_cost
     FROM repairs.repair_order_items
     WHERE repair_order_id = $1
     ORDER BY item_id`,
    [repairOrderId]
  );

  const order: RepairOrder = {
    order_id: o.order_id,
    org_id: o.org_id,
    order_number: o.order_number,
    customer_id: o.customer_id,
    equipment_name: o.equipment_name,
    equipment_model: o.equipment_model || undefined,
    equipment_serial: o.equipment_serial || undefined,
    issue_description: o.issue_description,
    diagnosis: o.diagnosis || undefined,
    status: o.status,
    priority: o.priority,
    labor_hours: o.labor_hours ?? undefined,
    labor_rate: o.labor_rate ?? undefined,
    parts_total: o.parts_total ?? undefined,
    subtotal: o.subtotal,
    total_tax: o.total_tax,
    total: o.total,
    notes: o.notes || undefined,
    estimated_completion_date: o.estimated_completion_date || undefined,
    actual_completion_date: o.actual_completion_date || undefined,
    created_at: o.created_at,
  };

  const items: RepairOrderItem[] = itemsResult.rows.map((i) => ({
    item_id: i.item_id,
    part_name: i.part_name,
    part_number: i.part_number || undefined,
    quantity: i.quantity,
    unit_cost: i.unit_cost,
    total_cost: i.total_cost,
  }));

  return { order, items, customer };
}
