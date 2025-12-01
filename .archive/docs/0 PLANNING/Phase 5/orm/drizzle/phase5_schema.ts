// Phase 5 Drizzle schema fragment (PostgreSQL) — merge into your schema
import { pgEnum, pgTable, uuid, integer, text, timestamp, check, index } from 'drizzle-orm/pg-core';

export const movementType = pgEnum('movement_type', [
  'IN',
  'OUT',
  'ADJUST',
  'TRANSFER',
  'CONSIGNMENT_IN',
  'CONSIGNMENT_OUT',
  'WRITE_OFF',
]);

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stockQty: integer('stock_qty').notNull().default(0),
    reservedQty: integer('reserved_qty').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }).nullable(),
  },
  table => {
    return {
      stockNonneg: check('inventory_items_stock_nonneg', `${table.stockQty.name} >= 0`),
      reservedNonneg: check('inventory_items_reserved_nonneg', `${table.reservedQty.name} >= 0`),
      reservedLeStock: check(
        'inventory_items_reserved_le_stock',
        `${table.reservedQty.name} <= ${table.stockQty.name}`
      ),
    };
  }
);

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inventoryItemId: uuid('inventory_item_id').notNull(),
    movementType: movementType('movement_type').notNull(),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => {
    return {
      idxItemCreated: index('idx_movements_item_created').on(
        table.inventoryItemId,
        table.createdAt.desc()
      ),
      idxTypeCreated: index('idx_movements_type_created').on(
        table.movementType,
        table.createdAt.desc()
      ),
      qtyPositive: check('stock_movements_qty_positive', `${table.quantity.name} > 0`),
    };
  }
);

export const inventoryAllocations = pgTable(
  'inventory_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inventoryItemId: uuid('inventory_item_id').notNull(),
    supplierId: uuid('supplier_id').notNull(),
    quantity: integer('quantity').notNull(),
    status: text('status').notNull().default('active'),
    allocatedAt: timestamp('allocated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).nullable(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => {
    return {
      idxAllocItem: index('idx_allocations_item').on(table.inventoryItemId),
      idxAllocSupplier: index('idx_allocations_supplier').on(table.supplierId),
      idxAllocStatus: index('idx_allocations_status').on(table.status),
      qtyNonneg: check('inventory_allocations_qty_nonneg', `${table.quantity.name} >= 0`),
    };
  }
);
