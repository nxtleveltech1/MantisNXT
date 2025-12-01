/**
 * MantisNXT Built-in Tools
 * Domain-specific tools for inventory, suppliers, orders, analytics, and customers
 */

import { z } from 'zod';
import { toolRegistry } from '../registry';
import {
  searchSuppliers,
  searchInventory,
  getInventoryStatus,
  getSystemContext,
} from '@/lib/ai/system-context';

// Tool Input/Output Schemas
const searchSuppliersSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(50).default(10),
});

const searchInventorySchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(50).default(10),
});

const getInventoryItemSchema = z.object({
  itemId: z.string().uuid(),
});

const getInventoryStatusSchema = z.object({
  // No additional parameters needed
});

const getLowStockItemsSchema = z.object({
  threshold: z.number().int().min(0).max(1000).default(10),
});

const getSupplierSchema = z.object({
  supplierId: z.string().uuid(),
});

const getSupplierPerformanceSchema = z.object({
  supplierId: z.string().uuid(),
});

const createPurchaseOrderSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0).optional(),
    })
  ),
  supplierId: z.string().uuid(),
  notes: z.string().optional(),
});

const getPurchaseOrderSchema = z.object({
  orderId: z.string().uuid(),
});

const listPurchaseOrdersSchema = z.object({
  status: z.enum(['draft', 'pending', 'approved', 'shipped', 'delivered', 'cancelled']).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const runAnalyticsQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  parameters: z.record(z.unknown()).optional(),
});

const getForecastSchema = z.object({
  productId: z.string().uuid(),
  days: z.number().int().min(1).max(365).default(30),
});

const getAnomaliesSchema = z.object({
  entityType: z.enum(['product', 'supplier', 'category', 'customer']),
  entityId: z.string().uuid().optional(),
  days: z.number().int().min(1).max(90).default(7),
});

// Tool Implementations
const inventoryTools = [
  {
    name: 'searchInventory',
    description: 'Search for inventory items by name, SKU, or category',
    category: 'inventory' as const,
    inputSchema: searchInventorySchema,
    outputSchema: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        sku: z.string(),
        quantity: z.number(),
        unit_price: z.number(),
        reorder_point: z.number().optional(),
        category: z.string().optional(),
      })
    ),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['inventory:read'],
    handler: async (params: z.infer<typeof searchInventorySchema>, context: any) => {
      return await searchInventory(context.orgId, params.query, params.limit);
    },
  },
  {
    name: 'getInventoryItem',
    description: 'Get detailed information about a specific inventory item',
    category: 'inventory' as const,
    inputSchema: getInventoryItemSchema,
    outputSchema: z.object({
      id: z.string(),
      name: z.string(),
      sku: z.string(),
      description: z.string().optional(),
      quantity: z.number(),
      unit_price: z.number(),
      reorder_point: z.number().optional(),
      category: z.string().optional(),
      supplier_id: z.string().optional(),
      last_updated: z.date().optional(),
    }),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['inventory:read'],
    handler: async (params: z.infer<typeof getInventoryItemSchema>, context: any) => {
      // Placeholder - would integrate with actual inventory service
      throw new Error('getInventoryItem tool not yet implemented');
    },
  },
  {
    name: 'getInventoryStatus',
    description: 'Get comprehensive inventory status and statistics',
    category: 'inventory' as const,
    inputSchema: getInventoryStatusSchema,
    outputSchema: z.object({
      total_items: z.number(),
      total_quantity: z.number(),
      total_value: z.number(),
      low_stock_items: z.number(),
      out_of_stock_items: z.number(),
      total_categories: z.number(),
    }),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['inventory:read'],
    handler: async (params: z.infer<typeof getInventoryStatusSchema>, context: any) => {
      return await getInventoryStatus(context.orgId);
    },
  },
  {
    name: 'getLowStockItems',
    description: 'Get items that are below the reorder threshold',
    category: 'inventory' as const,
    inputSchema: getLowStockItemsSchema,
    outputSchema: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        sku: z.string(),
        quantity: z.number(),
        reorder_point: z.number(),
        supplier_name: z.string().optional(),
      })
    ),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['inventory:read'],
    handler: async (params: z.infer<typeof getLowStockItemsSchema>, context: any) => {
      // Placeholder - would integrate with actual inventory service
      throw new Error('getLowStockItems tool not yet implemented');
    },
  },
];

const supplierTools = [
  {
    name: 'searchSuppliers',
    description: 'Search for suppliers by name, email, or contact information',
    category: 'suppliers' as const,
    inputSchema: searchSuppliersSchema,
    outputSchema: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.string(),
        contact_email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        performance_score: z.number().optional(),
      })
    ),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['suppliers:read'],
    handler: async (params: z.infer<typeof searchSuppliersSchema>, context: any) => {
      return await searchSuppliers(context.orgId, params.query, params.limit);
    },
  },
  {
    name: 'getSupplier',
    description: 'Get detailed information about a specific supplier',
    category: 'suppliers' as const,
    inputSchema: getSupplierSchema,
    outputSchema: z.object({
      id: z.string(),
      name: z.string(),
      status: z.string(),
      contact_email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      performance_score: z.number().optional(),
      total_orders: z.number().optional(),
      created_at: z.date(),
      updated_at: z.date(),
    }),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['suppliers:read'],
    handler: async (params: z.infer<typeof getSupplierSchema>, context: any) => {
      // Placeholder - would integrate with actual supplier service
      throw new Error('getSupplier tool not yet implemented');
    },
  },
  {
    name: 'getSupplierPerformance',
    description: 'Get performance metrics and analytics for a supplier',
    category: 'suppliers' as const,
    inputSchema: getSupplierPerformanceSchema,
    outputSchema: z.object({
      supplier_id: z.string(),
      performance_score: z.number(),
      on_time_delivery_rate: z.number(),
      quality_rating: z.number(),
      total_orders: z.number(),
      total_value: z.number(),
      recent_deliveries: z.array(
        z.object({
          order_id: z.string(),
          delivered_at: z.date(),
          on_time: z.boolean(),
          quality_issues: z.boolean(),
        })
      ),
    }),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['suppliers:read'],
    handler: async (params: z.infer<typeof getSupplierPerformanceSchema>, context: any) => {
      // Placeholder - would integrate with actual supplier analytics service
      throw new Error('getSupplierPerformance tool not yet implemented');
    },
  },
];

const orderTools = [
  {
    name: 'createPurchaseOrder',
    description: 'Create a new purchase order (requires approval)',
    category: 'orders' as const,
    inputSchema: createPurchaseOrderSchema,
    outputSchema: z.object({
      order_id: z.string(),
      status: z.string(),
      total_value: z.number(),
      items_count: z.number(),
      created_at: z.date(),
      requires_approval: z.boolean(),
    }),
    accessLevel: 'read-write-approval' as const,
    requiredPermissions: ['orders:create', 'orders:approve'],
    handler: async (params: z.infer<typeof createPurchaseOrderSchema>, context: any) => {
      // Placeholder - would integrate with actual order service
      throw new Error('createPurchaseOrder tool not yet implemented');
    },
  },
  {
    name: 'getPurchaseOrder',
    description: 'Get detailed information about a purchase order',
    category: 'orders' as const,
    inputSchema: getPurchaseOrderSchema,
    outputSchema: z.object({
      id: z.string(),
      supplier_id: z.string(),
      supplier_name: z.string(),
      status: z.string(),
      total_value: z.number(),
      items: z.array(
        z.object({
          item_id: z.string(),
          item_name: z.string(),
          quantity: z.number(),
          unit_price: z.number(),
          total_price: z.number(),
        })
      ),
      created_at: z.date(),
      approved_at: z.date().optional(),
      shipped_at: z.date().optional(),
      delivered_at: z.date().optional(),
    }),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['orders:read'],
    handler: async (params: z.infer<typeof getPurchaseOrderSchema>, context: any) => {
      // Placeholder - would integrate with actual order service
      throw new Error('getPurchaseOrder tool not yet implemented');
    },
  },
  {
    name: 'listPurchaseOrders',
    description: 'List purchase orders with optional filtering',
    category: 'orders' as const,
    inputSchema: listPurchaseOrdersSchema,
    outputSchema: z.array(
      z.object({
        id: z.string(),
        supplier_name: z.string(),
        status: z.string(),
        total_value: z.number(),
        items_count: z.number(),
        created_at: z.date(),
      })
    ),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['orders:read'],
    handler: async (params: z.infer<typeof listPurchaseOrdersSchema>, context: any) => {
      // Placeholder - would integrate with actual order service
      throw new Error('listPurchaseOrders tool not yet implemented');
    },
  },
];

const analyticsTools = [
  {
    name: 'runAnalyticsQuery',
    description: 'Execute custom analytics queries on business data',
    category: 'analytics' as const,
    inputSchema: runAnalyticsQuerySchema,
    outputSchema: z.object({
      query_id: z.string(),
      results: z.array(z.record(z.unknown())),
      execution_time_ms: z.number(),
      row_count: z.number(),
    }),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['analytics:read'],
    handler: async (params: z.infer<typeof runAnalyticsQuerySchema>, context: any) => {
      // Placeholder - would integrate with actual analytics service
      throw new Error('runAnalyticsQuery tool not yet implemented');
    },
  },
  {
    name: 'getForecast',
    description: 'Get demand forecast for a specific product',
    category: 'analytics' as const,
    inputSchema: getForecastSchema,
    outputSchema: z.object({
      product_id: z.string(),
      forecast_period_days: z.number(),
      predictions: z.array(
        z.object({
          date: z.date(),
          predicted_demand: z.number(),
          confidence_lower: z.number(),
          confidence_upper: z.number(),
          confidence_level: z.number(),
        })
      ),
      accuracy_metrics: z
        .object({
          mape: z.number().optional(),
          rmse: z.number().optional(),
        })
        .optional(),
    }),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['analytics:read'],
    handler: async (params: z.infer<typeof getForecastSchema>, context: any) => {
      // Placeholder - would integrate with actual forecasting service
      throw new Error('getForecast tool not yet implemented');
    },
  },
  {
    name: 'getAnomalies',
    description: 'Detect anomalies in business metrics for entities',
    category: 'analytics' as const,
    inputSchema: getAnomaliesSchema,
    outputSchema: z.array(
      z.object({
        id: z.string(),
        entity_type: z.string(),
        entity_id: z.string(),
        anomaly_type: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        description: z.string(),
        detected_value: z.number(),
        expected_value: z.number(),
        deviation_percentage: z.number(),
        detected_at: z.date(),
        status: z.enum(['active', 'acknowledged', 'resolved']),
      })
    ),
    accessLevel: 'read-only' as const,
    requiredPermissions: ['analytics:read'],
    handler: async (params: z.infer<typeof getAnomaliesSchema>, context: any) => {
      // Placeholder - would integrate with actual anomaly detection service
      throw new Error('getAnomalies tool not yet implemented');
    },
  },
];

/**
 * Register all built-in MantisNXT tools
 */
export function registerBuiltInTools(): void {
  const allTools = [...inventoryTools, ...supplierTools, ...orderTools, ...analyticsTools];

  for (const tool of allTools) {
    toolRegistry.registerTool({
      ...tool,
      version: '1.0.0',
      metadata: {
        builtIn: true,
        category: tool.category,
        source: 'mantis-nxt',
      },
    });
  }
}

/**
 * Get system context for AI assistant (convenience function)
 */
export async function getSystemContextForAI(orgId: string) {
  return await getSystemContext(orgId);
}

// Export tool definitions for external use
export const builtInToolDefinitions = {
  inventory: inventoryTools,
  suppliers: supplierTools,
  orders: orderTools,
  analytics: analyticsTools,
};
