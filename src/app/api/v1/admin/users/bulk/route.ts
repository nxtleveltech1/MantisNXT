import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { neonAuthService } from '@/lib/auth/neon-auth-service'
import { parse } from 'csv-parse/sync'

export async function POST(request: NextRequest) {
  try {
    // Get session token
    let sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7)
      }
    }

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Verify session and get user
    const user = await neonAuthService.verifySession(sessionToken)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_SESSION',
          message: 'Invalid or expired session',
        },
        { status: 401 }
      )
    }

    // Check admin permissions
    const isAdmin = user.roles.some(
      (r) => r.slug === 'admin' || r.slug === 'super_admin' || r.level >= 90
    )

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'CSV file is required',
        },
        { status: 400 }
      )
    }

    // Read and parse CSV
    const text = await file.text()
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
    })

    const results = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; email?: string; errors: string[] }>,
    }

    const { authProvider } = await import('@/lib/auth/mock-provider')

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const errors: string[] = []

      // Validate required fields
      if (!record.email) errors.push('Email is required')
      if (!record.name) errors.push('Name is required')
      if (!record.role) errors.push('Role is required')

      // Validate email format
      if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
        errors.push('Invalid email format')
      }

      // Validate role
      const validRoles = ['super_admin', 'admin', 'manager', 'user', 'viewer']
      if (record.role && !validRoles.includes(record.role)) {
        errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`)
      }

      if (errors.length > 0) {
        results.failed++
        results.errors.push({
          row: i + 2, // +2 because CSV has header and 0-indexed
          email: record.email,
          errors,
        })
        continue
      }

      try {
        await authProvider.createUser({
          email: record.email,
          name: record.name,
          role: record.role,
          department: record.department || '',
          phone: record.phone || '',
          org_id: user.orgId,
        } as any)
        results.success++
      } catch (err) {
        results.failed++
        results.errors.push({
          row: i + 2,
          email: record.email,
          errors: [err instanceof Error ? err.message : 'Failed to create user'],
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Bulk import completed: ${results.success} successful, ${results.failed} failed`,
        data: results,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Bulk import API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

