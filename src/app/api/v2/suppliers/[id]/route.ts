/**
 * Individual Supplier API v2 - GET, PUT, DELETE for specific suppliers
 */

import { NextRequest } from 'next/server'
import { ApiMiddleware, RequestContext } from '@/lib/api/middleware'
import { UpdateSupplierSchema, EnhancedSupplier } from '@/lib/api/validation'
import { z } from 'zod'

type InternalSupplier = EnhancedSupplier & Record<string, any> & { id: string }
const mockSupplierData: InternalSupplier[] = []
const UpdateSupplierBodySchema = UpdateSupplierSchema.omit({ id: true })
type UpdateSupplierInput = z.infer<typeof UpdateSupplierBodySchema>

function getSupplierIdFromRequest(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? ''
}

// GET /api/v2/suppliers/[id] - Get specific supplier
export const GET = ApiMiddleware.withAuth(
  async (request: NextRequest, context: RequestContext) => {
    try {
      const id = getSupplierIdFromRequest(request)

      if (!id) {
        return ApiMiddleware.createErrorResponse(
          'Supplier ID is required',
          400
        )
      }

      const supplier = mockSupplierData.find(supplier => supplier.id === id)
      if (!supplier) {
        return ApiMiddleware.createErrorResponse(
          'Supplier not found',
          404,
          { requestedId: id }
        )
      }

      // Generate related data and statistics
      const relatedData = {
        // Performance trends (mock data - would be calculated from historical data)
        performanceTrends: {
          deliveryTrend: 'improving', // 'improving', 'stable', 'declining'
          qualityTrend: 'stable',
          responsivenessTrend: 'improving',
          lastSixMonths: [
            { month: '2024-04', rating: 4.5, onTimeDelivery: 96.2 },
            { month: '2024-05', rating: 4.6, onTimeDelivery: 97.1 },
            { month: '2024-06', rating: 4.7, onTimeDelivery: 98.5 },
            { month: '2024-07', rating: 4.8, onTimeDelivery: 98.2 },
            { month: '2024-08', rating: 4.8, onTimeDelivery: 98.7 },
            { month: '2024-09', rating: 4.8, onTimeDelivery: 98.5 }
          ]
        },

        // Recent orders (mock data)
        recentOrders: [
          {
            id: 'po_001',
            orderNumber: 'PO-2024-001',
            date: '2024-09-15T08:00:00Z',
            amount: 25000,
            status: 'delivered',
            deliveredOnTime: true
          },
          {
            id: 'po_002',
            orderNumber: 'PO-2024-002',
            date: '2024-09-01T10:30:00Z',
            amount: 18500,
            status: 'delivered',
            deliveredOnTime: true
          }
        ],

        // Associated inventory items
        inventoryItems: [
          {
            id: 'item_001',
            sku: 'DELL-XPS13-001',
            name: 'Dell XPS 13 Laptop (i7, 16GB)',
            currentStock: 25,
            unitCost: 1299.99,
            lastOrderDate: '2024-09-15T08:00:00Z'
          }
        ],

        // Active contracts (mock data)
        contracts: [
          {
            id: 'contract_001',
            number: 'CONT-DELL-2024',
            type: 'master_agreement',
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-12-31T23:59:59Z',
            value: 500000,
            status: 'active'
          }
        ],

        // Payment history summary
        paymentHistory: {
          averagePaymentDays: 28,
          earlyPayments: 15,
          onTimePayments: 82,
          latePayments: 3,
          totalInvoices: 100,
          outstandingAmount: 45000
        },

        // Risk assessment
        riskAssessment: {
          overallRisk: 'low',
          factors: {
            financial: 'low',
            operational: 'low',
            geographic: 'low',
            regulatory: 'low'
          },
          lastAssessment: '2024-06-15T10:00:00Z',
          nextReview: '2024-12-15T10:00:00Z'
        },

        // Communication history (recent)
        recentCommunications: [
          {
            id: 'comm_001',
            type: 'email',
            subject: 'Q4 Pricing Update',
            date: '2024-09-20T14:30:00Z',
            direction: 'inbound',
            contact: 'Sarah Johnson'
          },
          {
            id: 'comm_002',
            type: 'phone',
            subject: 'Order Status Inquiry',
            date: '2024-09-18T11:15:00Z',
            direction: 'outbound',
            contact: 'Sarah Johnson'
          }
        ]
      }

      return ApiMiddleware.createSuccessResponse(
        {
          supplier,
          related: relatedData
        },
        'Supplier retrieved successfully'
      )

    } catch (error) {
      console.error('Error fetching supplier:', error)
      throw error
    }
  },
  { requiredPermissions: ['read'] }
)

// PUT /api/v2/suppliers/[id] - Update specific supplier
export const PUT = ApiMiddleware.withAuth(
  async (request: NextRequest, context: RequestContext) => {
    try {
      const id = getSupplierIdFromRequest(request)
      if (!id) {
        return ApiMiddleware.createErrorResponse(
          'Supplier ID is required',
          400
        )
      }

      const body = await request.json()
      const validation = UpdateSupplierBodySchema.safeParse(body)
      if (!validation.success) {
        return ApiMiddleware.createErrorResponse(
          'Validation error',
          400,
          { validationErrors: validation.error.issues }
        )
      }

      const validatedData = validation.data

      const supplierIndex = mockSupplierData.findIndex(supplier => supplier.id === id)
      if (supplierIndex === -1) {
        return ApiMiddleware.createErrorResponse(
          'Supplier not found',
          404,
          { requestedId: id }
        )
      }

      // Check for code conflicts (if code is being updated)
      if (validatedData.code) {
        const existingSupplier = mockSupplierData.find(supplier =>
          supplier.code === validatedData.code && supplier.id !== id
        )
        if (existingSupplier) {
          return ApiMiddleware.createErrorResponse(
            'Supplier code already exists',
            409,
            {
              code: validatedData.code,
              existingSupplierId: existingSupplier.id
            }
          )
        }
      }

      // Check for email conflicts (if email is being updated)
      if (validatedData.email) {
        const existingEmail = mockSupplierData.find(supplier =>
          supplier.email === validatedData.email && supplier.id !== id
        )
        if (existingEmail) {
          return ApiMiddleware.createErrorResponse(
            'Supplier email already exists',
            409,
            {
              email: validatedData.email,
              existingSupplierId: existingEmail.id
            }
          )
        }
      }

      const existingSupplier = mockSupplierData[supplierIndex]

      // Track what fields are being updated for audit purposes
      const changedFields = Object.keys(validatedData).filter(key => {
        const oldValue = existingSupplier[key as keyof typeof existingSupplier]
        const newValue = validatedData[key as keyof typeof validatedData]
        return JSON.stringify(oldValue) !== JSON.stringify(newValue)
      })

      // Validate contact updates
      if (validatedData.contacts) {
        const primaryContacts = validatedData.contacts.filter(c => c.isPrimary)
        if (primaryContacts.length > 1) {
          return ApiMiddleware.createErrorResponse(
            'Only one primary contact is allowed',
            400
          )
        }

        // If no primary contact, set first one as primary
        if (primaryContacts.length === 0 && validatedData.contacts.length > 0) {
          validatedData.contacts[0].isPrimary = true
        }

        // Assign IDs to new contacts
        validatedData.contacts = validatedData.contacts.map((contact, index) => ({
          ...contact,
          id: contact.id || `contact_${Date.now()}_${index}`
        }))
      }

      // Update supplier
      const updatedSupplier: InternalSupplier = {
        ...existingSupplier,
        ...validatedData,
        // Merge nested objects properly
        address: validatedData.address ? { ...existingSupplier.address, ...validatedData.address } : existingSupplier.address,
        paymentTerms: validatedData.paymentTerms ? { ...existingSupplier.paymentTerms, ...validatedData.paymentTerms } : existingSupplier.paymentTerms,
        performance: validatedData.performance ? { ...existingSupplier.performance, ...validatedData.performance } : existingSupplier.performance,
        compliance: validatedData.compliance ? { ...existingSupplier.compliance, ...validatedData.compliance } : existingSupplier.compliance,
        customFields: validatedData.customFields ? { ...existingSupplier.customFields, ...validatedData.customFields } : existingSupplier.customFields,
        updatedBy: context.user?.email,
        updatedAt: new Date().toISOString()
      }

      mockSupplierData[supplierIndex] = updatedSupplier

      // Create audit trail entry
      const auditEntry = {
        id: `audit_${Date.now()}`,
        supplierId: updatedSupplier.id,
        action: 'update',
        changedFields,
        previousValues: Object.fromEntries(
          changedFields.map(field => [field, existingSupplier[field as keyof typeof existingSupplier]])
        ),
        newValues: Object.fromEntries(
          changedFields.map(field => [field, updatedSupplier[field as keyof InternalSupplier]])
        ),
        performedBy: context.user?.email,
        timestamp: new Date().toISOString(),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress
      }

      return ApiMiddleware.createSuccessResponse(
        {
          supplier: updatedSupplier,
          audit: auditEntry,
          changedFields
        },
        'Supplier updated successfully'
      )

    } catch (error) {
      console.error('Error updating supplier:', error)
      throw error
    }
  },
  { requiredPermissions: ['write'] }
)

// DELETE /api/v2/suppliers/[id] - Delete specific supplier
export const DELETE = ApiMiddleware.withAuth(
  async (request: NextRequest, context: RequestContext) => {
    try {
      const id = getSupplierIdFromRequest(request)

      if (!id) {
        return ApiMiddleware.createErrorResponse(
          'Supplier ID is required',
          400
        )
      }

      const supplierIndex = mockSupplierData.findIndex(supplier => supplier.id === id)
      if (supplierIndex === -1) {
        return ApiMiddleware.createErrorResponse(
          'Supplier not found',
          404,
          { requestedId: id }
        )
      }

      const supplier = mockSupplierData[supplierIndex]

      // Business rule checks before deletion
      const blockers = []

      // Check if supplier has order history
      if (supplier.performance?.totalOrders && supplier.performance.totalOrders > 0) {
        blockers.push(`Supplier has order history (${supplier.performance.totalOrders} orders)`)
      }

      // Check if supplier has associated inventory items
      // In a real implementation, this would query the inventory database
      const hasInventoryItems = Math.random() > 0.7 // Mock check
      if (hasInventoryItems) {
        blockers.push('Supplier has associated inventory items')
      }

      // Check if supplier has active contracts
      const hasActiveContracts = Math.random() > 0.8 // Mock check
      if (hasActiveContracts) {
        blockers.push('Supplier has active contracts')
      }

      // Check if supplier has outstanding invoices
      const hasOutstandingInvoices = Math.random() > 0.6 // Mock check
      if (hasOutstandingInvoices) {
        blockers.push('Supplier has outstanding invoices')
      }

      const { searchParams } = new URL(request.url)
      const force = searchParams.get('force') === 'true'
      const soft = searchParams.get('soft') === 'true'

      if (blockers.length > 0 && !force && !soft) {
        return ApiMiddleware.createErrorResponse(
          'Cannot delete supplier',
          400,
          {
            blockers,
            suggestion: 'Use ?force=true to force deletion, ?soft=true for soft delete, or resolve the blocking conditions first'
          }
        )
      }

      // Soft delete option
      if (soft) {
        supplier.isActive = false
        supplier.status = 'inactive'
        supplier.updatedBy = context.user?.email
        supplier.updatedAt = new Date().toISOString()

        return ApiMiddleware.createSuccessResponse(
          {
            supplier,
            deletionType: 'soft'
          },
          'Supplier deactivated successfully'
        )
      }

      // Perform actual deletion
      const deletedSupplier = mockSupplierData[supplierIndex]
      mockSupplierData.splice(supplierIndex, 1)

      // Create audit trail entry
      const auditEntry = {
        id: `audit_${Date.now()}`,
        supplierId: deletedSupplier.id,
        action: 'delete',
        deletedSupplier: { ...deletedSupplier },
        performedBy: context.user?.email,
        timestamp: new Date().toISOString(),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        forced: force,
        blockers: blockers.length > 0 ? blockers : undefined
      }

      return ApiMiddleware.createSuccessResponse(
        {
          deletedSupplier,
          audit: auditEntry,
          deletionType: 'hard'
        },
        'Supplier deleted successfully'
      )

    } catch (error) {
      console.error('Error deleting supplier:', error)
      throw error
    }
  },
  { requiredPermissions: ['delete'] }
)