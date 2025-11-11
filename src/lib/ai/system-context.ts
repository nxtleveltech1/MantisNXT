/**
 * AI Assistant System Context Provider
 *
 * Provides FULL system access to AI assistant for answering questions
 * about suppliers, inventory, customers, analytics, and all system data
 */

import { query } from '@/lib/database';

export interface SystemContext {
  suppliers: {
    total: number;
    active: number;
    topSuppliers: unknown[];
  };
  inventory: {
    total: number;
    lowStock: number;
    outOfStock: number;
    recentMovements: unknown[];
  };
  customers: {
    total: number;
    totalLoyaltyMembers: number;
    recentCustomers: unknown[];
  };
  alerts: {
    critical: number;
    high: number;
    anomalies: unknown[];
  };
  recentActivity: unknown[];
}

/**
 * Get comprehensive system context for AI assistant
 */
export async function getSystemContext(orgId: string): Promise<SystemContext> {
  // Supplier data
  const supplierStats = await query(
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active
    FROM public.suppliers
    WHERE organization_id = $1`,
    [orgId]
  );

  const topSuppliers = await query(
    `SELECT id, name, status, performance_score, total_orders
    FROM public.suppliers
    WHERE organization_id = $1 AND status = 'active'
    ORDER BY performance_score DESC NULLS LAST, total_orders DESC NULLS LAST
    LIMIT 10`,
    [orgId]
  );

  // Inventory data
  const inventoryStats = await query(
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE quantity <= reorder_point AND reorder_point > 0) as low_stock,
      COUNT(*) FILTER (WHERE quantity = 0) as out_of_stock
    FROM inventory_items
    WHERE organization_id = $1`,
    [orgId]
  );

  const recentMovements = await query(
    `SELECT
      m.id, m.movement_type, m.quantity, m.reference_number, m.created_at,
      i.name as item_name, i.sku
    FROM inventory_movements m
    JOIN inventory_items i ON m.item_id = i.id
    WHERE m.organization_id = $1
    ORDER BY m.created_at DESC
    LIMIT 20`,
    [orgId]
  );

  // Customer data
  const customerStats = await query(
    `SELECT
      (SELECT COUNT(*) FROM customers WHERE organization_id = $1) as total,
      (SELECT COUNT(*) FROM loyalty_members WHERE organization_id = $1) as loyalty_members`,
    [orgId]
  );

  const recentCustomers = await query(
    `SELECT id, email, first_name, last_name, created_at
    FROM customers
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 10`,
    [orgId]
  );

  // Alerts and anomalies
  const alertStats = await query(
    `SELECT
      COUNT(*) FILTER (WHERE severity = 'critical' AND status != 'resolved') as critical,
      COUNT(*) FILTER (WHERE severity = 'high' AND status != 'resolved') as high
    FROM analytics_alerts
    WHERE organization_id = $1`,
    [orgId]
  );

  const recentAnomalies = await query(
    `SELECT id, entity_type, entity_id, anomaly_type, severity, description, detected_at
    FROM analytics_anomalies
    WHERE organization_id = $1 AND status != 'resolved'
    ORDER BY detected_at DESC
    LIMIT 10`,
    [orgId]
  );

  return {
    suppliers: {
      total: parseInt(supplierStats.rows[0]?.total || '0'),
      active: parseInt(supplierStats.rows[0]?.active || '0'),
      topSuppliers: topSuppliers.rows,
    },
    inventory: {
      total: parseInt(inventoryStats.rows[0]?.total || '0'),
      lowStock: parseInt(inventoryStats.rows[0]?.low_stock || '0'),
      outOfStock: parseInt(inventoryStats.rows[0]?.out_of_stock || '0'),
      recentMovements: recentMovements.rows,
    },
    customers: {
      total: parseInt(customerStats.rows[0]?.total || '0'),
      totalLoyaltyMembers: parseInt(customerStats.rows[0]?.loyalty_members || '0'),
      recentCustomers: recentCustomers.rows,
    },
    alerts: {
      critical: parseInt(alertStats.rows[0]?.critical || '0'),
      high: parseInt(alertStats.rows[0]?.high || '0'),
      anomalies: recentAnomalies.rows,
    },
    recentActivity: recentMovements.rows.slice(0, 10),
  };
}

/**
 * Search suppliers by query
 */
export async function searchSuppliers(orgId: string, searchQuery: string, limit = 10) {
  return await query(
    `SELECT id, name, status, contact_email, phone, address, performance_score
    FROM public.suppliers
    WHERE organization_id = $1
      AND (name ILIKE $2 OR contact_email ILIKE $2 OR address ILIKE $2)
    ORDER BY performance_score DESC NULLS LAST
    LIMIT $3`,
    [orgId, `%${searchQuery}%`, limit]
  );
}

/**
 * Search inventory items by query
 */
export async function searchInventory(orgId: string, searchQuery: string, limit = 10) {
  return await query(
    `SELECT id, name, sku, quantity, unit_price, reorder_point, category
    FROM inventory_items
    WHERE organization_id = $1
      AND (name ILIKE $2 OR sku ILIKE $2 OR category ILIKE $2)
    ORDER BY name
    LIMIT $3`,
    [orgId, `%${searchQuery}%`, limit]
  );
}

/**
 * Search customers by query
 */
export async function searchCustomers(orgId: string, searchQuery: string, limit = 10) {
  return await query(
    `SELECT id, email, first_name, last_name, phone, created_at
    FROM customers
    WHERE organization_id = $1
      AND (email ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2 OR phone ILIKE $2)
    ORDER BY created_at DESC
    LIMIT $3`,
    [orgId, `%${searchQuery}%`, limit]
  );
}

/**
 * Get inventory status summary
 */
export async function getInventoryStatus(orgId: string) {
  const status = await query(
    `SELECT
      COUNT(*) as total_items,
      SUM(quantity) as total_quantity,
      SUM(quantity * unit_price) as total_value,
      COUNT(*) FILTER (WHERE quantity <= reorder_point AND reorder_point > 0) as low_stock_items,
      COUNT(*) FILTER (WHERE quantity = 0) as out_of_stock_items,
      COUNT(DISTINCT category) as total_categories
    FROM inventory_items
    WHERE organization_id = $1`,
    [orgId]
  );

  return status.rows[0];
}

/**
 * Get customer insights
 */
export async function getCustomerInsights(orgId: string) {
  const insights = await query(
    `SELECT
      COUNT(*) as total_customers,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_customers_30d,
      (SELECT COUNT(*) FROM loyalty_members WHERE organization_id = $1) as loyalty_members,
      (SELECT SUM(points_balance) FROM loyalty_members WHERE organization_id = $1) as total_loyalty_points
    FROM customers
    WHERE organization_id = $1`,
    [orgId]
  );

  return insights.rows[0];
}

/**
 * Get unresolved alerts
 */
export async function getUnresolvedAlerts(orgId: string) {
  const alerts = await query(
    `SELECT
      id, alert_type, severity, title, description,
      entity_type, entity_id, status, created_at
    FROM analytics_alerts
    WHERE organization_id = $1 AND status != 'resolved'
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      created_at DESC
    LIMIT 50`,
    [orgId]
  );

  return alerts.rows;
}

/**
 * Execute custom SQL query (for AI assistant advanced queries)
 * RESTRICTED to SELECT only for safety
 */
export async function executeCustomQuery(orgId: string, sqlQuery: string) {
  // Security: Only allow SELECT queries
  const trimmedQuery = sqlQuery.trim().toUpperCase();
  if (!trimmedQuery.startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed');
  }

  // Inject organization_id filter if not present
  if (!sqlQuery.toLowerCase().includes('organization_id')) {
    throw new Error('Query must include organization_id filter');
  }

  return await query(sqlQuery);
}
