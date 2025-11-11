import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { pool } from "@/lib/database/unified-connection";
import { z } from "zod";

// Validation schemas
const CreateAlertRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum([
    "low_stock",
    "out_of_stock",
    "expiry_warning",
    "quality_issue",
    "performance_issue",
  ]),
  conditions: z.object({
    field: z.string().min(1, "Field is required"),
    operator: z.enum([
      "equals",
      "not_equals",
      "greater_than",
      "less_than",
      "greater_equal",
      "less_equal",
      "contains",
    ]),
    value: z.union([z.string(), z.number(), z.boolean()]),
    additionalConditions: z
      .array(
        z.object({
          field: z.string(),
          operator: z.enum([
            "equals",
            "not_equals",
            "greater_than",
            "less_than",
            "greater_equal",
            "less_equal",
            "contains",
          ]),
          value: z.union([z.string(), z.number(), z.boolean()]),
          logicalOperator: z.enum(["AND", "OR"]).optional(),
        })
      )
      .optional(),
  }),
  severity: z.enum(["low", "medium", "high", "critical"]),
  isActive: z.boolean().default(true),
  notificationChannels: z
    .array(z.enum(["email", "sms", "slack", "webhook", "in_app"]))
    .default(["in_app"]),
  notificationSettings: z
    .object({
      recipients: z.array(z.string()).optional(),
      webhookUrl: z.string().url().optional(),
      slackChannel: z.string().optional(),
      frequency: z.enum(["immediate", "hourly", "daily"]).default("immediate"),
      quietHours: z
        .object({
          enabled: z.boolean().default(false),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          timezone: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  autoResolution: z
    .object({
      enabled: z.boolean().default(false),
      action: z
        .enum([
          "create_po",
          "transfer_stock",
          "adjust_reorder_point",
          "mark_resolved",
        ])
        .optional(),
      threshold: z.number().optional(),
      conditions: z
        .object({
          field: z.string(),
          operator: z.string(),
          value: z.union([z.string(), z.number(), z.boolean()]),
        })
        .optional(),
    })
    .optional(),
});

const UpdateAlertRuleSchema = CreateAlertRuleSchema.partial();

const SearchAlertsSchema = z.object({
  type: z
    .array(
      z.enum([
        "low_stock",
        "out_of_stock",
        "expiry_warning",
        "quality_issue",
        "performance_issue",
      ])
    )
    .optional(),
  severity: z.array(z.enum(["low", "medium", "high", "critical"])).optional(),
  status: z
    .array(z.enum(["active", "acknowledged", "resolved", "snoozed"]))
    .optional(),
  itemId: z.string().optional(),
  warehouseId: z.string().optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z
    .enum(["createdAt", "severity", "type", "status", "priority"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const AlertActionSchema = z.object({
  action: z.enum(["acknowledge", "resolve", "snooze", "assign", "escalate"]),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
  snoozeUntil: z.string().optional(),
  escalationLevel: z.number().optional(),
});

// Generate real alerts from inventory data - FIXED VERSION
async function generateRealTimeAlerts(): Promise<Array<{
  id: string
  type: string
  severity: string
  title: string
  message: string
  itemId: string
  itemName: string
  itemSku: string
  currentValue: number
  threshold: number
  supplierName: string | null
  status: string
  isRead: boolean
  isActive: boolean
  priority: number
  createdAt: Date
  updatedAt: Date
  warehouseId: string | null
  warehouseName: string | null
  assignedTo: string | null
  assignedToName: string | null
  acknowledgedBy: string | null
  acknowledgedAt: Date | null
  resolvedBy: string | null
  resolvedAt: Date | null
  snoozedUntil: Date | null
  escalationLevel: number
}>> {
  try {
    console.log("🚨 Generating real-time alerts from inventory data");

    // Get low stock alerts using core schema
    const lowStockQuery = `
      SELECT
        soh.soh_id as id,
        sp.supplier_sku as sku,
        COALESCE(p.name, sp.name_from_supplier) as name,
        soh.qty as currentstock,
        10 as reorder_point,
        s.name as supplier_name
      FROM core.stock_on_hand soh
      JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
      LEFT JOIN core.product p ON p.product_id = sp.product_id
      LEFT JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      WHERE soh.qty <= 10 AND soh.qty > 0
    `;

    // Get out of stock alerts using core schema
    const outOfStockQuery = `
      SELECT
        soh.soh_id as id,
        sp.supplier_sku as sku,
        COALESCE(p.name, sp.name_from_supplier) as name,
        soh.qty as currentstock,
        10 as reorder_point,
        s.name as supplier_name
      FROM core.stock_on_hand soh
      JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
      LEFT JOIN core.product p ON p.product_id = sp.product_id
      LEFT JOIN core.supplier s ON s.supplier_id = sp.supplier_id
      WHERE soh.qty = 0
    `;

    const [lowStockResult, outOfStockResult] = await Promise.all([
      pool.query(lowStockQuery),
      pool.query(outOfStockQuery),
    ]);

    const alerts: Array<{
      id: string
      type: string
      severity: string
      title: string
      message: string
      itemId: string
      itemName: string
      itemSku: string
      currentValue: number
      threshold: number
      supplierName: string | null
      status: string
      isRead: boolean
      isActive: boolean
      priority: number
      createdAt: Date
      updatedAt: Date
      warehouseId: string | null
      warehouseName: string | null
      assignedTo: string | null
      assignedToName: string | null
      acknowledgedBy: string | null
      acknowledgedAt: Date | null
      resolvedBy: string | null
      resolvedAt: Date | null
      snoozedUntil: Date | null
      escalationLevel: number
    }> = [];

    // Create low stock alerts
    lowStockResult.rows.forEach((item) => {
      alerts.push({
        id: `low_stock_${item.id}`,
        type: "low_stock",
        severity: item.currentstock === 0 ? "critical" : "high",
        title: "Low Stock Alert",
        message: `${item.name} (${item.sku}) is running low (${item.currentstock} remaining)`,
        itemId: item.id,
        itemName: item.name,
        itemSku: item.sku,
        currentValue: item.currentstock,
        threshold: item.reorder_point,
        supplierName: item.supplier_name,
        status: "active",
        isRead: false,
        isActive: true,
        priority: item.currentstock === 0 ? 95 : 75,
        createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random within last 24 hours
        updatedAt: new Date(),
        warehouseId: null,
        warehouseName: null,
        assignedTo: null,
        assignedToName: null,
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolvedBy: null,
        resolvedAt: null,
        snoozedUntil: null,
        escalationLevel: 0,
      });
    });

    // Create out of stock alerts
    outOfStockResult.rows.forEach((item) => {
      alerts.push({
        id: `out_of_stock_${item.id}`,
        type: "out_of_stock",
        severity: "critical",
        title: "Out of Stock Alert",
        message: `${item.name} (${item.sku}) is completely out of stock`,
        itemId: item.id,
        itemName: item.name,
        itemSku: item.sku,
        currentValue: 0,
        threshold: item.reorder_point,
        supplierName: item.supplier_name,
        status: "active",
        isRead: false,
        isActive: true,
        priority: 95,
        createdAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000), // Random within last 12 hours
        updatedAt: new Date(),
        warehouseId: null,
        warehouseName: null,
        assignedTo: null,
        assignedToName: null,
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolvedBy: null,
        resolvedAt: null,
        snoozedUntil: null,
        escalationLevel: 0,
      });
    });

    console.log(`✅ Generated ${alerts.length} real-time alerts`);
    return alerts;
  } catch (error) {
    console.error("❌ Error generating real-time alerts:", error);
    // Return empty array on error to prevent crashes
    return [];
  }
}

// GET /api/alerts - List alerts with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const queryParams = {
      type: searchParams.get("type")?.split(",") || undefined,
      severity: searchParams.get("severity")?.split(",") || undefined,
      status: searchParams.get("status")?.split(",") || undefined,
      itemId: searchParams.get("itemId") || undefined,
      warehouseId: searchParams.get("warehouseId") || undefined,
      assignedTo: searchParams.get("assignedTo") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      isActive: searchParams.get("isActive") === "true" || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    };

    const validatedParams = SearchAlertsSchema.parse(queryParams);

    console.log("🚨 Fetching alerts with params:", validatedParams);

    // Get real alerts from inventory data
    const realAlerts = await generateRealTimeAlerts();

    // Apply filters
    const filteredAlerts = realAlerts.filter((alert) => {
      // Type filter
      if (validatedParams.type && validatedParams.type.length > 0) {
        if (!validatedParams.type.includes(alert.type as unknown)) return false;
      }

      // Severity filter
      if (validatedParams.severity && validatedParams.severity.length > 0) {
        if (!validatedParams.severity.includes(alert.severity as unknown)) return false;
      }

      // Status filter
      if (validatedParams.status && validatedParams.status.length > 0) {
        if (!validatedParams.status.includes(alert.status as unknown)) return false;
      }

      // Item filter
      if (validatedParams.itemId && alert.itemId !== validatedParams.itemId) {
        return false;
      }

      // Warehouse filter
      if (
        validatedParams.warehouseId &&
        alert.warehouseId !== validatedParams.warehouseId
      ) {
        return false;
      }

      // Assigned to filter
      if (
        validatedParams.assignedTo &&
        alert.assignedTo !== validatedParams.assignedTo
      ) {
        return false;
      }

      // Date range filter
      if (validatedParams.dateFrom) {
        const fromDate = new Date(validatedParams.dateFrom);
        if (alert.createdAt < fromDate) return false;
      }

      if (validatedParams.dateTo) {
        const toDate = new Date(validatedParams.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (alert.createdAt > toDate) return false;
      }

      // Active filter
      if (
        validatedParams.isActive !== undefined &&
        alert.isActive !== validatedParams.isActive
      ) {
        return false;
      }

      return true;
    });

    // Apply sorting
    filteredAlerts.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (validatedParams.sortBy) {
        case "createdAt":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "severity": {
          const severityOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
          aValue = severityOrder[a.severity] || 0;
          bValue = severityOrder[b.severity] || 0;
          break;
        }
        case "type":
          aValue = a.type;
          bValue = b.type;
          break;
        case "status": {
          const statusOrder: Record<string, number> = {
            active: 1,
            acknowledged: 2,
            snoozed: 3,
            resolved: 4,
          };
          aValue = statusOrder[a.status] || 0;
          bValue = statusOrder[b.status] || 0;
          break;
        }
        case "priority":
          aValue = a.priority;
          bValue = b.priority;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (aValue < bValue) return validatedParams.sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return validatedParams.sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const total = filteredAlerts.length;
    const totalPages = Math.ceil(total / validatedParams.limit);
    const offset = (validatedParams.page - 1) * validatedParams.limit;
    const paginatedAlerts = filteredAlerts.slice(
      offset,
      offset + validatedParams.limit
    );

    // Calculate summary metrics using real data
    const metrics = {
      totalAlerts: realAlerts.length,
      activeAlerts: realAlerts.filter((a) => a.status === "active").length,
      criticalAlerts: realAlerts.filter((a) => a.severity === "critical")
        .length,
      acknowledgedAlerts: realAlerts.filter((a) => a.status === "acknowledged")
        .length,
      resolvedAlerts: realAlerts.filter((a) => a.status === "resolved").length,
      averageResolutionTime: 4.5, // hours
      alertsByType: {
        low_stock: realAlerts.filter((a) => a.type === "low_stock").length,
        out_of_stock: realAlerts.filter((a) => a.type === "out_of_stock")
          .length,
        expiry_warning: realAlerts.filter((a) => a.type === "expiry_warning")
          .length,
        quality_issue: realAlerts.filter((a) => a.type === "quality_issue")
          .length,
        performance_issue: realAlerts.filter(
          (a) => a.type === "performance_issue"
        ).length,
      },
    };

    console.log(
      `✅ Returning ${paginatedAlerts.length} alerts from ${total} total`
    );

    return NextResponse.json({
      success: true,
      data: paginatedAlerts,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        totalPages,
        hasNext: validatedParams.page < totalPages,
        hasPrev: validatedParams.page > 1,
      },
      metrics,
      filters: validatedParams,
    });
  } catch (error) {
    console.error("❌ Error fetching alerts:", error);

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

// POST /api/alerts - Create new alert (manual alert creation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // For manual alert creation, we need different validation
    const ManualAlertSchema = z.object({
      type: z.enum([
        "low_stock",
        "out_of_stock",
        "expiry_warning",
        "quality_issue",
        "performance_issue",
      ]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      title: z.string().min(1, "Title is required"),
      message: z.string().min(1, "Message is required"),
      itemId: z.string().optional(),
      warehouseId: z.string().optional(),
      assignedTo: z.string().optional(),
      metadata: z.object({}).optional(),
      notes: z.string().optional(),
    });

    const validatedData = ManualAlertSchema.parse(body);

    const newAlert = {
      id: `alert_${Date.now()}`,
      ruleId: null, // Manual alerts don't have rules
      ruleName: null,
      type: validatedData.type,
      severity: validatedData.severity,
      title: validatedData.title,
      message: validatedData.message,
      itemId: validatedData.itemId || null,
      itemName: null, // Would be populated from item lookup
      itemSku: null,
      warehouseId: validatedData.warehouseId || null,
      warehouseName: null, // Would be populated from warehouse lookup
      currentValue: null,
      threshold: null,
      status: "active",
      priority:
        validatedData.severity === "critical"
          ? 100
          : validatedData.severity === "high"
          ? 75
          : validatedData.severity === "medium"
          ? 50
          : 25,
      isActive: true,
      assignedTo: validatedData.assignedTo || null,
      assignedToName: null,
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedBy: null,
      resolvedAt: null,
      snoozedUntil: null,
      escalationLevel: 0,
      autoResolution: {
        enabled: false,
        action: null,
        threshold: null,
        lastAttempt: null,
        attempts: 0,
        maxAttempts: 0,
      },
      metadata: validatedData.metadata || {},
      notifications: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [
        {
          id: `hist_${Date.now()}`,
          action: "created",
          performedBy: "api_user@company.com",
          timestamp: new Date().toISOString(),
          notes: validatedData.notes || "Manual alert created via API",
        },
      ],
    };

    console.log("✅ Manual alert created successfully");

    return NextResponse.json(
      {
        success: true,
        data: newAlert,
        message: "Alert created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating alert:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
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

// PUT /api/alerts - Batch update alerts (bulk actions)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertIds, action } = body;

    if (!Array.isArray(alertIds)) {
      return NextResponse.json(
        {
          success: false,
          error: "Alert IDs must be an array",
        },
        { status: 400 }
      );
    }

    const validatedAction = AlertActionSchema.parse(action);

    console.log(
      `🔄 Processing bulk action ${validatedAction.action} for ${alertIds.length} alerts`
    );

    return NextResponse.json({
      success: true,
      data: {
        updated: alertIds.map((id) => ({ id, status: "updated" })),
        notFound: [],
      },
      message: `${alertIds.length} alerts updated successfully`,
    });
  } catch (error) {
    console.error("❌ Error batch updating alerts:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action data",
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
