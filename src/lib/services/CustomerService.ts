// @ts-nocheck

/**
 * Customer Service
 *
 * Handles customer data operations including CRUD, search, and segmentation
 *
 * Author: Full-Stack Developer Agent
 * Date: 2025-11-02
 */

import { query } from '@/lib/database';

export interface Customer {
  id: string;
  org_id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  segment?: 'individual' | 'business' | 'enterprise' | 'vip';
  status?: 'prospect' | 'active' | 'inactive' | 'churned';
  lifetime_value?: number;
  total_orders?: number;
  total_spent?: number;
  first_order_date?: Date;
  last_order_date?: Date;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
}

export interface CustomerInsert {
  org_id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  segment?: 'individual' | 'startup' | 'smb' | 'mid_market' | 'enterprise';
  status?: 'prospect' | 'active' | 'inactive' | 'churned' | 'suspended';
  lifetime_value?: number;
  acquisition_date?: string;
  last_interaction_date?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  } | null;
  notes?: string;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
}

export interface CustomerUpdate {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  segment?: 'individual' | 'business' | 'enterprise' | 'vip';
  status?: 'prospect' | 'active' | 'inactive' | 'churned';
  lifetime_value?: number;
  total_orders?: number;
  total_spent?: number;
  first_order_date?: Date;
  last_order_date?: Date;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export class CustomerService {
  static async getCustomers(limit = 50, offset = 0, orgId?: string): Promise<{ data: Customer[]; count: number }> {
    try {
      // Get total count
      const countResult = orgId 
        ? await query<{ count: string }>('SELECT COUNT(*) as count FROM customer WHERE org_id = $1', [orgId])
        : await query<{ count: string }>('SELECT COUNT(*) as count FROM customer');
      const count = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get customers
      const result = orgId
        ? await query<Customer>(
            `SELECT * FROM customer
             WHERE org_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [orgId, limit, offset]
          )
        : await query<Customer>(
            `SELECT * FROM customer
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
          );

      return { data: result.rows, count };
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  static async getCustomerById(id: string): Promise<Customer | null> {
    try {
      const result = await query<Customer>('SELECT * FROM customer WHERE id = $1', [id]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  static async createCustomer(customer: CustomerInsert): Promise<Customer> {
    try {
      if (!customer.org_id) {
        throw new Error('org_id is required to create a customer');
      }
      
      const result = await query<Customer>(
        `INSERT INTO customer (org_id, name, email, phone, company, segment, status, lifetime_value, acquisition_date, last_interaction_date, address, notes, tags, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          customer.org_id,
          customer.name,
          customer.email || null,
          customer.phone || null,
          customer.company || null,
          customer.segment || 'individual',
          customer.status || 'prospect',
          customer.lifetime_value || null,
          customer.acquisition_date || null,
          customer.last_interaction_date || null,
          customer.address ? JSON.stringify(customer.address) : null,
          customer.notes || null,
          customer.tags || null,
          customer.metadata ? JSON.stringify(customer.metadata) : null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  static async updateCustomer(id: string, updates: CustomerUpdate): Promise<Customer> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(
            key === 'metadata' && typeof value === 'object' ? JSON.stringify(value) : value
          );
          paramIndex++;
        }
      });

      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query<Customer>(
        `UPDATE customer
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  static async deleteCustomer(id: string): Promise<void> {
    try {
      await query('DELETE FROM customer WHERE id = $1', [id]);
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  static async searchCustomers(searchTerm: string, limit = 50, orgId?: string): Promise<Customer[]> {
    try {
      const result = orgId
        ? await query<Customer>(
            `SELECT * FROM customer
             WHERE org_id = $1
               AND (name ILIKE $2
                    OR email ILIKE $2
                    OR company ILIKE $2
                    OR phone ILIKE $2)
             ORDER BY created_at DESC
             LIMIT $3`,
            [orgId, `%${searchTerm}%`, limit]
          )
        : await query<Customer>(
            `SELECT * FROM customer
             WHERE name ILIKE $1
                OR email ILIKE $1
                OR company ILIKE $1
                OR phone ILIKE $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [`%${searchTerm}%`, limit]
          );

      return result.rows;
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  }

  static async getCustomersBySegment(segment: string, limit = 50): Promise<Customer[]> {
    try {
      const result = await query<Customer>(
        `SELECT * FROM customer
         WHERE segment = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [segment, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching customers by segment:', error);
      throw error;
    }
  }

  static async getCustomersByStatus(status: string, limit = 50): Promise<Customer[]> {
    try {
      const result = await query<Customer>(
        `SELECT * FROM customer
         WHERE status = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [status, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching customers by status:', error);
      throw error;
    }
  }

  static async getCustomerTickets(customerId: string): Promise<unknown[]> {
    try {
      const result = await query<unknown>(
        `SELECT *
         FROM customer_support_ticket
         WHERE customer_id = $1
         ORDER BY created_at DESC`,
        [customerId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching customer tickets:', error);
      throw error;
    }
  }
}
