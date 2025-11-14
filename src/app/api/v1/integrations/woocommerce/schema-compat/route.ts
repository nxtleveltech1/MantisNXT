import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createErrorResponse } from '@/lib/utils/neon-error-handler'

export async function GET(_request: NextRequest) {
  try {
    const exists = async (name: string) => {
      const res = await query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = $1
         ) as exists`,
        [name]
      )
      return res.rows[0]?.exists === true
    }

    const count = async (name: string) => {
      const ok = await exists(name)
      if (!ok) return null
      const res = await query<{ count: number }>(`SELECT COUNT(*)::int as count FROM ${name}`)
      return res.rows[0]?.count ?? null
    }

    const pairs = [
      { plural: 'customers', singular: 'customer' },
      { plural: 'products', singular: 'product' },
      { plural: 'orders', singular: 'order' },
    ]

    const results = [] as Array<{ plural: string; singular: string; pluralCount: number | null; singularCount: number | null }>
    for (const p of pairs) {
      results.push({
        plural: p.plural,
        singular: p.singular,
        pluralCount: await count(p.plural),
        singularCount: await count(p.singular),
      })
    }

    return NextResponse.json({ success: true, data: results })
  } catch (e: any) {
    return createErrorResponse(e, 500)
  }
}
