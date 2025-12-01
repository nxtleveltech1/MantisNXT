import { Client } from 'pg';
import {
  setupTestDatabase,
  teardownTestDatabase,
  resetTestData,
  dbManager,
} from '../setup/database.setup';
import {
  InventoryItemFactory,
  SupplierFactory,
  WarehouseFactory,
  LocationFactory,
  StockMovementFactory,
} from '../fixtures/factories';
import { measurePerformance, dbPerformanceMonitor } from '../setup/performance.setup';

describe('Database Operations Integration Tests', () => {
  let client: Client;

  beforeAll(async () => {
    await setupTestDatabase();
    client = dbManager.getClient();
    dbPerformanceMonitor.wrapClient(client);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await resetTestData();
    dbPerformanceMonitor.clear();
  });

  describe('Inventory Operations', () => {
    describe('CRUD Operations', () => {
      it('should create inventory item with relationships', async () => {
        const { result, metrics } = await measurePerformance(
          async () => {
            const item = InventoryItemFactory.build({
              sku: 'DB-TEST-001',
              name: 'Database Test Item',
              organizationId: 'test-org-1',
              supplierId: 'test-sup-1',
              primaryLocationId: 'test-loc-1',
            });

            const insertResult = await client.query(
              `
            INSERT INTO inventory_items (
              id, sku, name, description, category_id, subcategory_id, organization_id,
              current_stock, reserved_stock, available_stock, reorder_point, max_stock, min_stock,
              unit_cost, unit_price, currency, unit, status, supplier_id, primary_location_id,
              batch_tracking, tags, notes
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, $11, $12,
              $13, $14, $15, $16, $17, $18, $19,
              $20, $21, $22
            ) RETURNING *
          `,
              [
                item.sku,
                item.name,
                item.description,
                item.category,
                item.subcategory,
                item.organizationId,
                item.currentStock,
                item.reservedStock || 0,
                item.availableStock,
                item.reorderPoint,
                item.maxStock,
                item.minStock,
                item.unitCost,
                item.unitPrice,
                item.currency,
                item.unit,
                item.status,
                item.supplierId,
                item.primaryLocationId,
                item.batchTracking,
                JSON.stringify(item.tags),
                item.notes,
              ]
            );

            return insertResult.rows[0];
          },
          { maxDuration: 100, maxMemory: 1024 * 1024 }
        );

        expect(result).toBeDefined();
        expect(result.sku).toBe('DB-TEST-001');
        expect(result.organization_id).toBe('test-org-1');
        expect(metrics.duration).toBeLessThan(100);
      });

      it('should read inventory item with joins', async () => {
        // First create an item
        const item = InventoryItemFactory.build({
          sku: 'DB-READ-001',
          organizationId: 'test-org-1',
          supplierId: 'test-sup-1',
          primaryLocationId: 'test-loc-1',
        });

        const insertResult = await client.query(
          `
          INSERT INTO inventory_items (
            id, sku, name, organization_id, current_stock, reorder_point, max_stock, min_stock,
            unit_cost, unit_price, currency, unit, status, supplier_id, primary_location_id
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
          ) RETURNING id
        `,
          [
            item.sku,
            item.name,
            item.organizationId,
            item.currentStock,
            item.reorderPoint,
            item.maxStock,
            item.minStock,
            item.unitCost,
            item.unitPrice,
            item.currency,
            item.unit,
            item.status,
            item.supplierId,
            item.primaryLocationId,
          ]
        );

        const itemId = insertResult.rows[0].id;

        // Read with joins
        const { result, metrics } = await measurePerformance(
          async () => {
            const readResult = await client.query(
              `
            SELECT
              i.*,
              s.name as supplier_name,
              s.code as supplier_code,
              l.code as location_code,
              w.name as warehouse_name
            FROM inventory_items i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            LEFT JOIN locations l ON i.primary_location_id = l.id
            LEFT JOIN warehouses w ON l.warehouse_id = w.id
            WHERE i.id = $1
          `,
              [itemId]
            );

            return readResult.rows[0];
          },
          { maxDuration: 50 }
        );

        expect(result).toBeDefined();
        expect(result.sku).toBe('DB-READ-001');
        expect(result.supplier_name).toBe('Test Supplier 1');
        expect(result.location_code).toBe('A-01-01-01');
        expect(metrics.duration).toBeLessThan(50);
      });

      it('should update inventory item and maintain data integrity', async () => {
        const { result } = await measurePerformance(async () => {
          const updateResult = await client.query(
            `
            UPDATE inventory_items
            SET
              current_stock = $1,
              available_stock = current_stock - reserved_stock,
              updated_at = now(),
              status = CASE
                WHEN $1 = 0 THEN 'out_of_stock'
                WHEN $1 <= reorder_point THEN 'low_stock'
                ELSE 'active'
              END
            WHERE id = 'test-item-1'
            RETURNING *
          `,
            [0]
          );

          return updateResult.rows[0];
        });

        expect(result.current_stock).toBe(0);
        expect(result.available_stock).toBe(0);
        expect(result.status).toBe('out_of_stock');
      });

      it('should delete inventory item with cascade constraints', async () => {
        // First create a test item
        const insertResult = await client.query(`
          INSERT INTO inventory_items (
            id, sku, name, organization_id, current_stock, reorder_point, max_stock, min_stock,
            unit_cost, unit_price, currency, unit, status
          ) VALUES (
            'delete-test-item', 'DELETE-001', 'Item to Delete', 'test-org-1',
            10, 5, 100, 1, 99.99, 129.99, 'USD', 'pcs', 'active'
          ) RETURNING id
        `);

        const itemId = insertResult.rows[0].id;

        // Add some stock movements
        await client.query(
          `
          INSERT INTO stock_movements (
            id, inventory_item_id, type, quantity, reason, reference, user_id, timestamp
          ) VALUES (
            gen_random_uuid(), $1, 'inbound', 10, 'Initial stock', 'REF-001', 'test-user-1', now()
          )
        `,
          [itemId]
        );

        // Delete should cascade to stock movements
        const { result } = await measurePerformance(async () => {
          const deleteResult = await client.query(
            `
            DELETE FROM inventory_items WHERE id = $1 RETURNING *
          `,
            [itemId]
          );

          return deleteResult.rows[0];
        });

        expect(result.id).toBe(itemId);

        // Verify stock movements are deleted
        const stockMovementsResult = await client.query(
          `
          SELECT COUNT(*) as count FROM stock_movements WHERE inventory_item_id = $1
        `,
          [itemId]
        );

        expect(parseInt(stockMovementsResult.rows[0].count)).toBe(0);
      });
    });

    describe('Complex Queries', () => {
      it('should perform inventory analytics query efficiently', async () => {
        const { result, metrics } = await measurePerformance(
          async () => {
            const analyticsResult = await client.query(
              `
            SELECT
              COUNT(*) as total_items,
              SUM(current_stock * unit_cost) as total_value,
              SUM(CASE WHEN current_stock <= reorder_point THEN 1 ELSE 0 END) as low_stock_count,
              SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
              AVG(current_stock * unit_cost) as avg_item_value,
              COUNT(DISTINCT supplier_id) as supplier_count,
              COUNT(DISTINCT primary_location_id) as location_count
            FROM inventory_items
            WHERE organization_id = $1 AND status != 'inactive'
          `,
              ['test-org-1']
            );

            return analyticsResult.rows[0];
          },
          { maxDuration: 200 }
        );

        expect(result).toBeDefined();
        expect(parseInt(result.total_items)).toBeGreaterThan(0);
        expect(parseFloat(result.total_value)).toBeGreaterThan(0);
        expect(metrics.duration).toBeLessThan(200);
      });

      it('should perform stock movement aggregation query', async () => {
        // Add some stock movements for testing
        await client.query(`
          INSERT INTO stock_movements (
            id, inventory_item_id, type, quantity, reason, user_id, timestamp
          ) VALUES
            (gen_random_uuid(), 'test-item-1', 'inbound', 50, 'Restock', 'test-user-1', now() - interval '1 day'),
            (gen_random_uuid(), 'test-item-1', 'outbound', 20, 'Sale', 'test-user-1', now() - interval '12 hours'),
            (gen_random_uuid(), 'test-item-2', 'inbound', 30, 'Restock', 'test-user-1', now() - interval '2 days'),
            (gen_random_uuid(), 'test-item-2', 'adjustment', -5, 'Damage', 'test-user-1', now() - interval '6 hours')
        `);

        const { result, metrics } = await measurePerformance(
          async () => {
            const movementResult = await client.query(`
            SELECT
              sm.inventory_item_id,
              i.name as item_name,
              i.sku,
              SUM(CASE WHEN sm.type = 'inbound' THEN sm.quantity ELSE 0 END) as total_inbound,
              SUM(CASE WHEN sm.type = 'outbound' THEN sm.quantity ELSE 0 END) as total_outbound,
              SUM(CASE WHEN sm.type = 'adjustment' THEN sm.quantity ELSE 0 END) as total_adjustments,
              COUNT(*) as movement_count,
              MAX(sm.timestamp) as last_movement
            FROM stock_movements sm
            JOIN inventory_items i ON sm.inventory_item_id = i.id
            WHERE sm.timestamp >= now() - interval '7 days'
            GROUP BY sm.inventory_item_id, i.name, i.sku
            ORDER BY movement_count DESC
          `);

            return movementResult.rows;
          },
          { maxDuration: 300 }
        );

        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('total_inbound');
        expect(result[0]).toHaveProperty('total_outbound');
        expect(metrics.duration).toBeLessThan(300);
      });

      it('should perform cross-organizational query with proper isolation', async () => {
        const { result } = await measurePerformance(async () => {
          // This query should only return items for the specified organization
          const isolationResult = await client.query(
            `
            SELECT i.*, o.name as org_name
            FROM inventory_items i
            JOIN organizations o ON i.organization_id = o.id
            WHERE i.organization_id = $1
          `,
            ['test-org-1']
          );

          return isolationResult.rows;
        });

        // Verify data isolation
        expect(result).toBeDefined();
        result.forEach(item => {
          expect(item.organization_id).toBe('test-org-1');
          expect(item.org_name).toBe('Test Organization 1');
        });
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle concurrent stock updates correctly', async () => {
        const itemId = 'test-item-1';
        const concurrentUpdates = 10;
        const updateAmount = 5;

        // Get initial stock
        const initialResult = await client.query(
          'SELECT current_stock FROM inventory_items WHERE id = $1',
          [itemId]
        );
        const initialStock = initialResult.rows[0].current_stock;

        // Execute concurrent updates
        const updatePromises = Array.from({ length: concurrentUpdates }, (_, i) =>
          dbManager.withTransaction(async txClient => {
            // Simulate some processing time
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

            const result = await txClient.query(
              `
              UPDATE inventory_items
              SET current_stock = current_stock + $1,
                  available_stock = current_stock + $1 - reserved_stock,
                  updated_at = now()
              WHERE id = $2
              RETURNING current_stock
            `,
              [updateAmount, itemId]
            );

            return result.rows[0].current_stock;
          })
        );

        const results = await Promise.all(updatePromises);

        // Verify final stock is correct
        const finalResult = await client.query(
          'SELECT current_stock FROM inventory_items WHERE id = $1',
          [itemId]
        );
        const finalStock = finalResult.rows[0].current_stock;
        const expectedStock = initialStock + concurrentUpdates * updateAmount;

        expect(finalStock).toBe(expectedStock);
      });

      it('should prevent negative stock through constraints', async () => {
        const itemId = 'test-item-1';

        // Try to reduce stock below zero
        await expect(
          client.query(
            `
            UPDATE inventory_items
            SET current_stock = current_stock - 10000
            WHERE id = $1
          `,
            [itemId]
          )
        ).rejects.toThrow(/check constraint/i);
      });
    });

    describe('Performance Benchmarks', () => {
      it('should maintain query performance under load', async () => {
        const queryCount = 100;
        const queries = Array.from({ length: queryCount }, () =>
          measurePerformance(async () => {
            return client.query(
              `
              SELECT i.*, s.name as supplier_name, l.code as location_code
              FROM inventory_items i
              LEFT JOIN suppliers s ON i.supplier_id = s.id
              LEFT JOIN locations l ON i.primary_location_id = l.id
              WHERE i.organization_id = $1
              ORDER BY i.updated_at DESC
              LIMIT 20
            `,
              ['test-org-1']
            );
          })
        );

        const results = await Promise.all(queries);
        const avgDuration = results.reduce((sum, r) => sum + r.metrics.duration, 0) / queryCount;

        // Average query should complete within 100ms
        expect(avgDuration).toBeLessThan(100);

        // All queries should complete within 500ms
        results.forEach(({ metrics }) => {
          expect(metrics.duration).toBeLessThan(500);
        });
      });

      it('should handle bulk operations efficiently', async () => {
        const bulkSize = 1000;
        const items = Array.from({ length: bulkSize }, (_, i) =>
          InventoryItemFactory.build({
            sku: `BULK-${i.toString().padStart(4, '0')}`,
            organizationId: 'test-org-1',
          })
        );

        const { metrics } = await measurePerformance(
          async () => {
            // Use batch insert with VALUES clause
            const values = items
              .map(
                (item, i) => `(
            gen_random_uuid(), $${i * 12 + 1}, $${i * 12 + 2}, $${i * 12 + 3},
            $${i * 12 + 4}, $${i * 12 + 5}, $${i * 12 + 6}, $${i * 12 + 7},
            $${i * 12 + 8}, $${i * 12 + 9}, $${i * 12 + 10}, $${i * 12 + 11}, $${i * 12 + 12}
          )`
              )
              .join(',');

            const params = items.flatMap(item => [
              item.sku,
              item.name,
              item.organizationId,
              item.currentStock,
              item.reorderPoint,
              item.maxStock,
              item.minStock,
              item.unitCost,
              item.unitPrice,
              item.currency,
              item.unit,
              item.status,
            ]);

            await client.query(
              `
            INSERT INTO inventory_items (
              id, sku, name, organization_id, current_stock, reorder_point,
              max_stock, min_stock, unit_cost, unit_price, currency, unit, status
            ) VALUES ${values}
          `,
              params
            );
          },
          { maxDuration: 5000 }
        );

        // Bulk insert should complete within 5 seconds
        expect(metrics.duration).toBeLessThan(5000);

        // Verify all items were inserted
        const countResult = await client.query(`
          SELECT COUNT(*) as count FROM inventory_items
          WHERE sku LIKE 'BULK-%' AND organization_id = 'test-org-1'
        `);
        expect(parseInt(countResult.rows[0].count)).toBe(bulkSize);
      });
    });

    describe('Data Integrity', () => {
      it('should maintain referential integrity on cascading deletes', async () => {
        // Create supplier with items
        const supplierId = 'integrity-test-supplier';
        await client.query(
          `
          INSERT INTO suppliers (id, name, code, organization_id, contact_email, contact_phone, status)
          VALUES ($1, 'Integrity Test Supplier', 'ITS001', 'test-org-1', 'test@supplier.com', '+1234567890', 'active')
        `,
          [supplierId]
        );

        // Create items linked to supplier
        await client.query(
          `
          INSERT INTO inventory_items (
            id, sku, name, organization_id, supplier_id, current_stock, reorder_point,
            max_stock, min_stock, unit_cost, unit_price, currency, unit, status
          ) VALUES
            ('integrity-item-1', 'INT-001', 'Integrity Item 1', 'test-org-1', $1, 10, 5, 100, 1, 99.99, 129.99, 'USD', 'pcs', 'active'),
            ('integrity-item-2', 'INT-002', 'Integrity Item 2', 'test-org-1', $1, 20, 10, 200, 2, 199.99, 259.99, 'USD', 'pcs', 'active')
        `,
          [supplierId]
        );

        // Attempt to delete supplier should fail due to foreign key constraint
        await expect(
          client.query('DELETE FROM suppliers WHERE id = $1', [supplierId])
        ).rejects.toThrow(/foreign key constraint/i);

        // Delete items first, then supplier should succeed
        await client.query('DELETE FROM inventory_items WHERE supplier_id = $1', [supplierId]);
        await client.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);

        // Verify deletion
        const supplierResult = await client.query(
          'SELECT COUNT(*) as count FROM suppliers WHERE id = $1',
          [supplierId]
        );
        expect(parseInt(supplierResult.rows[0].count)).toBe(0);
      });

      it('should maintain audit trail for all changes', async () => {
        const itemId = 'test-item-1';

        // Update item and verify audit log
        await client.query(
          `
          UPDATE inventory_items
          SET current_stock = 999, updated_at = now()
          WHERE id = $1
        `,
          [itemId]
        );

        // Check if audit trigger created log entry
        const auditResult = await client.query(
          `
          SELECT * FROM audit_logs
          WHERE table_name = 'inventory_items'
          AND record_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
          [itemId]
        );

        expect(auditResult.rows.length).toBeGreaterThan(0);
        expect(auditResult.rows[0].operation).toBe('UPDATE');
        expect(auditResult.rows[0].new_values).toContain('999');
      });
    });
  });

  describe('Database Performance Monitoring', () => {
    afterEach(() => {
      const perfResults = dbPerformanceMonitor.getResults();

      // Log performance metrics for monitoring
      console.log('Database Performance Results:', {
        queryCount: perfResults.queryCount,
        averageQueryTime: perfResults.averageQueryTime,
        slowestQuery: perfResults.slowestQuery.duration,
        fastestQuery: perfResults.fastestQuery.duration,
      });

      // Performance assertions
      expect(perfResults.averageQueryTime).toBeLessThan(100); // 100ms average
      expect(perfResults.slowestQuery.duration).toBeLessThan(1000); // 1s max
    });

    it('should identify slow queries', async () => {
      // Intentionally slow query for testing
      await client.query(`
        SELECT COUNT(*) FROM inventory_items i1
        CROSS JOIN inventory_items i2
        WHERE i1.organization_id = 'test-org-1'
        LIMIT 1
      `);

      const perfResults = dbPerformanceMonitor.getResults();
      expect(perfResults.slowestQuery.duration).toBeGreaterThan(10);
    });
  });
});
