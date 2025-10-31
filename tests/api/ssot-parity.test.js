const { GET: DashboardGET } = require('../../src/app/api/dashboard/real-stats/route')
const { GET: SuppliersGET } = require('../../src/app/api/suppliers/route')

jest.mock('../../src/lib/database/unified-connection', () => {
  const mock = {
    query: jest.fn(async (sql) => {
      if (/public\.suppliers/i.test(sql)) {
        return {
          rows: [
            {
              id: 's1',
              name: 'ACME',
              status: 'active',
              code: 'ACM',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              __total: 1,
            },
          ],
          rowCount: 1,
        }
      }
      return {
        rows: [
          {
            supplier_stats: {
              total_suppliers: 1,
              active_suppliers: 1,
              status_breakdown: { active: 1 },
            },
            product_stats: {
              total_products: 0,
              total_value: 0,
              avg_price: 0,
              min_price: 0,
              max_price: 0,
            },
            pricelist_stats: {
              total_pricelists: 0,
              active_pricelists: 0,
              valid_pricelists: 0,
              expiring_pricelists: 0,
            },
            top_suppliers: [],
            recent_activities: [],
          },
        ],
        rowCount: 1,
      }
    }),
  }
  return mock
})

describe('SSOT parity', () => {
  it('suppliers endpoint returns ACME and dashboard reflects same counts', async () => {
    const reqUrl = new URL('https://example.com/api/suppliers?status=active')
    const resSuppliers = await SuppliersGET({ url: reqUrl.toString() })
    const jsonSuppliers = await resSuppliers.json()
    expect(jsonSuppliers.success).toBe(true)
    expect(jsonSuppliers.data.length).toBe(1)
    expect(jsonSuppliers.data[0].name).toBe('ACME')

    const resDashboard = await DashboardGET()
    const jsonDashboard = await resDashboard.json()
    expect(jsonDashboard.success).toBe(true)
    expect(jsonDashboard.data.suppliers.total).toBe(1)
    expect(jsonDashboard.data.suppliers.active).toBe(1)
  })
})
