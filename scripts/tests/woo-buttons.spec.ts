// Basic endpoint interaction tests for WooCommerce UI actions
// Run with: npm run test:woo-buttons

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const ORG = process.env.TEST_ORG_ID || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('❌', msg)
    process.exit(1)
  }
}

async function post(path: string, body?: any, headers?: Record<string, string>) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res
}

async function get(path: string) {
  const res = await fetch(BASE + path)
  return res
}

async function main() {
  console.log('▶ Testing preview refresh')
  let res = await post('/api/v1/integrations/woocommerce/preview/refresh', { entities: ['customers'] }, { 'x-org-id': ORG })
  assert(res.ok, 'preview/refresh failed')

  console.log('▶ Testing table load')
  res = await get(`/api/v1/integrations/woocommerce/table?entity=customers&orgId=${ORG}&page=1&pageSize=10`)
  assert(res.ok, 'table load failed')
  let json: any = await res.json()
  assert(Array.isArray(json.data), 'table data not array')

  console.log('▶ Testing selection')
  const ids = json.data.slice(0, 2).map((r: any) => r.external_id)
  res = await post('/api/v1/integrations/woocommerce/select', { entity: 'customers', ids, selected: true }, { 'x-org-id': ORG })
  assert(res.ok, 'select failed')

  console.log('▶ Testing selected sync (customers)')
  res = await post('/api/v1/integrations/woocommerce/sync/selected', { org_id: ORG, entity: 'customers', ids })
  assert(res.ok, 'start-selected failed')
  json = await res.json()
  assert(json.success === true, 'selected sync did not return success')

  console.log('▶ Testing selected sync (products)')
  res = await post('/api/v1/integrations/woocommerce/preview/refresh', { entities: ['products'] }, { 'x-org-id': ORG })
  assert(res.ok, 'preview/refresh products failed')
  res = await get(`/api/v1/integrations/woocommerce/table?entity=products&orgId=${ORG}&page=1&pageSize=10`)
  json = await res.json()
  const pids = json.data.slice(0, 2).map((r: any) => r.external_id).map((v: any) => Number(v))
  res = await post('/api/v1/integrations/woocommerce/sync/selected', { org_id: ORG, entity: 'products', ids: pids })
  assert(res.ok, 'selected products sync failed')

  console.log('▶ Testing schedule full sync (admin)')
  res = await post('/api/v1/integrations/woocommerce/schedule/customers', {}, { 'x-org-id': ORG, 'x-admin': 'true' })
  assert(res.ok, 'schedule customers failed')

  console.log('✅ All tests passed')
  process.exit(0)
}

main().catch((e) => {
  console.error('❌ Test run error', e)
  process.exit(1)
})
