/**
 * Budgeting Service
 * Handles budget creation, variance analysis, and forecasting
 */

import { query } from '@/lib/database';
import { GLService } from './GLService';

export interface BudgetVersion {
  id: string;
  org_id: string;
  version_name: string;
  fiscal_year: number;
  status: 'draft' | 'active' | 'archived';
  is_default: boolean;
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetLine {
  id: string;
  budget_version_id: string;
  account_id: string;
  period: string;
  budget_amount: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetVariance {
  account_id: string;
  account_code: string;
  account_name: string;
  period: string;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percent: number;
}

export class BudgetService {
  /**
   * Create budget version
   */
  static async createBudget(data: {
    org_id: string;
    version_name: string;
    fiscal_year: number;
    notes?: string;
    created_by: string;
  }): Promise<BudgetVersion> {
    try {
      // If this is set as default, unset other defaults
      if (data.version_name.toLowerCase().includes('default')) {
        await query(
          `UPDATE budget_versions SET is_default = false WHERE org_id = $1`,
          [data.org_id]
        );
      }

      const result = await query<BudgetVersion>(
        `INSERT INTO budget_versions (
          org_id, version_name, fiscal_year, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          data.org_id,
          data.version_name,
          data.fiscal_year,
          data.notes || null,
          data.created_by,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating budget:', error);
      throw error;
    }
  }

  /**
   * Update budget lines
   */
  static async updateBudget(
    budgetVersionId: string,
    lines: Array<{
      account_id: string;
      period: string;
      budget_amount: number;
      notes?: string;
    }>
  ): Promise<void> {
    try {
      for (const line of lines) {
        await query(
          `INSERT INTO budget_lines (
            budget_version_id, account_id, period, budget_amount, notes
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (budget_version_id, account_id, period)
          DO UPDATE SET
            budget_amount = $4,
            notes = $5,
            updated_at = now()`,
          [
            budgetVersionId,
            line.account_id,
            line.period,
            line.budget_amount,
            line.notes || null,
          ]
        );
      }
    } catch (error) {
      console.error('Error updating budget:', error);
      throw error;
    }
  }

  /**
   * Get budget versions
   */
  static async getBudgetVersions(
    orgId: string,
    fiscalYear?: number
  ): Promise<BudgetVersion[]> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];

      if (fiscalYear) {
        conditions.push('fiscal_year = $2');
        params.push(fiscalYear);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<BudgetVersion>(
        `SELECT * FROM budget_versions ${whereClause} ORDER BY fiscal_year DESC, version_name`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching budget versions:', error);
      throw error;
    }
  }

  /**
   * Get budget lines
   */
  static async getBudgetLines(budgetVersionId: string): Promise<BudgetLine[]> {
    try {
      const result = await query<BudgetLine>(
        'SELECT * FROM budget_lines WHERE budget_version_id = $1 ORDER BY period, account_id',
        [budgetVersionId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching budget lines:', error);
      throw error;
    }
  }

  /**
   * Compare budget vs actual
   */
  static async compareBudgetActual(
    budgetVersionId: string,
    orgId: string,
    period?: string
  ): Promise<BudgetVariance[]> {
    try {
      const budgetVersion = await query<{ fiscal_year: number }>(
        'SELECT fiscal_year FROM budget_versions WHERE id = $1',
        [budgetVersionId]
      );

      if (!budgetVersion.rows[0]) {
        throw new Error('Budget version not found');
      }

      const fiscalYear = budgetVersion.rows[0].fiscal_year;
      const p = period || new Date().toISOString().substring(0, 7);

      // Get budget vs actual from materialized view
      const result = await query<{
        account_id: string;
        account_code: string;
        account_name: string;
        period: string;
        budget_amount: string;
        actual_amount: string;
        variance_amount: string;
      }>(
        `SELECT
          ba.account_id,
          a.code as account_code,
          a.name as account_name,
          ba.period,
          ba.budget_amount,
          ba.actual_amount,
          ba.variance_amount
        FROM budget_actuals ba
        JOIN account a ON a.id = ba.account_id
        WHERE ba.budget_version_id = $1
          AND ba.org_id = $2
          AND ($3::text IS NULL OR ba.period = $3)
        ORDER BY ba.period, a.code`,
        [budgetVersionId, orgId, period || null]
      );

      return result.rows.map(row => {
        const budget = parseFloat(row.budget_amount);
        const actual = parseFloat(row.actual_amount);
        const variance = parseFloat(row.variance_amount);
        const variancePercent = budget !== 0 ? (variance / budget) * 100 : 0;

        return {
          account_id: row.account_id,
          account_code: row.account_code,
          account_name: row.account_name,
          period: row.period,
          budget_amount: budget,
          actual_amount: actual,
          variance_amount: variance,
          variance_percent: variancePercent,
        };
      });
    } catch (error) {
      console.error('Error comparing budget vs actual:', error);
      throw error;
    }
  }

  /**
   * Analyze variance
   */
  static async analyzeVariance(
    budgetVersionId: string,
    orgId: string,
    thresholdPercent = 10
  ): Promise<{
    significant_variances: BudgetVariance[];
    favorable: number;
    unfavorable: number;
  }> {
    try {
      const variances = await this.compareBudgetActual(budgetVersionId, orgId);

      const significant = variances.filter(
        v => Math.abs(v.variance_percent) >= thresholdPercent
      );

      const favorable = variances.filter(v => v.variance_amount < 0).length;
      const unfavorable = variances.filter(v => v.variance_amount > 0).length;

      return {
        significant_variances: significant,
        favorable,
        unfavorable,
      };
    } catch (error) {
      console.error('Error analyzing variance:', error);
      throw error;
    }
  }

  /**
   * Create forecast
   */
  static async createForecast(data: {
    org_id: string;
    budget_version_id: string;
    forecast_date: string;
    account_id: string;
    forecast_amount: number;
    assumptions?: string;
    created_by?: string;
  }): Promise<{ id: string }> {
    try {
      const result = await query<{ id: string }>(
        `INSERT INTO budget_forecasts (
          org_id, budget_version_id, forecast_date,
          account_id, forecast_amount, assumptions, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          data.org_id,
          data.budget_version_id,
          data.forecast_date,
          data.account_id,
          data.forecast_amount,
          data.assumptions || null,
          data.created_by || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating forecast:', error);
      throw error;
    }
  }
}

