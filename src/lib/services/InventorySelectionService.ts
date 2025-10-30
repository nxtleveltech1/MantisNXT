/**
 * InventorySelectionService - Manages inventory selection workflows (ISI)
 *
 * Responsibilities:
 * - Create and manage inventory selections
 * - Select/deselect products for stocking
 * - Track selection history
 * - Generate selected catalog views
 *
 * **Business Rule**: Only ONE selection can have status='active' at a time.
 * This is enforced in the activateSelection() method and executeWorkflow(action='approve').
 */

import { neonDb } from '../../../lib/database/neon-connection';
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags';
import {
  InventorySelection,
  InventorySelectedItem,
  SelectedCatalog,
  SelectionWorkflowRequest,
  SelectionWorkflowRequestSchema,
  InventorySelectionSchema,
  InventorySelectedItemSchema
} from '../../types/nxt-spp';

export class InventorySelectionService {
  /**
   * Create a new inventory selection
   */
  async createSelection(data: {
    selection_name: string;
    description?: string;
    created_by: string;
    valid_from?: Date;
    valid_to?: Date;
  }): Promise<InventorySelection> {
    const validated = InventorySelectionSchema.parse(data);

    const query = `
      INSERT INTO core.inventory_selection (
        selection_name, description, created_by, status, valid_from, valid_to
      )
      VALUES ($1, $2, $3, 'draft', $4, $5)
      RETURNING *
    `;

    const values = [
      validated.selection_name,
      validated.description || null,
      validated.created_by,
      validated.valid_from || null,
      validated.valid_to || null
    ];

    const result = await neonDb.query<InventorySelection>(query, values);
    return result.rows[0];
  }

  /**
   * Get selection by ID
   */
  async getById(selectionId: string): Promise<InventorySelection | null> {
    const query = 'SELECT * FROM core.inventory_selection WHERE selection_id = $1';
    const result = await neonDb.query<InventorySelection>(query, [selectionId]);
    return result.rows[0] || null;
  }

  /**
   * List selections
   */
  async listSelections(filters?: {
    status?: InventorySelection['status'];
    created_by?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ selections: InventorySelection[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters?.created_by) {
      conditions.push(`created_by = $${paramIndex++}`);
      params.push(filters.created_by);
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM core.inventory_selection WHERE ${whereClause}`;
    const countResult = await neonDb.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT * FROM core.inventory_selection
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    params.push(limit, offset);

    const result = await neonDb.query<InventorySelection>(query, params);

    return {
      selections: result.rows,
      total
    };
  }

  /**
   * Execute selection workflow (select/deselect products)
   */
  async executeWorkflow(request: SelectionWorkflowRequest): Promise<{
    success: boolean;
    selection_id: string;
    items_affected: number;
    errors: string[];
  }> {
    const validated = SelectionWorkflowRequestSchema.parse(request);
    const errors: string[] = [];
    let itemsAffected = 0;

    try {
      await neonDb.withTransaction(async (client) => {
        let selectionId = validated.selection_id;

        // Create new selection if not provided
        if (!selectionId && validated.selection_name) {
          const createQuery = `
            INSERT INTO core.inventory_selection (
              selection_name, created_by, status
            )
            VALUES ($1, $2, 'draft')
            RETURNING selection_id
          `;
          const createResult = await client.query(createQuery, [
            validated.selection_name,
            validated.selected_by
          ]);
          selectionId = createResult.rows[0].selection_id;
        }

        if (!selectionId) {
          throw new Error('Selection ID or name is required');
        }

        // Determine status based on action
        let status: InventorySelectedItem['status'];
        switch (validated.action) {
          case 'select':
            status = 'selected';
            break;
          case 'deselect':
            status = 'deselected';
            break;
          case 'approve':
            status = 'selected';

            // Enforce single-active-selection rule if feature flag is enabled
            if (isFeatureEnabled(FeatureFlag.ENFORCE_SINGLE_ACTIVE_SELECTION)) {
              // Check if another selection is already active
              const activeCheckQuery = `
                SELECT selection_id, selection_name
                FROM core.inventory_selection
                WHERE status = 'active' AND selection_id != $1
                LIMIT 1
              `;
              const activeCheck = await client.query(activeCheckQuery, [selectionId]);

              if (activeCheck.rows.length > 0) {
                const activeSelection = activeCheck.rows[0];
                throw new Error(
                  `Cannot activate selection: another selection '${activeSelection.selection_name}' ` +
                  `(${activeSelection.selection_id}) is already active. ` +
                  `Please archive the current active selection first or use the activateSelection() method ` +
                  `with deactivateOthers=true.`
                );
              }
            }

            // Also update selection status to active
            await client.query(
              'UPDATE core.inventory_selection SET status = $1, updated_at = NOW() WHERE selection_id = $2',
              ['active', selectionId]
            );
            break;
          default:
            throw new Error(`Unknown action: ${validated.action}`);
        }

        // Upsert selected items
        for (const supplierProductId of validated.supplier_product_ids) {
          try {
            const upsertQuery = `
              INSERT INTO core.inventory_selected_item (
                selection_id, supplier_product_id, status, notes, selected_by
              )
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (selection_id, supplier_product_id) DO UPDATE
              SET status = EXCLUDED.status,
                  notes = EXCLUDED.notes,
                  selected_by = EXCLUDED.selected_by,
                  selected_at = NOW(),
                  updated_at = NOW()
              RETURNING selection_item_id
            `;

            const result = await client.query(upsertQuery, [
              selectionId,
              supplierProductId,
              status,
              validated.notes || null,
              validated.selected_by
            ]);

            if (result.rowCount && result.rowCount > 0) {
              itemsAffected++;
            }
          } catch (error) {
            errors.push(
              `Failed to process ${supplierProductId}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      });

      return {
        success: errors.length === 0,
        selection_id: validated.selection_id || '',
        items_affected: itemsAffected,
        errors
      };
    } catch (error) {
      return {
        success: false,
        selection_id: validated.selection_id || '',
        items_affected: itemsAffected,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Add products to a selection (bulk operation)
   */
  async addProducts(
    selectionId: string,
    supplierProductIds: string[],
    selectedBy: string,
    notes?: string
  ): Promise<{ added: number; errors: string[] }> {
    const errors: string[] = [];
    let added = 0;

    await neonDb.withTransaction(async (client) => {
      for (const productId of supplierProductIds) {
        try {
          const query = `
            INSERT INTO core.inventory_selected_item (
              selection_id, supplier_product_id, status, notes, selected_by
            )
            VALUES ($1, $2, 'selected', $3, $4)
            ON CONFLICT (selection_id, supplier_product_id) DO UPDATE
            SET status = 'selected',
                notes = EXCLUDED.notes,
                selected_by = EXCLUDED.selected_by,
                selected_at = NOW(),
                updated_at = NOW()
          `;
          await client.query(query, [selectionId, productId, notes || null, selectedBy]);
          added++;
        } catch (error) {
          errors.push(
            `Failed to add product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    });

    return { added, errors };
  }

  /**
   * Remove products from a selection (bulk operation)
   */
  async removeProducts(
    selectionId: string,
    supplierProductIds: string[]
  ): Promise<{ removed: number; errors: string[] }> {
    const errors: string[] = [];
    let removed = 0;

    await neonDb.withTransaction(async (client) => {
      try {
        const query = `
          DELETE FROM core.inventory_selected_item
          WHERE selection_id = $1 AND supplier_product_id = ANY($2::uuid[])
        `;
        const result = await client.query(query, [selectionId, supplierProductIds]);
        removed = result.rowCount || 0;
      } catch (error) {
        errors.push(
          `Failed to remove products: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    return { removed, errors };
  }

  /**
   * Get items in a selection
   */
  async getSelectionItems(
    selectionId: string,
    filters?: {
      status?: InventorySelectedItem['status'];
      supplier_id?: string;
      search?: string;
    }
  ): Promise<InventorySelectedItem[]> {
    const conditions: string[] = ['isi.selection_id = $1'];
    const params: any[] = [selectionId];
    let paramIndex = 2;

    if (filters?.status) {
      conditions.push(`isi.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters?.supplier_id) {
      conditions.push(`sp.supplier_id = $${paramIndex}::uuid`);
      params.push(filters.supplier_id);
      paramIndex++;
    }

    if (filters?.search) {
      conditions.push(
        `(sp.name_from_supplier ILIKE $${paramIndex} OR sp.supplier_sku ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const query = `
      SELECT isi.*
      FROM core.inventory_selected_item isi
      JOIN core.supplier_product sp ON sp.supplier_product_id = isi.supplier_product_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY isi.selected_at DESC
    `;

    const result = await neonDb.query<InventorySelectedItem>(query, params);
    return result.rows;
  }

  /**
   * Get selected catalog view (all active selections)
   */
  async getSelectedCatalog(filters?: {
    supplier_id?: string;
    category_id?: string;
    in_stock_only?: boolean;
    search?: string;
  }): Promise<SelectedCatalog[]> {
    const conditions: string[] = [
      'sel.status = $1',
      'isi.status = $2'
    ];
    const params: any[] = ['active', 'selected'];
    let paramIndex = 3;

    if (filters?.supplier_id) {
      conditions.push(`sp.supplier_id = $${paramIndex}::uuid`);
      params.push(filters.supplier_id);
      paramIndex++;
    }

    if (filters?.category_id) {
      conditions.push(`sp.category_id = $${paramIndex++}`);
      params.push(filters.category_id);
    }

    if (filters?.in_stock_only) {
      conditions.push('soh.qty_on_hand > 0');
    }

    if (filters?.search) {
      conditions.push(
        `(sp.name_from_supplier ILIKE $${paramIndex} OR sp.supplier_sku ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const query = `
      WITH current_prices AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          price,
          currency
        FROM core.price_history
        WHERE is_current = true
        ORDER BY supplier_product_id, valid_from DESC
      ),
      latest_stock AS (
        SELECT DISTINCT ON (supplier_product_id)
          supplier_product_id,
          qty as qty_on_hand
        FROM core.stock_on_hand
        ORDER BY supplier_product_id, as_of_ts DESC
      )
      SELECT
        sel.selection_id,
        sel.selection_name,
        sp.supplier_product_id,
        sp.supplier_id,
        s.name as supplier_name,
        sp.supplier_sku,
        sp.name_from_supplier as product_name,
        cp.price as current_price,
        cp.currency,
        c.name as category_name,
        (soh.qty_on_hand IS NOT NULL AND soh.qty_on_hand > 0) as is_in_stock,
        soh.qty_on_hand,
        isi.selected_at
      FROM core.inventory_selected_item isi
      JOIN core.inventory_selection sel ON sel.selection_id = isi.selection_id
      JOIN core.supplier_product sp ON sp.supplier_product_id = isi.supplier_product_id
      JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
      LEFT JOIN core.category c ON c.category_id = sp.category_id
      LEFT JOIN latest_stock soh ON soh.supplier_product_id = sp.supplier_product_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.name, sp.name_from_supplier
    `;

    const result = await neonDb.query<SelectedCatalog>(query, params);
    return result.rows;
  }

  /**
   * Update selection status
   */
  async updateSelectionStatus(
    selectionId: string,
    status: InventorySelection['status']
  ): Promise<InventorySelection> {
    const query = `
      UPDATE core.inventory_selection
      SET status = $1, updated_at = NOW()
      WHERE selection_id = $2
      RETURNING *
    `;

    const result = await neonDb.query<InventorySelection>(query, [status, selectionId]);

    if (result.rowCount === 0) {
      throw new Error(`Selection ${selectionId} not found`);
    }

    return result.rows[0];
  }

  /**
   * Archive old selections
   */
  async archiveOldSelections(daysThreshold = 180): Promise<number> {
    const query = `
      UPDATE core.inventory_selection
      SET status = 'archived', updated_at = NOW()
      WHERE status = 'active'
        AND (valid_to IS NOT NULL AND valid_to < NOW() - INTERVAL '${daysThreshold} days')
      RETURNING selection_id
    `;

    const result = await neonDb.query(query);
    return result.rowCount || 0;
  }

  /**
   * Activate a selection with automatic deactivation of other active selections
   *
   * @param selectionId - Selection to activate
   * @param deactivateOthers - If true, automatically archive other active selections
   * @returns The activated selection
   * @throws Error if another selection is active and deactivateOthers is false
   */
  async activateSelection(
    selectionId: string,
    deactivateOthers: boolean = false
  ): Promise<InventorySelection> {
    return await neonDb.withTransaction(async (client) => {
      // Check if selection exists and is in valid state for activation
      const selectionQuery = 'SELECT * FROM core.inventory_selection WHERE selection_id = $1';
      const selectionResult = await client.query<InventorySelection>(selectionQuery, [selectionId]);

      if (selectionResult.rowCount === 0) {
        throw new Error(`Selection ${selectionId} not found`);
      }

      const selection = selectionResult.rows[0];

      if (selection.status === 'active') {
        return selection; // Already active, nothing to do
      }

      // Verify selection has at least one selected item
      const itemCountQuery = `
        SELECT COUNT(*) as count
        FROM core.inventory_selected_item
        WHERE selection_id = $1 AND status = 'selected'
      `;
      const itemCountResult = await client.query<{ count: string }>(itemCountQuery, [selectionId]);
      const itemCount = parseInt(itemCountResult.rows[0].count);

      if (itemCount === 0) {
        throw new Error('Cannot activate empty selection. Please select at least one item first.');
      }

      // Check if another selection is already active
      const activeCheckQuery = `
        SELECT selection_id, selection_name
        FROM core.inventory_selection
        WHERE status = 'active' AND selection_id != $1
      `;
      const activeCheck = await client.query(activeCheckQuery, [selectionId]);

      if (activeCheck.rows.length > 0) {
        if (!deactivateOthers) {
          const activeSelection = activeCheck.rows[0];
          throw new Error(
            `Cannot activate selection: another selection '${activeSelection.selection_name}' ` +
            `(${activeSelection.selection_id}) is already active. ` +
            `Set deactivateOthers=true to automatically archive it.`
          );
        }

        // Archive all other active selections
        await client.query(
          `UPDATE core.inventory_selection
           SET status = 'archived', updated_at = NOW()
           WHERE status = 'active' AND selection_id != $1`,
          [selectionId]
        );
      }

      // Activate the selection
      const activateQuery = `
        UPDATE core.inventory_selection
        SET status = 'active', updated_at = NOW()
        WHERE selection_id = $1
        RETURNING *
      `;
      const activateResult = await client.query<InventorySelection>(activateQuery, [selectionId]);

      return activateResult.rows[0];
    });
  }

  /**
   * Get the currently active selection
   *
   * @returns The active selection or null if none exists
   */
  async getActiveSelection(): Promise<InventorySelection | null> {
    const query = 'SELECT * FROM core.inventory_selection WHERE status = $1 LIMIT 1';
    const result = await neonDb.query<InventorySelection>(query, ['active']);
    return result.rows[0] || null;
  }

  /**
   * Get the currently active selection with enriched metadata
   *
   * @returns The active selection with item count and inventory value
   */
  async getActiveSelectionWithMetadata(): Promise<{
    selection: InventorySelection | null;
    item_count: number;
    inventory_value: number;
  }> {
    const selection = await this.getActiveSelection();

    if (!selection) {
      return {
        selection: null,
        item_count: 0,
        inventory_value: 0
      };
    }

    // Get item count
    const itemCountQuery = `
      SELECT COUNT(*) as count
      FROM core.inventory_selected_item
      WHERE selection_id = $1 AND status = 'selected'
    `;
    const itemCountResult = await neonDb.query<{ count: string }>(itemCountQuery, [selection.selection_id]);
    const itemCount = parseInt(itemCountResult.rows[0].count);

    // Get inventory value (calculate from price history and stock on hand)
    let inventoryValue = 0;
    try {
      const valueQuery = `
        SELECT COALESCE(SUM(ph.price * soh.qty), 0) as total
        FROM core.inventory_selected_item isi
        JOIN core.price_history ph ON ph.supplier_product_id = isi.supplier_product_id AND ph.is_current = true
        JOIN core.stock_on_hand soh ON soh.supplier_product_id = isi.supplier_product_id
        WHERE isi.selection_id = $1 AND isi.status = 'selected'
      `;
      const valueResult = await neonDb.query<{ total: string }>(valueQuery, [selection.selection_id]);
      inventoryValue = parseFloat(valueResult.rows[0]?.total || '0');
    } catch (error) {
      // If stock_on_hand table doesn't exist or query fails, return 0
      console.warn('[InventorySelectionService] Cannot calculate inventory value:', error instanceof Error ? error.message : 'Unknown error');
      inventoryValue = 0;
    }

    return {
      selection,
      item_count: itemCount,
      inventory_value: inventoryValue
    };
  }
}

// Export singleton instance
export const inventorySelectionService = new InventorySelectionService();
