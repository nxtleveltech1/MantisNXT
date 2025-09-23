import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/inventory/route'
import { GET as GetSingle, PUT as PutSingle, DELETE as DeleteSingle, POST as PostStockAdjustment } from '@/app/api/inventory/[id]/route'

// Mock console.error to avoid cluttering test output
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})
afterAll(() => {
  console.error = originalConsoleError
})

describe('/api/inventory', () => {
  describe('GET /api/inventory', () => {
    it('should return paginated inventory items with default parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeInstanceOf(Array)
      expect(data.pagination).toHaveProperty('page', 1)
      expect(data.pagination).toHaveProperty('limit', 20)
      expect(data.metrics).toHaveProperty('totalItems')
      expect(data.metrics).toHaveProperty('totalValue')
      expect(data.metrics).toHaveProperty('lowStockItems')
      expect(data.metrics).toHaveProperty('outOfStockItems')
    })

    it('should filter items by search query', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory?query=dell')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      data.data.forEach((item: any) => {
        expect(
          item.name.toLowerCase().includes('dell') ||
          item.sku.toLowerCase().includes('dell') ||
          item.description.toLowerCase().includes('dell') ||
          item.category.toLowerCase().includes('dell')
        ).toBe(true)
      })
    })

    it('should filter items by category', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory?category=Electronics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      data.data.forEach((item: any) => {
        expect(item.category).toBe('Electronics')
      })
    })

    it('should filter items by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory?status=active')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      data.data.forEach((item: any) => {
        expect(item.status).toBe('active')
      })
    })

    it('should filter low stock items', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory?lowStock=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      data.data.forEach((item: any) => {
        expect(item.currentStock).toBeLessThanOrEqual(item.reorderPoint)
        expect(item.currentStock).toBeGreaterThan(0)
      })
    })

    it('should filter out of stock items', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory?outOfStock=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      data.data.forEach((item: any) => {
        expect(item.currentStock).toBe(0)
      })
    })

    it('should handle pagination correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory?page=1&limit=5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.length).toBeLessThanOrEqual(5)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(5)
    })

    it('should handle sorting by different fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory?sortBy=name&sortOrder=asc')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Check if items are sorted by name in ascending order
      for (let i = 1; i < data.data.length; i++) {
        expect(data.data[i - 1].name.localeCompare(data.data[i].name)).toBeLessThanOrEqual(0)
      }
    })

    it('should return 400 for invalid query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory?page=invalid')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
    })
  })

  describe('POST /api/inventory', () => {
    it('should create a new inventory item successfully', async () => {
      const newItem = {
        sku: `TEST-SKU-${Date.now()}`,
        name: 'Test Item',
        description: 'Test item description',
        category: 'Test Category',
        currentStock: 10,
        reorderPoint: 5,
        maxStock: 100,
        minStock: 1,
        unitCost: 99.99,
        unitPrice: 129.99,
        currency: 'USD',
        unit: 'pcs',
        primaryLocationId: 'loc_001',
        batchTracking: false,
        tags: ['test'],
        notes: 'Test item notes'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify(newItem)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id')
      expect(data.data.sku).toBe(newItem.sku)
      expect(data.data.name).toBe(newItem.name)
      expect(data.data.status).toBe('active')
      expect(data.message).toBe('Inventory item created successfully')
    })

    it('should return 409 for duplicate SKU', async () => {
      const duplicateItem = {
        sku: 'DELL-XPS13-001', // This SKU already exists in mock data
        name: 'Duplicate Item',
        category: 'Test',
        currentStock: 10,
        reorderPoint: 5,
        maxStock: 100,
        minStock: 1,
        unitCost: 99.99,
        unitPrice: 129.99,
        primaryLocationId: 'loc_001'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify(duplicateItem)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toBe('SKU already exists')
      expect(data.details.sku).toBe(duplicateItem.sku)
    })

    it('should return 400 for invalid data', async () => {
      const invalidItem = {
        // Missing required fields
        name: 'Invalid Item'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify(invalidItem)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeInstanceOf(Array)
    })

    it('should create item with out_of_stock status when currentStock is 0', async () => {
      const outOfStockItem = {
        sku: `OUT-OF-STOCK-${Date.now()}`,
        name: 'Out of Stock Item',
        category: 'Test',
        currentStock: 0,
        reorderPoint: 5,
        maxStock: 100,
        minStock: 1,
        unitCost: 99.99,
        unitPrice: 129.99,
        primaryLocationId: 'loc_001'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify(outOfStockItem)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.status).toBe('out_of_stock')
    })
  })

  describe('PUT /api/inventory', () => {
    it('should batch update multiple inventory items', async () => {
      const updates = [
        {
          id: 'item_001',
          name: 'Updated Dell Laptop',
          unitPrice: 1699.99
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'PUT',
        body: JSON.stringify({ items: updates })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.updated).toHaveLength(1)
      expect(data.data.updated[0].name).toBe('Updated Dell Laptop')
      expect(data.data.updated[0].unitPrice).toBe(1699.99)
    })

    it('should return 400 for invalid items array', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'PUT',
        body: JSON.stringify({ items: 'invalid' })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Items must be an array')
    })

    it('should handle mix of valid and invalid updates', async () => {
      const updates = [
        {
          id: 'item_001',
          name: 'Valid Update'
        },
        {
          id: 'nonexistent_item',
          name: 'Invalid Update'
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'PUT',
        body: JSON.stringify({ items: updates })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.updated).toHaveLength(1)
      expect(data.data.errors).toHaveLength(1)
      expect(data.data.errors[0].id).toBe('nonexistent_item')
    })
  })

  describe('DELETE /api/inventory', () => {
    it('should batch delete multiple inventory items', async () => {
      // First create items to delete
      const createRequest = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          sku: `DELETE-TEST-${Date.now()}`,
          name: 'Item to Delete',
          category: 'Test',
          currentStock: 10,
          reorderPoint: 5,
          maxStock: 100,
          minStock: 1,
          unitCost: 99.99,
          unitPrice: 129.99,
          primaryLocationId: 'loc_001'
        })
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const itemId = createData.data.id

      // Now delete the item
      const deleteRequest = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'DELETE',
        body: JSON.stringify({ ids: [itemId] })
      })

      const response = await DELETE(deleteRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.deleted).toHaveLength(1)
      expect(data.data.deleted[0].id).toBe(itemId)
    })

    it('should return 400 for invalid ids array', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'DELETE',
        body: JSON.stringify({ ids: 'invalid' })
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('IDs must be an array')
    })

    it('should handle mix of existing and non-existing item IDs', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'DELETE',
        body: JSON.stringify({ ids: ['item_001', 'nonexistent_item'] })
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.deleted).toHaveLength(1)
      expect(data.data.notFound).toContain('nonexistent_item')
    })
  })
})

describe('/api/inventory/[id]', () => {
  describe('GET /api/inventory/[id]', () => {
    it('should return specific inventory item with analytics', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/item_001')
      const response = await GetSingle(request, { params: { id: 'item_001' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('item_001')
      expect(data.data).toHaveProperty('stockMovements')
      expect(data.data).toHaveProperty('analytics')
      expect(data.data.analytics).toHaveProperty('stockTurnover')
      expect(data.data.analytics).toHaveProperty('daysInStock')
      expect(data.data.analytics).toHaveProperty('velocity')
    })

    it('should return 404 for non-existing item', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/nonexistent')
      const response = await GetSingle(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Inventory item not found')
    })
  })

  describe('PUT /api/inventory/[id]', () => {
    it('should update specific inventory item', async () => {
      const updateData = {
        name: 'Updated Item Name',
        unitPrice: 1799.99,
        currentStock: 30
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/item_001', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      const response = await PutSingle(request, { params: { id: 'item_001' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe(updateData.name)
      expect(data.data.unitPrice).toBe(updateData.unitPrice)
      expect(data.data.currentStock).toBe(updateData.currentStock)
      expect(data.message).toBe('Inventory item updated successfully')
    })

    it('should update item status based on stock levels', async () => {
      const updateData = { currentStock: 0 }

      const request = new NextRequest('http://localhost:3000/api/inventory/item_001', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      const response = await PutSingle(request, { params: { id: 'item_001' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.status).toBe('out_of_stock')
    })

    it('should return 404 for non-existing item', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Test' })
      })

      const response = await PutSingle(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Inventory item not found')
    })

    it('should return 409 for SKU conflict', async () => {
      const updateData = { sku: 'DELL-XPS13-001' } // Existing SKU

      const request = new NextRequest('http://localhost:3000/api/inventory/item_002', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      const response = await PutSingle(request, { params: { id: 'item_002' } })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toBe('SKU already exists for another item')
    })
  })

  describe('DELETE /api/inventory/[id]', () => {
    it('should delete inventory item successfully', async () => {
      // First create an item to delete
      const createRequest = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          sku: `DELETE-SINGLE-${Date.now()}`,
          name: 'Item to Delete',
          category: 'Test',
          currentStock: 10,
          reorderPoint: 5,
          maxStock: 100,
          minStock: 1,
          unitCost: 99.99,
          unitPrice: 129.99,
          primaryLocationId: 'loc_001'
        })
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const itemId = createData.data.id

      // Now delete the item
      const deleteRequest = new NextRequest(`http://localhost:3000/api/inventory/${itemId}`)
      const response = await DeleteSingle(deleteRequest, { params: { id: itemId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(itemId)
      expect(data.message).toBe('Inventory item deleted successfully')
    })

    it('should return 404 for non-existing item', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/nonexistent')
      const response = await DeleteSingle(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Inventory item not found')
    })

    it('should return 409 for item with reserved stock', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory/item_001')
      const response = await DeleteSingle(request, { params: { id: 'item_001' } })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Cannot delete item with reserved stock')
    })
  })

  describe('POST /api/inventory/[id]/stock-adjustment', () => {
    it('should adjust stock successfully with positive adjustment', async () => {
      const adjustmentData = {
        adjustment: 10,
        reason: 'Inventory count correction',
        notes: 'Found additional stock during audit'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/item_001/stock-adjustment', {
        method: 'POST',
        body: JSON.stringify(adjustmentData)
      })

      const response = await PostStockAdjustment(request, { params: { id: 'item_001' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.adjustment).toBe(10)
      expect(data.data.item.currentStock).toBe(data.data.previousStock + 10)
      expect(data.data.stockMovement.type).toBe('inbound')
      expect(data.message).toBe('Stock adjustment completed successfully')
    })

    it('should adjust stock successfully with negative adjustment', async () => {
      const adjustmentData = {
        adjustment: -5,
        reason: 'Damaged goods',
        notes: 'Items damaged during transport'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/item_001/stock-adjustment', {
        method: 'POST',
        body: JSON.stringify(adjustmentData)
      })

      const response = await PostStockAdjustment(request, { params: { id: 'item_001' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.adjustment).toBe(-5)
      expect(data.data.stockMovement.type).toBe('outbound')
    })

    it('should return 409 for insufficient stock adjustment', async () => {
      const adjustmentData = {
        adjustment: -1000, // More than available stock
        reason: 'Invalid adjustment'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/item_001/stock-adjustment', {
        method: 'POST',
        body: JSON.stringify(adjustmentData)
      })

      const response = await PostStockAdjustment(request, { params: { id: 'item_001' } })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Insufficient stock for adjustment')
      expect(data.details).toHaveProperty('currentStock')
      expect(data.details).toHaveProperty('requestedAdjustment')
      expect(data.details).toHaveProperty('resultingStock')
    })

    it('should return 404 for non-existing item', async () => {
      const adjustmentData = {
        adjustment: 10,
        reason: 'Test adjustment'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/nonexistent/stock-adjustment', {
        method: 'POST',
        body: JSON.stringify(adjustmentData)
      })

      const response = await PostStockAdjustment(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Inventory item not found')
    })

    it('should return 400 for invalid adjustment data', async () => {
      const invalidData = {
        // Missing required fields
        notes: 'Invalid adjustment'
      }

      const request = new NextRequest('http://localhost:3000/api/inventory/item_001/stock-adjustment', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await PostStockAdjustment(request, { params: { id: 'item_001' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request data')
    })

    it('should update item status based on new stock level', async () => {
      // Create an item with stock above reorder point
      const createRequest = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          sku: `STATUS-TEST-${Date.now()}`,
          name: 'Status Test Item',
          category: 'Test',
          currentStock: 20,
          reorderPoint: 10,
          maxStock: 100,
          minStock: 1,
          unitCost: 99.99,
          unitPrice: 129.99,
          primaryLocationId: 'loc_001'
        })
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const itemId = createData.data.id

      // Adjust stock to below reorder point
      const adjustmentData = {
        adjustment: -15, // This should bring stock to 5, below reorder point of 10
        reason: 'Test status change'
      }

      const adjustRequest = new NextRequest(`http://localhost:3000/api/inventory/${itemId}/stock-adjustment`, {
        method: 'POST',
        body: JSON.stringify(adjustmentData)
      })

      const response = await PostStockAdjustment(adjustRequest, { params: { id: itemId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.item.status).toBe('low_stock')
    })
  })
})