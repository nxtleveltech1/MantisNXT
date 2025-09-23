/**
 * Enhanced Suppliers API v2 with authentication, validation, and comprehensive features
 */

import { NextRequest } from "next/server";
import { ApiMiddleware, RequestContext } from "@/lib/api/middleware";
import {
  CreateSupplierSchema,
  UpdateSupplierSchema,
  SupplierSearchSchema,
  BulkOperationSchema,
  EnhancedSupplier,
} from "@/lib/api/validation";

// Enhanced mock supplier database - 22 South African Suppliers
let mockSupplierData: EnhancedSupplier[] = [
  {
    id: "SUP-1001",
    name: "BK Percussion",
    code: "BKPRC",
    email: "sarah@bkpercussion.co.za",
    phone: "+27 11 234 5678",
    website: "https://www.bkpercussion.co.za",
    taxId: "1234567890",
    registrationNumber: "2010/123456/07",
    vatNumber: "VAT123456789",
    address: {
      street: "123 Music Street",
      city: "Johannesburg",
      state: "Gauteng",
      postalCode: "2000",
      country: "South Africa",
    },
    contacts: [
      {
        id: "contact_001",
        name: "Sarah Mitchell",
        role: "Sales Manager",
        email: "sarah@bkpercussion.co.za",
        phone: "+27 11 234 5678",
        department: "Sales",
        isPrimary: true,
        isActive: true,
      },
    ],
    paymentTerms: {
      method: "bank_transfer",
      termsDays: 30,
      discountPercent: 2,
      discountDays: 10,
      currency: "ZAR",
    },
    leadTimeDays: 14,
    minimumOrderValue: 5000,
    currency: "ZAR",
    category: "Musical Instruments",
    tier: "strategic",
    performance: {
      onTimeDeliveryRate: 94,
      qualityRating: 4.8,
      responsiveness: 4.7,
      overallRating: 4.7,
      totalOrders: 45,
      totalValue: 850000,
      averageOrderValue: 18900,
      lastOrderDate: "2024-01-18T08:00:00Z",
      defectRate: 1.2,
      returnRate: 0.8,
    },
    compliance: {
      certifications: ["ISO 9001", "ISO 14001", "SOC 2"],
      lastAuditDate: "2024-06-15T10:00:00Z",
      nextAuditDate: "2025-06-15T10:00:00Z",
      complianceScore: 95,
      riskLevel: "low",
    },
    tags: ["electronics", "computers", "enterprise", "preferred"],
    notes:
      "Preferred supplier for laptop and desktop computers. Excellent support and warranty terms.",
    customFields: {
      account_manager: "Sarah Johnson",
      preferred_shipping: "Express",
      volume_discount_tier: "Gold",
    },
    isActive: true,
    status: "active",
    createdBy: "admin@company.com",
    updatedBy: "admin@company.com",
  },
  {
    id: "sup_002",
    name: "HP Inc.",
    code: "HP",
    email: "business@hp.com",
    phone: "+1-650-857-1501",
    website: "https://www.hp.com",
    taxId: "US987654321",
    registrationNumber: "HP-REG-002",
    address: {
      street: "1501 Page Mill Road",
      city: "Palo Alto",
      state: "CA",
      postalCode: "94304",
      country: "USA",
    },
    contacts: [
      {
        id: "contact_003",
        name: "Jennifer Williams",
        role: "Regional Sales Manager",
        email: "jennifer.williams@hp.com",
        phone: "+1-650-555-0156",
        department: "Sales",
        isPrimary: true,
        isActive: true,
      },
    ],
    paymentTerms: {
      method: "bank_transfer",
      termsDays: 45,
      discountPercent: 1.5,
      discountDays: 15,
      currency: "USD",
    },
    leadTimeDays: 10,
    minimumOrderValue: 500,
    currency: "USD",
    category: "Technology Hardware",
    tier: "preferred",
    performance: {
      onTimeDeliveryRate: 95.2,
      qualityRating: 4.6,
      responsiveness: 4.5,
      overallRating: 4.4,
      totalOrders: 89,
      totalValue: 1800000,
      averageOrderValue: 20224,
      lastOrderDate: "2024-09-10T14:30:00Z",
      defectRate: 1.2,
      returnRate: 2.1,
    },
    compliance: {
      certifications: ["ISO 9001", "EPEAT Gold"],
      lastAuditDate: "2024-03-20T09:00:00Z",
      nextAuditDate: "2025-03-20T09:00:00Z",
      complianceScore: 88,
      riskLevel: "low",
    },
    tags: ["electronics", "printers", "laptops", "approved"],
    notes: "Good for printing solutions and business laptops.",
    customFields: {
      warranty_terms: "Standard 1 year",
      special_pricing: "Education discount available",
    },
    isActive: true,
    status: "active",
    createdBy: "manager@company.com",
    updatedBy: "admin@company.com",
  },
];

// Helper functions
function calculateSupplierMetrics(suppliers: EnhancedSupplier[]) {
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s) => s.isActive).length;
  const averageLeadTime =
    suppliers.length > 0
      ? suppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) / suppliers.length
      : 0;
  const averageRating =
    suppliers.length > 0
      ? suppliers.reduce(
          (sum, s) => sum + (s.performance?.overallRating || 0),
          0
        ) / suppliers.length
      : 0;
  const totalOrderValue = suppliers.reduce(
    (sum, s) => sum + (s.performance?.totalValue || 0),
    0
  );

  const tierDistribution = suppliers.reduce((acc, s) => {
    const tier = s.tier || "unspecified";
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryDistribution = suppliers.reduce((acc, s) => {
    acc[s.address.country] = (acc[s.address.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryDistribution = suppliers.reduce((acc, s) => {
    const category = s.category || "unspecified";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalSuppliers,
    activeSuppliers,
    averageLeadTime: Math.round(averageLeadTime * 10) / 10,
    averageRating: Math.round(averageRating * 10) / 10,
    totalOrderValue,
    tierDistribution,
    countryDistribution,
    categoryDistribution,
    lastUpdated: new Date().toISOString(),
  };
}

function applySupplierFilters(suppliers: EnhancedSupplier[], filters: any) {
  return suppliers.filter((supplier) => {
    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const searchFields = [
        supplier.name,
        supplier.code,
        supplier.email,
        supplier.address.city,
        supplier.address.country,
        supplier.category,
        ...supplier.tags,
      ].filter(Boolean);

      const matches = searchFields.some((field) =>
        field?.toLowerCase().includes(query)
      );
      if (!matches) return false;
    }

    // Status filter
    if (
      filters.isActive !== undefined &&
      supplier.isActive !== filters.isActive
    ) {
      return false;
    }

    // Status array filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(supplier.status)) return false;
    }

    // Location filters
    if (filters.country && supplier.address.country !== filters.country)
      return false;
    if (filters.state && supplier.address.state !== filters.state) return false;
    if (filters.city && supplier.address.city !== filters.city) return false;

    // Payment method filter
    if (filters.paymentMethod && filters.paymentMethod.length > 0) {
      if (!filters.paymentMethod.includes(supplier.paymentTerms.method))
        return false;
    }

    // Tier filter
    if (filters.tier && filters.tier.length > 0) {
      if (!supplier.tier || !filters.tier.includes(supplier.tier)) return false;
    }

    // Category filter
    if (filters.category && supplier.category !== filters.category)
      return false;

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((tag: string) =>
        supplier.tags.some((supplierTag) =>
          supplierTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (!hasMatchingTag) return false;
    }

    // Lead time filters
    if (
      filters.minLeadTime !== undefined &&
      supplier.leadTimeDays < filters.minLeadTime
    )
      return false;
    if (
      filters.maxLeadTime !== undefined &&
      supplier.leadTimeDays > filters.maxLeadTime
    )
      return false;

    // Rating filters
    if (
      filters.minRating !== undefined &&
      (supplier.performance?.overallRating || 0) < filters.minRating
    )
      return false;
    if (
      filters.maxRating !== undefined &&
      (supplier.performance?.overallRating || 0) > filters.maxRating
    )
      return false;

    // Currency filter
    if (filters.currency && supplier.currency !== filters.currency)
      return false;

    // Has contracts filter (simplified for demo)
    if (filters.hasContracts !== undefined) {
      const hasContracts = Math.random() > 0.5; // Mock implementation
      if (filters.hasContracts !== hasContracts) return false;
    }

    // Date filters for last order
    if (filters.lastOrderAfter && supplier.performance?.lastOrderDate) {
      if (
        new Date(supplier.performance.lastOrderDate) <
        new Date(filters.lastOrderAfter)
      )
        return false;
    }
    if (filters.lastOrderBefore && supplier.performance?.lastOrderDate) {
      if (
        new Date(supplier.performance.lastOrderDate) >
        new Date(filters.lastOrderBefore)
      )
        return false;
    }

    return true;
  });
}

function sortSuppliers(
  suppliers: EnhancedSupplier[],
  sortBy?: string,
  sortOrder: "asc" | "desc" = "asc"
) {
  if (!sortBy) return suppliers;

  return suppliers.sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "code":
        aValue = a.code.toLowerCase();
        bValue = b.code.toLowerCase();
        break;
      case "performance":
      case "rating":
        aValue = a.performance?.overallRating || 0;
        bValue = b.performance?.overallRating || 0;
        break;
      case "leadTime":
        aValue = a.leadTimeDays;
        bValue = b.leadTimeDays;
        break;
      case "lastOrder":
        aValue = new Date(a.performance?.lastOrderDate || 0);
        bValue = new Date(b.performance?.lastOrderDate || 0);
        break;
      case "totalValue":
        aValue = a.performance?.totalValue || 0;
        bValue = b.performance?.totalValue || 0;
        break;
      case "createdAt":
        aValue = new Date(a.createdAt || 0);
        bValue = new Date(b.createdAt || 0);
        break;
      case "updatedAt":
        aValue = new Date(a.updatedAt || 0);
        bValue = new Date(b.updatedAt || 0);
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });
}

// GET /api/v2/suppliers - List suppliers with advanced filtering and pagination
export const GET = ApiMiddleware.withValidation(SupplierSearchSchema, {
  validateQuery: true,
  validateBody: false,
})(async (request: NextRequest, context: RequestContext, params) => {
  try {
    // Apply filters
    let filteredSuppliers = applySupplierFilters(mockSupplierData, params);

    // Apply sorting
    filteredSuppliers = sortSuppliers(
      filteredSuppliers,
      params.sortBy,
      params.sortOrder
    );

    // Apply pagination
    const total = filteredSuppliers.length;
    const totalPages = Math.ceil(total / params.limit);
    const offset = (params.page - 1) * params.limit;
    const paginatedSuppliers = filteredSuppliers.slice(
      offset,
      offset + params.limit
    );

    // Calculate metrics
    const metrics = calculateSupplierMetrics(mockSupplierData);
    const filteredMetrics = calculateSupplierMetrics(filteredSuppliers);

    return ApiMiddleware.createSuccessResponse(
      {
        suppliers: paginatedSuppliers,
        metrics: {
          ...metrics,
          filtered: filteredMetrics,
        },
      },
      `Retrieved ${paginatedSuppliers.length} suppliers`,
      undefined,
      {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNext: params.page < totalPages,
        hasPrev: params.page > 1,
      }
    );
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    throw error;
  }
});

// POST /api/v2/suppliers - Create new supplier
export const POST = ApiMiddleware.withValidation(CreateSupplierSchema)(
  async (request: NextRequest, context: RequestContext, validatedData) => {
    try {
      // Check if code already exists
      const existingSupplier = mockSupplierData.find(
        (s) => s.code === validatedData.code
      );
      if (existingSupplier) {
        return ApiMiddleware.createErrorResponse(
          "Supplier code already exists",
          409,
          {
            code: validatedData.code,
            existingSupplierId: existingSupplier.id,
          }
        );
      }

      // Check if email already exists
      const existingEmail = mockSupplierData.find(
        (s) => s.email === validatedData.email
      );
      if (existingEmail) {
        return ApiMiddleware.createErrorResponse(
          "Supplier email already exists",
          409,
          {
            email: validatedData.email,
            existingSupplierId: existingEmail.id,
          }
        );
      }

      // Ensure only one primary contact
      const primaryContacts = validatedData.contacts.filter((c) => c.isPrimary);
      if (primaryContacts.length > 1) {
        return ApiMiddleware.createErrorResponse(
          "Only one primary contact is allowed",
          400
        );
      }

      // If no primary contact, set first one as primary
      if (primaryContacts.length === 0) {
        validatedData.contacts[0].isPrimary = true;
      }

      // Create new supplier
      const newSupplier: EnhancedSupplier = {
        id: `sup_${Date.now()}`,
        ...validatedData,
        contacts: validatedData.contacts.map((contact, index) => ({
          id: `contact_${Date.now()}_${index}`,
          ...contact,
        })),
        performance: {
          onTimeDeliveryRate: 0,
          qualityRating: 0,
          responsiveness: 0,
          overallRating: 0,
          totalOrders: 0,
          totalValue: 0,
          averageOrderValue: 0,
          lastOrderDate: undefined,
          defectRate: 0,
          returnRate: 0,
        },
        compliance: {
          certifications: [],
          lastAuditDate: undefined,
          nextAuditDate: undefined,
          complianceScore: 0,
          riskLevel: "medium",
        },
        customFields: validatedData.customFields || {},
        createdBy: context.user?.email,
        updatedBy: context.user?.email,
      };

      mockSupplierData.push(newSupplier);

      return ApiMiddleware.createSuccessResponse(
        newSupplier,
        "Supplier created successfully"
      );
    } catch (error) {
      console.error("Error creating supplier:", error);
      throw error;
    }
  }
);

// PUT /api/v2/suppliers - Batch update suppliers
export const PUT = ApiMiddleware.withBulkOperation()(
  async (request: NextRequest, context: RequestContext) => {
    try {
      const body = await request.json();
      const { suppliers } = body;

      if (!Array.isArray(suppliers)) {
        return ApiMiddleware.createErrorResponse(
          "Suppliers must be an array",
          400
        );
      }

      const updatedSuppliers = [];
      const errors = [];

      for (const updateData of suppliers) {
        try {
          const validatedData = UpdateSupplierSchema.parse(updateData);

          if (!validatedData.id) {
            errors.push({
              id: updateData.id,
              error: "ID is required for updates",
            });
            continue;
          }

          const supplierIndex = mockSupplierData.findIndex(
            (s) => s.id === validatedData.id
          );
          if (supplierIndex === -1) {
            errors.push({ id: validatedData.id, error: "Supplier not found" });
            continue;
          }

          // Check for code conflicts
          if (validatedData.code) {
            const existingSupplier = mockSupplierData.find(
              (s) => s.code === validatedData.code && s.id !== validatedData.id
            );
            if (existingSupplier) {
              errors.push({
                id: validatedData.id,
                error: "Supplier code already exists",
              });
              continue;
            }
          }

          // Check for email conflicts
          if (validatedData.email) {
            const existingEmail = mockSupplierData.find(
              (s) =>
                s.email === validatedData.email && s.id !== validatedData.id
            );
            if (existingEmail) {
              errors.push({
                id: validatedData.id,
                error: "Supplier email already exists",
              });
              continue;
            }
          }

          const existingSupplier = mockSupplierData[supplierIndex];
          const updatedSupplier: EnhancedSupplier = {
            ...existingSupplier,
            ...validatedData,
            // Merge nested objects properly
            address: validatedData.address
              ? { ...existingSupplier.address, ...validatedData.address }
              : existingSupplier.address,
            paymentTerms: validatedData.paymentTerms
              ? {
                  ...existingSupplier.paymentTerms,
                  ...validatedData.paymentTerms,
                }
              : existingSupplier.paymentTerms,
            performance: validatedData.performance
              ? {
                  ...existingSupplier.performance,
                  ...validatedData.performance,
                }
              : existingSupplier.performance,
            compliance: validatedData.compliance
              ? { ...existingSupplier.compliance, ...validatedData.compliance }
              : existingSupplier.compliance,
            contacts: validatedData.contacts || existingSupplier.contacts,
            customFields: validatedData.customFields
              ? {
                  ...existingSupplier.customFields,
                  ...validatedData.customFields,
                }
              : existingSupplier.customFields,
            updatedBy: context.user?.email,
            updatedAt: new Date().toISOString(),
          };

          mockSupplierData[supplierIndex] = updatedSupplier;
          updatedSuppliers.push(updatedSupplier);
        } catch (error) {
          errors.push({
            id: updateData.id,
            error: error instanceof Error ? error.message : "Invalid data",
          });
        }
      }

      return ApiMiddleware.createSuccessResponse(
        {
          updated: updatedSuppliers,
          errors,
        },
        `${updatedSuppliers.length} suppliers updated successfully${
          errors.length > 0 ? `, ${errors.length} errors` : ""
        }`
      );
    } catch (error) {
      console.error("Error batch updating suppliers:", error);
      throw error;
    }
  }
);

// DELETE /api/v2/suppliers - Batch delete suppliers
export const DELETE = ApiMiddleware.withBulkOperation()(
  async (request: NextRequest, context: RequestContext) => {
    try {
      const body = await request.json();
      const { ids } = body;

      if (!Array.isArray(ids)) {
        return ApiMiddleware.createErrorResponse("IDs must be an array", 400);
      }

      const deletedSuppliers = [];
      const notFoundIds = [];
      const blockedIds = [];

      for (const id of ids) {
        const supplierIndex = mockSupplierData.findIndex((s) => s.id === id);
        if (supplierIndex === -1) {
          notFoundIds.push(id);
          continue;
        }

        const supplier = mockSupplierData[supplierIndex];

        // Check if supplier has active orders or inventory
        if (
          supplier.performance?.totalOrders &&
          supplier.performance.totalOrders > 0
        ) {
          blockedIds.push({
            id,
            reason: "Cannot delete supplier with order history",
          });
          continue;
        }

        // Check if supplier has associated inventory items
        // In a real implementation, this would query the inventory database
        const hasInventoryItems = false; // Mock check
        if (hasInventoryItems) {
          blockedIds.push({
            id,
            reason: "Cannot delete supplier with associated inventory items",
          });
          continue;
        }

        const deletedSupplier = mockSupplierData[supplierIndex];
        mockSupplierData.splice(supplierIndex, 1);
        deletedSuppliers.push(deletedSupplier);
      }

      return ApiMiddleware.createSuccessResponse(
        {
          deleted: deletedSuppliers,
          notFound: notFoundIds,
          blocked: blockedIds,
        },
        `${deletedSuppliers.length} suppliers deleted successfully${
          blockedIds.length > 0 ? `, ${blockedIds.length} blocked` : ""
        }${notFoundIds.length > 0 ? `, ${notFoundIds.length} not found` : ""}`
      );
    } catch (error) {
      console.error("Error batch deleting suppliers:", error);
      throw error;
    }
  }
);

// Export mock data for other modules
export { mockSupplierData };
