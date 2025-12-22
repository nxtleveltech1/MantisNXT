/**
 * Tax Management Service
 * Handles tax calculations, tax returns, and compliance
 */

import { query } from '@/lib/database';

export interface TaxTransaction {
  id: string;
  org_id: string;
  transaction_date: string;
  transaction_type: 'sale' | 'purchase' | 'adjustment' | 'payment' | 'refund';
  source_type?: string | null;
  source_id?: string | null;
  tax_rate_id: string;
  taxable_amount: number;
  tax_amount: number;
  is_input_tax: boolean;
  is_output_tax: boolean;
  period: string;
  fiscal_year: number;
  created_at: string;
}

export interface TaxReturn {
  id: string;
  org_id: string;
  return_period: string;
  fiscal_year: number;
  return_type: 'vat' | 'income_tax' | 'paye' | 'other';
  filing_date?: string | null;
  due_date: string;
  total_tax_due: number;
  total_tax_paid: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  submitted_at?: string | null;
  submitted_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export class TaxService {
  /**
   * Calculate tax
   */
  static async calculateTax(
    orgId: string,
    taxableAmount: number,
    taxRateId: string
  ): Promise<number> {
    try {
      const taxRateResult = await query<{ rate: number; is_compound: boolean }>(
        'SELECT rate, is_compound FROM tax_rate WHERE id = $1 AND org_id = $2 AND is_active = true',
        [taxRateId, orgId]
      );

      const taxRate = taxRateResult.rows[0];
      if (!taxRate) {
        throw new Error('Tax rate not found');
      }

      return taxableAmount * parseFloat(taxRate.rate.toString());
    } catch (error) {
      console.error('Error calculating tax:', error);
      throw error;
    }
  }

  /**
   * Record tax transaction
   */
  static async recordTaxTransaction(data: {
    org_id: string;
    transaction_date: string;
    transaction_type: TaxTransaction['transaction_type'];
    source_type?: string;
    source_id?: string;
    tax_rate_id: string;
    taxable_amount: number;
    tax_amount: number;
    is_input_tax: boolean;
    is_output_tax: boolean;
  }): Promise<TaxTransaction> {
    try {
      const date = new Date(data.transaction_date);
      const period = date.toISOString().substring(0, 7);
      const fiscalYear = date.getFullYear();

      const result = await query<TaxTransaction>(
        `INSERT INTO tax_transactions (
          org_id, transaction_date, transaction_type, source_type, source_id,
          tax_rate_id, taxable_amount, tax_amount,
          is_input_tax, is_output_tax, period, fiscal_year
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          data.org_id,
          data.transaction_date,
          data.transaction_type,
          data.source_type || null,
          data.source_id || null,
          data.tax_rate_id,
          data.taxable_amount,
          data.tax_amount,
          data.is_input_tax,
          data.is_output_tax,
          period,
          fiscalYear,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error recording tax transaction:', error);
      throw error;
    }
  }

  /**
   * Prepare tax return
   */
  static async prepareTaxReturn(data: {
    org_id: string;
    return_period: string;
    fiscal_year: number;
    return_type: TaxReturn['return_type'];
    due_date: string;
  }): Promise<TaxReturn> {
    try {
      // Calculate tax due from transactions
      const transactionsResult = await query<{
        input_tax: string;
        output_tax: string;
      }>(
        `SELECT
          COALESCE(SUM(CASE WHEN is_input_tax = true THEN tax_amount ELSE 0 END), 0) as input_tax,
          COALESCE(SUM(CASE WHEN is_output_tax = true THEN tax_amount ELSE 0 END), 0) as output_tax
        FROM tax_transactions
        WHERE org_id = $1 AND period = $2 AND fiscal_year = $3`,
        [data.org_id, data.return_period, data.fiscal_year]
      );

      const inputTax = parseFloat(transactionsResult.rows[0]?.input_tax || '0');
      const outputTax = parseFloat(transactionsResult.rows[0]?.output_tax || '0');
      const taxDue = outputTax - inputTax;

      const result = await query<TaxReturn>(
        `INSERT INTO tax_returns (
          org_id, return_period, fiscal_year, return_type,
          due_date, total_tax_due
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          data.org_id,
          data.return_period,
          data.fiscal_year,
          data.return_type,
          data.due_date,
          taxDue,
        ]
      );

      // Create return lines
      await query(
        `INSERT INTO tax_return_lines (
          tax_return_id, line_number, description, amount, tax_code
        ) VALUES
          ($1, 1, 'Output Tax', $2, 'OUTPUT'),
          ($1, 2, 'Input Tax', $3, 'INPUT'),
          ($1, 3, 'Net Tax Due', $4, 'NET')`,
        [result.rows[0].id, outputTax, inputTax, taxDue]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error preparing tax return:', error);
      throw error;
    }
  }

  /**
   * Get tax returns
   */
  static async getTaxReturns(
    orgId: string,
    returnType?: string,
    fiscalYear?: number
  ): Promise<TaxReturn[]> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (returnType) {
        conditions.push(`return_type = $${paramIndex}`);
        params.push(returnType);
        paramIndex++;
      }

      if (fiscalYear) {
        conditions.push(`fiscal_year = $${paramIndex}`);
        params.push(fiscalYear);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<TaxReturn>(
        `SELECT * FROM tax_returns ${whereClause} ORDER BY return_period DESC`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching tax returns:', error);
      throw error;
    }
  }

  /**
   * Validate compliance
   */
  static async validateCompliance(
    orgId: string,
    period: string
  ): Promise<Array<{ status: string; description: string }>> {
    try {
      const issues: Array<{ status: string; description: string }> = [];

      // Check for missing tax return
      const returnResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM tax_returns
         WHERE org_id = $1 AND return_period = $2`,
        [orgId, period]
      );

      if (parseInt(returnResult.rows[0]?.count || '0', 10) === 0) {
        issues.push({
          status: 'warning',
          description: `No tax return filed for period ${period}`,
        });
      }

      // Check for overdue returns
      const overdueResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM tax_returns
         WHERE org_id = $1 AND due_date < CURRENT_DATE AND status != 'paid'`,
        [orgId]
      );

      if (parseInt(overdueResult.rows[0]?.count || '0', 10) > 0) {
        issues.push({
          status: 'error',
          description: 'Overdue tax returns exist',
        });
      }

      return issues;
    } catch (error) {
      console.error('Error validating compliance:', error);
      throw error;
    }
  }

  /**
   * Generate tax report
   */
  static async generateTaxReport(
    orgId: string,
    period: string,
    fiscalYear: number
  ): Promise<{
    period: string;
    input_tax: number;
    output_tax: number;
    net_tax_due: number;
    transactions_count: number;
  }> {
    try {
      const result = await query<{
        input_tax: string;
        output_tax: string;
        count: string;
      }>(
        `SELECT
          COALESCE(SUM(CASE WHEN is_input_tax = true THEN tax_amount ELSE 0 END), 0) as input_tax,
          COALESCE(SUM(CASE WHEN is_output_tax = true THEN tax_amount ELSE 0 END), 0) as output_tax,
          COUNT(*) as count
        FROM tax_transactions
        WHERE org_id = $1 AND period = $2 AND fiscal_year = $3`,
        [orgId, period, fiscalYear]
      );

      const row = result.rows[0];
      const inputTax = parseFloat(row?.input_tax || '0');
      const outputTax = parseFloat(row?.output_tax || '0');

      return {
        period,
        input_tax: inputTax,
        output_tax: outputTax,
        net_tax_due: outputTax - inputTax,
        transactions_count: parseInt(row?.count || '0', 10),
      };
    } catch (error) {
      console.error('Error generating tax report:', error);
      throw error;
    }
  }
}

