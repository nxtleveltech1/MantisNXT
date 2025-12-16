/**
 * Quotation Service
 *
 * Handles CRUD operations for quotations
 */

import { query } from '@/lib/database/unified-connection';
import { DocumentNumberingService } from './DocumentNumberingService';

export interface Quotation {
  id: string;
  org_id: string;
  customer_id: string;
  document_number: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  currency: string;
  subtotal: number;
  total_tax: number;
  total: number;
  valid_until?: string | null;
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

export interface QuotationItem {
  id: string;
  quotation_id: string;
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

export interface QuotationInsert {
  org_id: string;
  customer_id: string;
  document_number?: string;
  status?: Quotation['status'];
  currency?: string;
  valid_until?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  items: Omit<QuotationItem, 'id' | 'quotation_id'>[];
}

export interface QuotationUpdate {
  status?: Quotation['status'];
  currency?: string;
  valid_until?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  updated_by?: string | null;
  items?: Omit<QuotationItem, 'id' | 'quotation_id'>[];
}

export class QuotationService {
  static async getQuotations(
    orgId: string,
    limit = 50,
    offset = 0,
    filters?: { status?: string; customer_id?: string }
  ): Promise<{ data: Quotation[]; count: number }> {
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

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM quotations ${whereClause}`,
        params
      );
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get quotations
      params.push(limit, offset);
      const result = await query<Quotation>(
        `SELECT * FROM quotations
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      return { data: result.rows, count };
    } catch (error) {
      console.error('Error fetching quotations:', error);
      throw error;
    }
  }

  static async getQuotationById(id: string, orgId: string): Promise<Quotation | null> {
    try {
      const result = await query<Quotation>(
        'SELECT * FROM quotations WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching quotation:', error);
      throw error;
    }
  }

  static async getQuotationItems(quotationId: string): Promise<QuotationItem[]> {
    try {
      const result = await query<QuotationItem>(
        'SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY line_number, id',
        [quotationId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching quotation items:', error);
      throw error;
    }
  }

  static async createQuotation(data: QuotationInsert): Promise<Quotation> {
    try {
      console.log('Creating quotation with data:', {
        org_id: data.org_id,
        customer_id: data.customer_id,
        itemsCount: data.items?.length,
        currency: data.currency,
      });

      // Generate document number if not provided
      let documentNumber = data.document_number;
      if (!documentNumber) {
        console.log('Generating document number...');
        documentNumber = await DocumentNumberingService.generateDocumentNumber(data.org_id, 'QUO');
        console.log('Generated document number:', documentNumber);
      }

      // Prepare JSON fields safely
      const billingAddressJson = data.billing_address 
        ? (typeof data.billing_address === 'string' ? data.billing_address : JSON.stringify(data.billing_address))
        : '{}';
      const shippingAddressJson = data.shipping_address
        ? (typeof data.shipping_address === 'string' ? data.shipping_address : JSON.stringify(data.shipping_address))
        : '{}';
      const metadataJson = data.metadata
        ? (typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata))
        : '{}';

      console.log('Inserting quotation...');
      // Insert quotation
      const quotationResult = await query<Quotation>(
        `INSERT INTO quotations (
          org_id, customer_id, document_number, status, currency, valid_until,
          reference_number, notes, billing_address, shipping_address, metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          data.org_id,
          data.customer_id,
          documentNumber,
          data.status || 'draft',
          data.currency || 'ZAR',
          data.valid_until || null,
          data.reference_number || null,
          data.notes || null,
          billingAddressJson,
          shippingAddressJson,
          metadataJson,
          data.created_by || null,
        ]
      );

      const quotation = quotationResult.rows[0];
      if (!quotation) {
        throw new Error('Failed to create quotation - no ID returned');
      }

      console.log('Quotation created with ID:', quotation.id);

      // Insert items
      if (data.items && data.items.length > 0) {
        console.log(`Inserting ${data.items.length} items...`);
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          console.log(`Inserting item ${i + 1}:`, {
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
          });

          const itemMetadataJson = item.metadata
            ? (typeof item.metadata === 'string' ? item.metadata : JSON.stringify(item.metadata))
            : '{}';

          await query(
            `INSERT INTO quotation_items (
              quotation_id, product_id, supplier_product_id, sku, name, description,
              quantity, unit_price, tax_rate, tax_amount, subtotal, total, line_number, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              quotation.id,
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
              itemMetadataJson,
            ]
          );
        }
        console.log('All items inserted successfully');
      }

      // Totals are calculated by trigger, fetch updated quotation
      console.log('Fetching updated quotation...');
      const updatedResult = await query<Quotation>(
        'SELECT * FROM quotations WHERE id = $1',
        [quotation.id]
      );

      if (!updatedResult.rows[0]) {
        throw new Error('Failed to fetch created quotation');
      }

      console.log('Quotation created successfully:', updatedResult.rows[0].id);
      return updatedResult.rows[0];
    } catch (error) {
      console.error('Error creating quotation:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  static async updateQuotation(
    id: string,
    orgId: string,
    updates: QuotationUpdate
  ): Promise<Quotation> {
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

      if (updates.valid_until !== undefined) {
        setClauses.push(`valid_until = $${paramIndex}`);
        values.push(updates.valid_until);
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

      if (setClauses.length === 0) {
        // No updates, just return current quotation
        return (await this.getQuotationById(id, orgId))!;
      }

      values.push(id, orgId);
      const result = await query<Quotation>(
        `UPDATE quotations
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Quotation not found or access denied');
      }

      // Update items if provided
      if (updates.items !== undefined) {
        // Delete existing items
        await query('DELETE FROM quotation_items WHERE quotation_id = $1', [id]);

        // Insert new items
        for (let i = 0; i < updates.items.length; i++) {
          const item = updates.items[i];
          await query(
            `INSERT INTO quotation_items (
              quotation_id, product_id, supplier_product_id, sku, name, description,
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

      // Fetch updated quotation
      const updatedResult = await query<Quotation>(
        'SELECT * FROM quotations WHERE id = $1',
        [id]
      );

      return updatedResult.rows[0];
    } catch (error) {
      console.error('Error updating quotation:', error);
      throw error;
    }
  }

  static async deleteQuotation(id: string, orgId: string): Promise<void> {
    try {
      const result = await query(
        'DELETE FROM quotations WHERE id = $1 AND org_id = $2',
        [id, orgId]
      );

      if (result.rowCount === 0) {
        throw new Error('Quotation not found or access denied');
      }
    } catch (error) {
      console.error('Error deleting quotation:', error);
      throw error;
    }
  }
}

