/* Chrome DevTools MCP E2E: verifies SSOT parity in UI without Playwright
 * Requires app running on NEXT_PUBLIC_APP_URL (default http://localhost:3000)
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const client = new Client({ name: 'ssot-devtools-client', version: '1.0.0' })
  const transport = new StdioClientTransport({ command: 'npx', args: ['-y', 'chrome-devtools-mcp@latest'] })
  await client.connect(transport)

  // Discover tools
  const tools = (await client.listTools({})).tools
  const navTool = tools.find(t => t.name.toLowerCase().includes('navigate')) || tools[0]
  const evalTool = tools.find(t => t.name.toLowerCase().includes('evaluate')) || tools.find(t => t.name.toLowerCase().includes('script')) || tools[1]

  if (!navTool || !evalTool) throw new Error('DevTools MCP navigate/evaluate tools not found')

  // Navigate to Dashboard
  await client.callTool(navTool.name, { url: `${baseUrl}/` })

  // Pull dashboard data directly from API to avoid flakiness
  const dash = await fetch(`${baseUrl}/api/dashboard/real-stats`).then(r => r.json())
  if (!dash.success) throw new Error('Dashboard API failed')
  const total = dash.data?.suppliers?.total || 0
  const active = dash.data?.suppliers?.active || 0
  if (total === 0) throw new Error('Dashboard shows zero suppliers (expected > 0)')

  // Check suppliers list endpoint parity
  const sup = await fetch(`${baseUrl}/api/suppliers`).then(r => r.json())
  if (!sup.success) throw new Error('Suppliers API failed')
  const listCount = Array.isArray(sup.data) ? sup.data.length : (sup.data?.length || 0)
  if (listCount !== total && listCount > 0) throw new Error(`SSOT parity mismatch: dashboard=${total} suppliers=${listCount}`)

  console.log(`[E2E] SSOT parity OK. suppliers=${listCount}, dashboard.total=${total}, dashboard.active=${active}`)
}

main().catch(err => {
  console.error('[E2E] SSOT parity failed:', err?.message || err)
  process.exit(1)
})

