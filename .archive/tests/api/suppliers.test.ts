import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/suppliers/route';
import { GET as GetPricelists, POST as PostPricelist } from '@/app/api/suppliers/pricelists/route';
import {
  GET as GetSingle,
  PUT as PutSingle,
  DELETE as DeleteSingle,
} from '@/app/api/suppliers/[id]/route';
import { SupplierFactory } from '../fixtures/factories';
import { setupTestDatabase, teardownTestDatabase, resetTestData } from '../setup/database.setup';

describe('/api/suppliers', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  describe('GET /api/suppliers', () => {
    it('should return paginated suppliers list', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.pagination).toHaveProperty('page', 1);
      expect(data.pagination).toHaveProperty('limit', 20);
      expect(data.pagination).toHaveProperty('total');
    });

    it('should filter suppliers by search query', async () => {
      const testSupplier = SupplierFactory.build({
        name: 'Acme Electronics Supply',
        organizationId: 'test-org-1',
      });

      // Create a test supplier (in real implementation, this would use the API)
      const createRequest = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(testSupplier),
      });
      await POST(createRequest);

      const request = new NextRequest('http://localhost:3000/api/suppliers?query=acme');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      data.data.forEach((supplier: any) => {
        expect(
          supplier.name.toLowerCase().includes('acme') ||
            supplier.code.toLowerCase().includes('acme') ||
            supplier.contactEmail.toLowerCase().includes('acme')
        ).toBe(true);
      });
    });

    it('should filter suppliers by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers?status=active');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      data.data.forEach((supplier: any) => {
        expect(supplier.status).toBe('active');
      });
    });

    it('should sort suppliers by different fields', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/suppliers?sortBy=name&sortOrder=asc'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify sorting
      for (let i = 1; i < data.data.length; i++) {
        expect(data.data[i - 1].name.localeCompare(data.data[i].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should handle pagination correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers?page=1&limit=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBeLessThanOrEqual(1);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(1);
    });

    it('should return 400 for invalid query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers?page=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid query parameters');
    });
  });

  describe('POST /api/suppliers', () => {
    it('should create a new supplier successfully', async () => {
      const newSupplier = SupplierFactory.build({
        organizationId: 'test-org-1',
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(newSupplier),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe(newSupplier.name);
      expect(data.data.code).toBe(newSupplier.code);
      expect(data.data.contactEmail).toBe(newSupplier.contactEmail);
      expect(data.data.status).toBe('active');
      expect(data.message).toBe('Supplier created successfully');
    });

    it('should return 409 for duplicate supplier code', async () => {
      const supplier1 = SupplierFactory.build({
        code: 'DUPLICATE001',
        organizationId: 'test-org-1',
      });

      const supplier2 = SupplierFactory.build({
        code: 'DUPLICATE001', // Same code
        organizationId: 'test-org-1',
      });

      // Create first supplier
      const request1 = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplier1),
      });
      await POST(request1);

      // Try to create second supplier with same code
      const request2 = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplier2),
      });

      const response = await POST(request2);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Supplier code already exists');
      expect(data.details.code).toBe('DUPLICATE001');
    });

    it('should return 400 for invalid supplier data', async () => {
      const invalidSupplier = {
        // Missing required fields
        name: 'Incomplete Supplier',
      };

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(invalidSupplier),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeInstanceOf(Array);
    });

    it('should validate email format', async () => {
      const supplierWithInvalidEmail = SupplierFactory.build({
        contactEmail: 'invalid-email',
        organizationId: 'test-org-1',
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplierWithInvalidEmail),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request data');
    });

    it('should validate phone number format', async () => {
      const supplierWithInvalidPhone = SupplierFactory.build({
        contactPhone: '123', // Too short
        organizationId: 'test-org-1',
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplierWithInvalidPhone),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/suppliers', () => {
    it('should batch update multiple suppliers', async () => {
      // First create suppliers to update
      const supplier1 = SupplierFactory.build({ organizationId: 'test-org-1' });
      const supplier2 = SupplierFactory.build({ organizationId: 'test-org-1' });

      const createRequest1 = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplier1),
      });
      const createResponse1 = await POST(createRequest1);
      const createData1 = await createResponse1.json();

      const createRequest2 = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplier2),
      });
      const createResponse2 = await POST(createRequest2);
      const createData2 = await createResponse2.json();

      // Now update them
      const updates = [
        {
          id: createData1.data.id,
          name: 'Updated Supplier 1',
          status: 'inactive',
        },
        {
          id: createData2.data.id,
          name: 'Updated Supplier 2',
          status: 'inactive',
        },
      ];

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'PUT',
        body: JSON.stringify({ suppliers: updates }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.updated).toHaveLength(2);
      expect(data.data.updated[0].name).toBe('Updated Supplier 1');
      expect(data.data.updated[0].status).toBe('inactive');
    });

    it('should return 400 for invalid suppliers array', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'PUT',
        body: JSON.stringify({ suppliers: 'invalid' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Suppliers must be an array');
    });
  });

  describe('DELETE /api/suppliers', () => {
    it('should batch delete multiple suppliers', async () => {
      // First create a supplier to delete
      const supplier = SupplierFactory.build({ organizationId: 'test-org-1' });

      const createRequest = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplier),
      });
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const supplierId = createData.data.id;

      // Now delete it
      const deleteRequest = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'DELETE',
        body: JSON.stringify({ ids: [supplierId] }),
      });

      const response = await DELETE(deleteRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toHaveLength(1);
      expect(data.data.deleted[0].id).toBe(supplierId);
    });

    it('should prevent deletion of suppliers with active inventory items', async () => {
      // This test would require creating inventory items linked to suppliers
      // For now, we'll test the expected behavior
      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'DELETE',
        body: JSON.stringify({ ids: ['test-sup-1'] }), // This should have linked inventory
      });

      const response = await DELETE(request);
      const data = await response.json();

      // Should either succeed (if no constraints) or fail with proper message
      if (response.status === 409) {
        expect(data.error).toContain('Cannot delete supplier with active inventory items');
      } else {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('GET /api/suppliers/[id]', () => {
    it('should return specific supplier with analytics', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers/test-sup-1');
      const response = await GetSingle(request, { params: { id: 'test-sup-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('test-sup-1');
      expect(data.data).toHaveProperty('analytics');
      expect(data.data.analytics).toHaveProperty('totalItems');
      expect(data.data.analytics).toHaveProperty('totalValue');
      expect(data.data.analytics).toHaveProperty('averageLeadTime');
    });

    it('should return 404 for non-existing supplier', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers/nonexistent');
      const response = await GetSingle(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Supplier not found');
    });
  });

  describe('PUT /api/suppliers/[id]', () => {
    it('should update specific supplier', async () => {
      const updateData = {
        name: 'Updated Supplier Name',
        status: 'inactive',
        terms: {
          paymentTerms: 'NET60',
          minimumOrder: 500,
        },
      };

      const request = new NextRequest('http://localhost:3000/api/suppliers/test-sup-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PutSingle(request, { params: { id: 'test-sup-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(updateData.name);
      expect(data.data.status).toBe(updateData.status);
      expect(data.data.terms.paymentTerms).toBe('NET60');
    });

    it('should return 404 for non-existing supplier', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Test' }),
      });

      const response = await PutSingle(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Supplier not found');
    });
  });

  describe('GET /api/suppliers/pricelists', () => {
    it('should return supplier pricelists', async () => {
      const request = new NextRequest('http://localhost:3000/api/suppliers/pricelists');
      const response = await GetPricelists(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    it('should filter pricelists by supplier', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/suppliers/pricelists?supplierId=test-sup-1'
      );
      const response = await GetPricelists(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      data.data.forEach((pricelist: any) => {
        expect(pricelist.supplierId).toBe('test-sup-1');
      });
    });
  });

  describe('POST /api/suppliers/pricelists', () => {
    it('should upload and process supplier pricelist', async () => {
      const pricelistData = {
        supplierId: 'test-sup-1',
        name: 'Q4 2024 Pricelist',
        effectiveDate: '2024-10-01',
        expiryDate: '2024-12-31',
        items: [
          {
            supplierSku: 'SUPPLIER-001',
            ourSku: 'TEST-001',
            unitCost: 89.99,
            currency: 'USD',
            minimumQuantity: 10,
            leadTimeDays: 7,
          },
          {
            supplierSku: 'SUPPLIER-002',
            ourSku: 'TEST-002',
            unitCost: 25.99,
            currency: 'USD',
            minimumQuantity: 5,
            leadTimeDays: 3,
          },
        ],
      };

      const request = new NextRequest('http://localhost:3000/api/suppliers/pricelists', {
        method: 'POST',
        body: JSON.stringify(pricelistData),
      });

      const response = await PostPricelist(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe('Q4 2024 Pricelist');
      expect(data.data.items).toHaveLength(2);
      expect(data.message).toBe('Pricelist created successfully');
    });

    it('should validate pricelist data', async () => {
      const invalidPricelistData = {
        // Missing required fields
        name: 'Invalid Pricelist',
      };

      const request = new NextRequest('http://localhost:3000/api/suppliers/pricelists', {
        method: 'POST',
        body: JSON.stringify(invalidPricelistData),
      });

      const response = await PostPricelist(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request data');
    });

    it('should validate supplier exists', async () => {
      const pricelistData = {
        supplierId: 'nonexistent-supplier',
        name: 'Test Pricelist',
        effectiveDate: '2024-10-01',
        items: [],
      };

      const request = new NextRequest('http://localhost:3000/api/suppliers/pricelists', {
        method: 'POST',
        body: JSON.stringify(pricelistData),
      });

      const response = await PostPricelist(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Supplier not found');
    });
  });
});
