/**
 * Proforma Invoice Service
 *
 * Handles CRUD operations for proforma invoices
 */

import { query } from '@/lib/database/unified-connection';
import { DocumentNumberingService } from './DocumentNumberingService';

export interface ProformaInvoice {
  id: string;
  org_id: string;
  customer_id: string;
  sales_order_id?: string | null;
  document_number: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'converted';
  currency: string;
  subtotal: number;
  total_tax: number;
  total: number;
  reference_number?: string | null;
  notes?: string | null;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProformaInvoiceItem {
  id: string;
  proforma_invoice_id: string;
  product_id?: string | null;
  supplier_product_id?: string | null;
  sku?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  line_number?: number | null;
  metadata?: Record<string, unknown>;
}

export interface ProformaInvoiceInsert {
  org_id: string;
  customer_id: string;
  sales_order_id?: string | null;
  document_number?: string;
  status?: ProformaInvoice['status'];
  currency?: string;
  reference_number?: string | null;
  notes?: string | null;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  items: Omit<ProformaInvoiceItem, 'id' | 'proforma_invoice_id'>[];
}

export interface ProformaInvoiceUpdate {
  status?: ProformaInvoice['status'];
  currency?: string;
  reference_number?: string | null;
  notes?: string | null;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  updated_by?: string | null;
  items?: Omit<ProformaInvoiceItem, 'id' | 'proforma_invoice_id'>[];
}

export class ProformaInvoiceService {
  static async getProformaInvoices(
    orgId: string,
    limit = 50,
    offset = 0,
    filters?: { status?: string; customer_id?: string; sales_order_id?: string }
  ): Promise<{ data: ProformaInvoice[]; count: number }> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters?.status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.customer_id) {
        conditions.push(`customer_id = $${paramIndex}`);
        params.push(filters.customer_id);
        paramIndex++;
      }

      if (filters?.sales_order_id) {
        conditions.push(`sales_order_id = $${paramIndex}`);
        params.push(filters.sales_order_id);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM proforma_invoices ${whereClause}`,
        params
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get proforma invoices
      params.push(limit, offset);
      const result = await query<ProformaInvoice>(
        `SELECT * FROM proforma_invoices
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      return { data: result.rows, count };
    } catch (error) {
      console.error('Error fetching proforma invoices:', error);
      throw error;
    }
  }

  static async getProformaInvoiceById(id: string, orgId: string): Promise<ProformaInvoice | null> {
    try {
      const result = await query<ProformaInvoice>(
        'SELECT * FROM proforma_invoices WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching proforma invoice:', error);
      throw error;
    }
  }

  static async getProformaInvoiceItems(proformaInvoiceId: string): Promise<ProformaInvoiceItem[]> {
    try {
      const result = await query<ProformaInvoiceItem>(
        'SELECT * FROM proforma_invoice_items WHERE proforma_invoice_id = $1 ORDER BY line_number, id',
        [proformaInvoiceId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching proforma invoice items:', error);
      throw error;
    }
  }

  static async createProformaInvoice(data: ProformaInvoiceInsert): Promise<ProformaInvoice> {
    try {
      // Generate document number if not provided
      let documentNumber = data.document_number;
      if (!documentNumber) {
        documentNumber = await DocumentNumberingService.generateDocumentNumber(data.org_id, 'PFI');
      }

      // Insert proforma invoice
      const proformaResult = await query<ProformaInvoice>(
        `INSERT INTO proforma_invoices (
          org_id, customer_id, sales_order_id, document_number, status, currency,
          reference_number, notes, billing_address, shipping_address, metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          data.org_id,
          data.customer_id,
          data.sales_order_id || null,
          documentNumber,
          data.status || 'draft',
          data.currency || 'ZAR',
          data.reference_number || null,
          data.notes || null,
          data.billing_address ? JSON.stringify(data.billing_address) : '{}',
          data.shipping_address ? JSON.stringify(data.shipping_address) : '{}',
          data.metadata ? JSON.stringify(data.metadata) : '{}',
          data.created_by || null,
        ]
      );

      const proformaInvoice = proformaResult.rows[0];

      // Insert items
      if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          await query(
            `INSERT INTO proforma_invoice_items (
              proforma_invoice_id, product_id, supplier_product_id, sku, name, description,
              quantity, unit_price, tax_rate, tax_amount, subtotal, total, line_number, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              proformaInvoice.id,
              item.product_id || null,
              item.supplier_product_id || null,
              item.sku || null,
              item.name,
              item.description || null,
              item.quantity,
              item.unit_price,
              item.tax_rate || 0,
              item.tax_amount || 0,
              item.subtotal,
              item.total,
              item.line_number || i + 1,
              item.metadata ? JSON.stringify(item.metadata) : '{}',
            ]
          );
        }
      }

      // Totals are calculated by trigger, fetch updated proforma invoice
      const updatedResult = await query<ProformaInvoice>(
        'SELECT * FROM proforma_invoices WHERE id = $1',
        [proformaInvoice.id]
      );

      return updatedResult.rows[0];
    } catch (error) {
      console.error('Error creating proforma invoice:', error);
      throw error;
    }
  }

  static async updateProformaInvoice(
    id: string,
    orgId: string,
    updates: ProformaInvoiceUpdate
  ): Promise<ProformaInvoice> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex}`);
        values.push(updates.status);
        paramIndex++;
      }

      if (updates.currency !== undefined) {
        setClauses.push(`currency = $${paramIndex}`);
        values.push(updates.currency);
        paramIndex++;
      }

      if (updates.reference_number !== undefined) {
        setClauses.push(`reference_number = $${paramIndex}`);
        values.push(updates.reference_number);
        paramIndex++;
      }

      if (updates.notes !== undefined) {
        setClauses.push(`notes = $${paramIndex}`);
        values.push(updates.notes);
        paramIndex++;
      }

      if (updates.billing_address !== undefined) {
        setClauses.push(`billing_address = $${paramIndex}`);
        values.push(JSON.stringify(updates.billing_address));
        paramIndex++;
      }

      if (updates.shipping_address !== undefined) {
        setClauses.push(`shipping_address = $${paramIndex}`);
        values.push(JSON.stringify(updates.shipping_address));
        paramIndex++;
      }

      if (updates.metadata !== undefined) {
        setClauses.push(`metadata = $${paramIndex}`);
        values.push(JSON.stringify(updates.metadata));
        paramIndex++;
      }

      if (updates.updated_by !== undefined) {
        setClauses.push(`updated_by = $${paramIndex}`);
        values.push(updates.updated_by);
        paramIndex++;
      }

      if (setClauses.length === 0 && !updates.items) {
        return (await this.getProformaInvoiceById(id, orgId))!;
      }

      if (setClauses.length > 0) {
        values.push(id, orgId);
        await query(
          `UPDATE proforma_invoices
           SET ${setClauses.join(', ')}
           WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}`,
          values
        );
      }

      // Update items if provided
      if (updates.items !== undefined) {
        // Delete existing items
        await query('DELETE FROM proforma_invoice_items WHERE proforma_invoice_id = $1', [id]);

        // Insert new items
        for (let i = 0; i < updates.items.length; i++) {
          const item = updates.items[i];
          await query(
            `INSERT INTO proforma_invoice_items (
              proforma_invoice_id, product_id, supplier_product_id, sku, name, description,
              quantity, unit_price, tax_rate, tax_amount, subtotal, total, line_number, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              id,
              item.product_id || null,
              item.supplier_product_id || null,
              item.sku || null,
              item.name,
              item.description || null,
              item.quantity,
              item.unit_price,
              item.tax_rate || 0,
              item.tax_amount || 0,
              item.subtotal,
              item.total,
              item.line_number || i + 1,
              item.metadata ? JSON.stringify(item.metadata) : '{}',
            ]
          );
        }
      }

      // Fetch updated proforma invoice
      const updatedResult = await query<ProformaInvoice>(
        'SELECT * FROM proforma_invoices WHERE id = $1',
        [id]
      );

      return updatedResult.rows[0];
    } catch (error) {
      console.error('Error updating proforma invoice:', error);
      throw error;
    }
  }

  static async deleteProformaInvoice(id: string, orgId: string): Promise<void> {
    try {
      const result = await query(
        'DELETE FROM proforma_invoices WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );

      if (result.rowCount === 0) {
        throw new Error('Proforma invoice not found or access denied');
      }
    } catch (error) {
      console.error('Error deleting proforma invoice:', error);
      throw error;
    }
  }
}

