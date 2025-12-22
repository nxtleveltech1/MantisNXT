/**
 * Fixed Assets Service
 * Handles asset register, depreciation, disposals, and maintenance
 */

import { query } from '@/lib/database';

export interface Asset {
  id: string;
  org_id: string;
  asset_number: string;
  asset_name: string;
  asset_category_id?: string | null;
  description?: string | null;
  purchase_date: string;
  purchase_cost: number;
  current_value?: number | null;
  depreciation_method?: 'straight_line' | 'declining_balance' | 'units_of_production' | 'sum_of_years' | null;
  useful_life_years?: number | null;
  salvage_value: number;
  location?: string | null;
  custodian_id?: string | null;
  status: 'active' | 'disposed' | 'under_maintenance' | 'retired';
  disposed_date?: string | null;
  disposed_amount?: number | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepreciationSchedule {
  id: string;
  asset_id: string;
  period: string;
  fiscal_year: number;
  opening_book_value: number;
  depreciation_amount: number;
  accumulated_depreciation: number;
  closing_book_value: number;
  journal_entry_id?: string | null;
  posted_at?: string | null;
  created_at: string;
}

export class FAService {
  /**
   * Register asset
   */
  static async registerAsset(data: {
    org_id: string;
    asset_number?: string;
    asset_name: string;
    asset_category_id?: string;
    description?: string;
    purchase_date: string;
    purchase_cost: number;
    depreciation_method?: Asset['depreciation_method'];
    useful_life_years?: number;
    salvage_value?: number;
    location?: string;
    custodian_id?: string;
    created_by?: string;
  }): Promise<Asset> {
    try {
      // Generate asset number if not provided
      let assetNumber = data.asset_number;
      if (!assetNumber) {
        const result = await query<{ asset_number: string }>(
          `SELECT COALESCE(MAX(CAST(substring(asset_number FROM '\d+$') AS integer)), 0) + 1 as asset_number
           FROM fa_asset_register WHERE org_id = $1`,
          [data.org_id]
        );
        const nextNum = parseInt(result.rows[0]?.asset_number || '1', 10);
        assetNumber = `AST-${new Date().getFullYear()}-${nextNum.toString().padStart(6, '0')}`;
      }

      const result = await query<Asset>(
        `INSERT INTO fa_asset_register (
          org_id, asset_number, asset_name, asset_category_id, description,
          purchase_date, purchase_cost, current_value, depreciation_method,
          useful_life_years, salvage_value, location, custodian_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          data.org_id,
          assetNumber,
          data.asset_name,
          data.asset_category_id || null,
          data.description || null,
          data.purchase_date,
          data.purchase_cost,
          data.purchase_cost,
          data.depreciation_method || null,
          data.useful_life_years || null,
          data.salvage_value || 0,
          data.location || null,
          data.custodian_id || null,
          data.created_by || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error registering asset:', error);
      throw error;
    }
  }

  /**
   * Calculate depreciation
   */
  static async calculateDepreciation(
    assetId: string,
    period: string,
    fiscalYear: number
  ): Promise<DepreciationSchedule> {
    try {
      const asset = await query<Asset>(
        'SELECT * FROM fa_asset_register WHERE id = $1',
        [assetId]
      );

      if (!asset.rows[0]) {
        throw new Error('Asset not found');
      }

      const a = asset.rows[0];

      if (!a.depreciation_method || !a.useful_life_years) {
        throw new Error('Asset missing depreciation configuration');
      }

      // Get previous period's closing balance
      const prevSchedule = await query<DepreciationSchedule>(
        `SELECT * FROM fa_depreciation_schedules
         WHERE asset_id = $1 AND period < $2
         ORDER BY period DESC LIMIT 1`,
        [assetId, period]
      );

      const openingBookValue =
        prevSchedule.rows[0]?.closing_book_value || a.purchase_cost;
      const accumulatedDepreciation =
        prevSchedule.rows[0]?.accumulated_depreciation || 0;

      let depreciationAmount = 0;

      // Calculate depreciation based on method
      if (a.depreciation_method === 'straight_line') {
        const annualDepreciation =
          (a.purchase_cost - a.salvage_value) / a.useful_life_years;
        depreciationAmount = annualDepreciation / 12; // Monthly
      } else if (a.depreciation_method === 'declining_balance') {
        const rate = 2 / a.useful_life_years; // Double declining balance
        depreciationAmount = openingBookValue * (rate / 12);
      }

      const newAccumulated = accumulatedDepreciation + depreciationAmount;
      const closingBookValue = a.purchase_cost - newAccumulated;

      // Insert or update schedule
      const result = await query<DepreciationSchedule>(
        `INSERT INTO fa_depreciation_schedules (
          asset_id, period, fiscal_year, opening_book_value,
          depreciation_amount, accumulated_depreciation, closing_book_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (asset_id, period, fiscal_year)
        DO UPDATE SET
          opening_book_value = $4,
          depreciation_amount = $5,
          accumulated_depreciation = $6,
          closing_book_value = $7
        RETURNING *`,
        [
          assetId,
          period,
          fiscalYear,
          openingBookValue,
          depreciationAmount,
          newAccumulated,
          closingBookValue,
        ]
      );

      // Update asset current value
      await query(
        `UPDATE fa_asset_register
         SET current_value = $1, updated_at = now()
         WHERE id = $2`,
        [closingBookValue, assetId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error calculating depreciation:', error);
      throw error;
    }
  }

  /**
   * Get depreciation schedules
   */
  static async getDepreciationSchedules(assetId: string): Promise<DepreciationSchedule[]> {
    try {
      const result = await query<DepreciationSchedule>(
        'SELECT * FROM fa_depreciation_schedules WHERE asset_id = $1 ORDER BY period',
        [assetId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching depreciation schedules:', error);
      throw error;
    }
  }

  /**
   * Dispose asset
   */
  static async disposeAsset(data: {
    asset_id: string;
    disposal_date: string;
    disposal_method: 'sale' | 'scrap' | 'donation' | 'trade_in';
    disposal_amount?: number;
    notes?: string;
    created_by?: string;
  }): Promise<{ id: string }> {
    try {
      const asset = await query<Asset>(
        'SELECT * FROM fa_asset_register WHERE id = $1',
        [data.asset_id]
      );

      if (!asset.rows[0]) {
        throw new Error('Asset not found');
      }

      const a = asset.rows[0];
      const currentValue = a.current_value || 0;
      const disposalAmount = data.disposal_amount || 0;
      const gainLoss = disposalAmount - currentValue;

      const result = await query<{ id: string }>(
        `INSERT INTO fa_asset_disposals (
          asset_id, disposal_date, disposal_method,
          disposal_amount, gain_loss_amount, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          data.asset_id,
          data.disposal_date,
          data.disposal_method,
          disposalAmount,
          gainLoss,
          data.notes || null,
          data.created_by || null,
        ]
      );

      // Update asset status
      await query(
        `UPDATE fa_asset_register
         SET status = 'disposed'::text,
             disposed_date = $1,
             disposed_amount = $2,
             updated_at = now()
         WHERE id = $3`,
        [data.disposal_date, disposalAmount, data.asset_id]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error disposing asset:', error);
      throw error;
    }
  }

  /**
   * Track maintenance
   */
  static async trackMaintenance(data: {
    asset_id: string;
    maintenance_date: string;
    maintenance_type: 'repair' | 'service' | 'inspection' | 'upgrade';
    description: string;
    cost?: number;
    vendor_id?: string;
    next_maintenance_date?: string;
    performed_by?: string;
  }): Promise<{ id: string }> {
    try {
      const result = await query<{ id: string }>(
        `INSERT INTO fa_asset_maintenance (
          asset_id, maintenance_date, maintenance_type, description,
          cost, vendor_id, next_maintenance_date, performed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          data.asset_id,
          data.maintenance_date,
          data.maintenance_type,
          data.description,
          data.cost || null,
          data.vendor_id || null,
          data.next_maintenance_date || null,
          data.performed_by || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error tracking maintenance:', error);
      throw error;
    }
  }

  /**
   * Get assets
   */
  static async getAssets(
    orgId: string,
    filters?: {
      status?: string;
      category_id?: string;
    }
  ): Promise<Asset[]> {
    try {
      const conditions: string[] = ['org_id = $1'];
      const params: unknown[] = [orgId];
      let paramIndex = 2;

      if (filters?.status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.category_id) {
        conditions.push(`asset_category_id = $${paramIndex}`);
        params.push(filters.category_id);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const result = await query<Asset>(
        `SELECT * FROM fa_asset_register ${whereClause} ORDER BY asset_number`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }
  }
}

