/**
 * Cost Accounting Service
 * Handles cost centers, allocations, project costing, and job costing
 */

import { query } from '@/lib/database';

export interface CostCenter {
  id: string;
  org_id: string;
  cost_center_code: string;
  cost_center_name: string;
  parent_cost_center_id?: string | null;
  manager_id?: string | null;
  is_active: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostAllocation {
  id: string;
  org_id: string;
  allocation_name: string;
  source_cost_center_id: string;
  allocation_method: 'direct' | 'percentage' | 'activity_based' | 'step_down';
  allocation_percent?: number | null;
  is_active: boolean;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCosting {
  id: string;
  org_id: string;
  project_code: string;
  project_name: string;
  start_date?: string | null;
  end_date?: string | null;
  budget_amount?: number | null;
  actual_cost: number;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  manager_id?: string | null;
  cost_center_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobCosting {
  id: string;
  org_id: string;
  job_number: string;
  job_name: string;
  customer_id?: string | null;
  start_date?: string | null;
  completion_date?: string | null;
  estimated_cost?: number | null;
  actual_cost: number;
  billable_amount?: number | null;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  project_id?: string | null;
  cost_center_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export class CostService {
  /**
   * Create cost center
   */
  static async createCostCenter(data: {
    org_id: string;
    cost_center_code: string;
    cost_center_name: string;
    parent_cost_center_id?: string;
    manager_id?: string;
    description?: string;
  }): Promise<CostCenter> {
    try {
      const result = await query<CostCenter>(
        `INSERT INTO cost_centers (
          org_id, cost_center_code, cost_center_name,
          parent_cost_center_id, manager_id, description
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          data.org_id,
          data.cost_center_code,
          data.cost_center_name,
          data.parent_cost_center_id || null,
          data.manager_id || null,
          data.description || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating cost center:', error);
      throw error;
    }
  }

  /**
   * Get cost centers
   */
  static async getCostCenters(orgId: string, isActive?: boolean): Promise<CostCenter[]> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];

      if (isActive !== undefined) {
        conditions.push('is_active = $2');
        params.push(isActive);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<CostCenter>(
        `SELECT * FROM cost_centers ${whereClause} ORDER BY cost_center_code`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching cost centers:', error);
      throw error;
    }
  }

  /**
   * Create cost allocation
   */
  static async createCostAllocation(data: {
    org_id: string;
    allocation_name: string;
    source_cost_center_id: string;
    allocation_method: CostAllocation['allocation_method'];
    allocation_percent?: number;
    target_cost_centers: Array<{ cost_center_id: string; allocation_percent: number }>;
    description?: string;
    created_by?: string;
  }): Promise<CostAllocation> {
    try {
      const result = await query<CostAllocation>(
        `INSERT INTO cost_allocations (
          org_id, allocation_name, source_cost_center_id,
          allocation_method, allocation_percent, description, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          data.org_id,
          data.allocation_name,
          data.source_cost_center_id,
          data.allocation_method,
          data.allocation_percent || null,
          data.description || null,
          data.created_by || null,
        ]
      );

      // Create allocation rules
      for (const target of data.target_cost_centers) {
        await query(
          `INSERT INTO cost_allocation_rules (
            cost_allocation_id, target_cost_center_id, allocation_percent
          ) VALUES ($1, $2, $3)`,
          [result.rows[0].id, target.cost_center_id, target.allocation_percent]
        );
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error creating cost allocation:', error);
      throw error;
    }
  }

  /**
   * Allocate costs
   */
  static async allocateCosts(
    orgId: string,
    period: string,
    fiscalYear: number,
    createdBy?: string
  ): Promise<{ id: string }> {
    try {
      // Create allocation run
      const runResult = await query<{ id: string }>(
        `INSERT INTO cost_allocation_runs (
          org_id, run_date, period, fiscal_year, status, created_by
        ) VALUES ($1, CURRENT_DATE, $2, $3, 'running', $4)
        RETURNING id`,
        [orgId, period, fiscalYear, createdBy || null]
      );

      const runId = runResult.rows[0].id;

      // Get active allocations
      const allocations = await query<{
        id: string;
        source_cost_center_id: string;
        allocation_method: string;
      }>(
        'SELECT id, source_cost_center_id, allocation_method FROM cost_allocations WHERE org_id = $1 AND is_active = true',
        [orgId]
      );

      // Process each allocation (simplified - in production, implement full allocation logic)
      for (const allocation of allocations.rows) {
        // Get allocation rules
        const rules = await query<{
          target_cost_center_id: string;
          allocation_percent: number;
        }>(
          'SELECT target_cost_center_id, allocation_percent FROM cost_allocation_rules WHERE cost_allocation_id = $1',
          [allocation.id]
        );

        // Calculate allocation amounts (simplified)
        for (const rule of rules.rows) {
          await query(
            `INSERT INTO cost_allocation_run_details (
              allocation_run_id, cost_allocation_id,
              source_cost_center_id, target_cost_center_id, allocated_amount
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              runId,
              allocation.id,
              allocation.source_cost_center_id,
              rule.target_cost_center_id,
              0, // Would calculate actual amount based on source costs
            ]
          );
        }
      }

      // Update run status
      await query(
        `UPDATE cost_allocation_runs
         SET status = 'completed',
             completed_at = now()
         WHERE id = $1`,
        [runId]
      );

      return { id: runId };
    } catch (error) {
      console.error('Error allocating costs:', error);
      throw error;
    }
  }

  /**
   * Track project costs
   */
  static async trackProjectCosts(data: {
    org_id: string;
    project_code: string;
    project_name: string;
    start_date?: string;
    end_date?: string;
    budget_amount?: number;
    manager_id?: string;
    cost_center_id?: string;
    notes?: string;
  }): Promise<ProjectCosting> {
    try {
      const result = await query<ProjectCosting>(
        `INSERT INTO project_costing (
          org_id, project_code, project_name, start_date,
          end_date, budget_amount, manager_id, cost_center_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          data.org_id,
          data.project_code,
          data.project_name,
          data.start_date || null,
          data.end_date || null,
          data.budget_amount || null,
          data.manager_id || null,
          data.cost_center_id || null,
          data.notes || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error tracking project costs:', error);
      throw error;
    }
  }

  /**
   * Record project cost transaction
   */
  static async recordProjectCostTransaction(data: {
    project_id: string;
    transaction_date?: string;
    transaction_type: 'labor' | 'material' | 'overhead' | 'other';
    description: string;
    amount: number;
    account_id?: string;
    created_by?: string;
  }): Promise<{ id: string }> {
    try {
      const result = await query<{ id: string }>(
        `INSERT INTO project_cost_transactions (
          project_id, transaction_date, transaction_type,
          description, amount, account_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          data.project_id,
          data.transaction_date || new Date().toISOString().split('T')[0],
          data.transaction_type,
          data.description,
          data.amount,
          data.account_id || null,
          data.created_by || null,
        ]
      );

      // Update project actual cost
      await query(
        `UPDATE project_costing
         SET actual_cost = actual_cost + $1,
             updated_at = now()
         WHERE id = $2`,
        [data.amount, data.project_id]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error recording project cost transaction:', error);
      throw error;
    }
  }

  /**
   * Track job costs
   */
  static async trackJobCosts(data: {
    org_id: string;
    job_number: string;
    job_name: string;
    customer_id?: string;
    start_date?: string;
    completion_date?: string;
    estimated_cost?: number;
    billable_amount?: number;
    project_id?: string;
    cost_center_id?: string;
    notes?: string;
  }): Promise<JobCosting> {
    try {
      const result = await query<JobCosting>(
        `INSERT INTO job_costing (
          org_id, job_number, job_name, customer_id,
          start_date, completion_date, estimated_cost,
          billable_amount, project_id, cost_center_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          data.org_id,
          data.job_number,
          data.job_name,
          data.customer_id || null,
          data.start_date || null,
          data.completion_date || null,
          data.estimated_cost || null,
          data.billable_amount || null,
          data.project_id || null,
          data.cost_center_id || null,
          data.notes || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error tracking job costs:', error);
      throw error;
    }
  }

  /**
   * Record job cost transaction
   */
  static async recordJobCostTransaction(data: {
    job_id: string;
    transaction_date?: string;
    transaction_type: 'labor' | 'material' | 'overhead' | 'expense' | 'revenue';
    description: string;
    amount: number;
    account_id?: string;
    created_by?: string;
  }): Promise<{ id: string }> {
    try {
      const result = await query<{ id: string }>(
        `INSERT INTO job_cost_transactions (
          job_id, transaction_date, transaction_type,
          description, amount, account_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          data.job_id,
          data.transaction_date || new Date().toISOString().split('T')[0],
          data.transaction_type,
          data.description,
          data.amount,
          data.account_id || null,
          data.created_by || null,
        ]
      );

      // Update job actual cost
      const adjustment = data.transaction_type === 'revenue' ? -data.amount : data.amount;
      await query(
        `UPDATE job_costing
         SET actual_cost = actual_cost + $1,
             updated_at = now()
         WHERE id = $2`,
        [adjustment, data.job_id]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error recording job cost transaction:', error);
      throw error;
    }
  }

  /**
   * Analyze costs
   */
  static async analyzeCosts(
    orgId: string,
    costCenterId?: string,
    projectId?: string,
    jobId?: string
  ): Promise<{
    total_cost: number;
    by_type: Record<string, number>;
    by_period: Array<{ period: string; cost: number }>;
  }> {
    try {
      // This would aggregate costs from various sources
      // Simplified implementation
      return {
        total_cost: 0,
        by_type: {},
        by_period: [],
      };
    } catch (error) {
      console.error('Error analyzing costs:', error);
      throw error;
    }
  }
}

