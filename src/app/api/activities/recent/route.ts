export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  sortByTimestamp,
  filterByDateRange,
  serializeTimestamp,
} from '@/lib/utils/date-utils'

type DatabaseModule = typeof import('@/lib/database')

let cachedPool: DatabaseModule['pool'] | null = null
let dbLoadError: string | null = null

async function resolvePool() {
  if (cachedPool) {
    return cachedPool
  }
  if (dbLoadError) {
    return null
  }
  try {
    const dbModule: DatabaseModule = await import('@/lib/database')
    cachedPool = dbModule.pool
    return cachedPool
  } catch (error) {
    dbLoadError = error instanceof Error ? error.message : 'Database connection unavailable'
    console.error('⚠️ Recent activities database unavailable:', error)
    return null
  }
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  entityName: string;
  timestamp: string;
  priority: "low" | "medium" | "high";
  status: string;
  metadata: Record<string, unknown>;
}

// Schema for filtering activities
const GetActivitiesSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  type: z.array(z.string()).optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const FALLBACK_ACTIVITIES: RecentActivity[] = [
  {
    id: 'sample_supplier_1',
    type: 'supplier_added',
    title: 'New Supplier Added',
    description: 'Supplier onboarding sample record',
    entityType: 'supplier',
    entityId: 'sample_supplier',
    entityName: 'Sample Supplier',
    timestamp: new Date().toISOString(),
    priority: 'medium',
    status: 'completed',
    metadata: {
      category: 'supplier_management',
      source: 'sample',
    },
  },
  {
    id: 'sample_inventory_1',
    type: 'inventory_update',
    title: 'Inventory Updated',
    description: 'Inventory update sample record',
    entityType: 'inventory',
    entityId: 'sample_inventory',
    entityName: 'Sample Inventory Item',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    priority: 'low',
    status: 'completed',
    metadata: {
      category: 'inventory_management',
      source: 'sample',
    },
  },
]

interface ActivityResult {
  items: RecentActivity[];
  isFallback: boolean;
  reason?: string;
}

// Generate real activities from database changes and events
async function generateRecentActivities(limit: number = 20): Promise<ActivityResult> {
  const pool = await resolvePool()
  if (!pool) {
    return {
      items: FALLBACK_ACTIVITIES.slice(0, limit),
      isFallback: true,
      reason: dbLoadError ?? 'Database connection is not configured',
    }
  }
  try {
    // Get recent supplier additions/updates using core schema
    const supplierActivitiesQuery = `
      SELECT
        'supplier' as entity_type,
        'supplier_added' as activity_type,
        s.supplier_id as id,
        s.name,
        s.created_at as timestamp,
        'New supplier added: ' || s.name as description
      FROM core.supplier s
      WHERE s.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY s.created_at DESC
      LIMIT 10
    `;

    // Get recent inventory updates using core schema
    const inventoryActivitiesQuery = `
      SELECT
        'inventory' as entity_type,
        'inventory_update' as activity_type,
        soh.soh_id as id,
        COALESCE(p.name, sp.name_from_supplier) as name,
        soh.created_at as timestamp,
        'Inventory updated: ' || COALESCE(p.name, sp.name_from_supplier) || ' (Stock: ' || soh.qty || ')' as description
      FROM core.stock_on_hand soh
      JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
      LEFT JOIN core.product p ON p.product_id = sp.product_id
      WHERE soh.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY soh.created_at DESC
      LIMIT 10
    `;

    // Get new inventory items using core schema
    const newInventoryQuery = `
      SELECT
        'inventory' as entity_type,
        'item_added' as activity_type,
        sp.supplier_product_id as id,
        sp.name_from_supplier as name,
        sp.created_at as timestamp,
        'New item added: ' || sp.name_from_supplier || ' (' || sp.supplier_sku || ')' as description
      FROM core.supplier_product sp
      WHERE sp.created_at >= NOW() - INTERVAL '14 days'
      ORDER BY sp.created_at DESC
      LIMIT 5
    `;

    const [supplierResult, inventoryResult, newInventoryResult] = await Promise.all([
      pool.query(supplierActivitiesQuery),
      pool.query(inventoryActivitiesQuery),
      pool.query(newInventoryQuery),
    ])

    const activities: RecentActivity[] = []

    // Add supplier activities
    supplierResult.rows.forEach((row) => {
      activities.push({
        id: `supplier_${row.id}_${Date.parse(row.timestamp)}`,
        type: "supplier_added",
        title: "New Supplier Added",
        description: row.description,
        entityType: "supplier",
        entityId: row.id,
        entityName: row.name,
        timestamp: serializeTimestamp(row.timestamp),
        priority: "medium",
        status: "completed",
        metadata: {
          category: "supplier_management",
          source: "system",
        },
      })
    })

    // Add inventory update activities
    inventoryResult.rows.forEach((row) => {
      activities.push({
        id: `inventory_update_${row.id}_${Date.parse(row.timestamp)}`,
        type: "inventory_update",
        title: "Inventory Updated",
        description: row.description,
        entityType: "inventory",
        entityId: row.id,
        entityName: row.name,
        timestamp: serializeTimestamp(row.timestamp),
        priority: "low",
        status: "completed",
        metadata: {
          category: "inventory_management",
          source: "system",
        },
      });
    });

    // Add new inventory item activities
    newInventoryResult.rows.forEach((row) => {
      activities.push({
        id: `item_added_${row.id}_${Date.parse(row.timestamp)}`,
        type: "item_added",
        title: "New Item Added",
        description: row.description,
        entityType: "inventory",
        entityId: row.id,
        entityName: row.name,
        timestamp: serializeTimestamp(row.timestamp),
        priority: "medium",
        status: "completed",
        metadata: {
          category: "inventory_management",
          source: "system",
        },
      });
    });

    // Sort by timestamp (most recent first) and limit
    const sortedActivities = sortByTimestamp(activities, 'desc')
    return { items: sortedActivities.slice(0, limit), isFallback: false }
  } catch (error) {
    console.error('Error generating activities:', error)
    return {
      items: FALLBACK_ACTIVITIES.slice(0, limit),
      isFallback: true,
      reason: error instanceof Error ? error.message : 'Failed to query recent activities',
    }
  }
}

// GET /api/activities/recent - Get recent system activities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const queryParams = {
      limit: parseInt(searchParams.get("limit") || "20"),
      offset: parseInt(searchParams.get("offset") || "0"),
      type: searchParams.get("type")?.split(",") || undefined,
      userId: searchParams.get("userId") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    };

    const validatedParams = GetActivitiesSchema.parse(queryParams);

    // Generate real activities from database
    const activityResult = await generateRecentActivities(
      validatedParams.limit + validatedParams.offset
    )

    // Apply filters
    let filteredActivities = activityResult.items

    // Filter by activity type
    if (validatedParams.type && validatedParams.type.length > 0) {
      filteredActivities = filteredActivities.filter((activity) =>
        validatedParams.type!.includes(activity.type)
      );
    }

    // Filter by date range using utility function
    filteredActivities = filterByDateRange(
      filteredActivities,
      validatedParams.dateFrom,
      validatedParams.dateTo
    );

    // Apply pagination
    const paginatedActivities = filteredActivities.slice(
      validatedParams.offset,
      validatedParams.offset + validatedParams.limit
    );

    // Calculate metrics
    const metrics = {
      totalActivities: filteredActivities.length,
      activitiesByType: {
        supplier_added: filteredActivities.filter(
          (a) => a.type === "supplier_added"
        ).length,
        inventory_update: filteredActivities.filter(
          (a) => a.type === "inventory_update"
        ).length,
        item_added: filteredActivities.filter((a) => a.type === "item_added")
          .length,
        price_change: filteredActivities.filter(
          (a) => a.type === "price_change"
        ).length,
        delivery_received: filteredActivities.filter(
          (a) => a.type === "delivery_received"
        ).length,
        contract_signed: filteredActivities.filter(
          (a) => a.type === "contract_signed"
        ).length,
      },
      activitiesByPriority: {
        high: filteredActivities.filter((a) => a.priority === "high").length,
        medium: filteredActivities.filter((a) => a.priority === "medium")
          .length,
        low: filteredActivities.filter((a) => a.priority === "low").length,
      },
    };

    console.log(`📊 Retrieved ${paginatedActivities.length} recent activities`);

    return NextResponse.json({
      success: true,
      data: paginatedActivities,
      pagination: {
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        total: filteredActivities.length,
        hasMore:
          validatedParams.offset + validatedParams.limit <
          filteredActivities.length,
      },
      metrics,
      metadata: activityResult.isFallback
        ? {
            fallback: true,
            reason: activityResult.reason,
          }
        : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Error fetching recent activities:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
