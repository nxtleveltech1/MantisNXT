import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { neonAuthService } from '@/lib/auth/neon-auth-service'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role')
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    // Build query
    let query = `
      SELECT 
        u.id,
        u.email,
        u.display_name,
        u.first_name,
        u.last_name,
        u.phone,
        u.mobile,
        u.department,
        u.job_title,
        u.is_active,
        u.two_factor_enabled,
        u.email_verified,
        u.created_at,
        u.last_login_at,
        o.name as org_name,
        COALESCE(
          array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
          ARRAY[]::text[]
        ) as roles
      FROM auth.users_extended u
      JOIN organization o ON u.org_id = o.id
      LEFT JOIN auth.user_roles ur ON u.id = ur.user_id
        AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
      LEFT JOIN auth.roles r ON ur.role_id = r.id AND r.is_active = TRUE
      WHERE u.org_id = $1
    `
    const queryParams: any[] = [user.orgId]
    let paramIndex = 2

    if (search) {
      query += ` AND (
        u.display_name ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex} OR
        u.department ILIKE $${paramIndex}
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    if (role) {
      query += ` AND EXISTS (
        SELECT 1 FROM auth.user_roles ur2
        JOIN auth.roles r2 ON ur2.role_id = r2.id
        WHERE ur2.user_id = u.id
          AND r2.slug = $${paramIndex}
          AND (ur2.effective_until IS NULL OR ur2.effective_until > NOW())
      )`
      queryParams.push(role)
      paramIndex++
    }

    if (department) {
      query += ` AND u.department = $${paramIndex}`
      queryParams.push(department)
      paramIndex++
    }

    if (status === 'active') {
      query += ` AND u.is_active = TRUE`
    } else if (status === 'inactive') {
      query += ` AND u.is_active = FALSE`
    }

    query += ` GROUP BY u.id, o.name`
    query += ` ORDER BY u.created_at DESC`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limit, offset)

    const result = await db.query(query, queryParams)

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM auth.users_extended u
      WHERE u.org_id = $1
    `
    const countParams: any[] = [user.orgId]
    let countParamIndex = 2

    if (search) {
      countQuery += ` AND (
        u.display_name ILIKE $${countParamIndex} OR
        u.email ILIKE $${countParamIndex} OR
        u.department ILIKE $${countParamIndex}
      )`
      countParams.push(`%${search}%`)
      countParamIndex++
    }

    if (role) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM auth.user_roles ur2
        JOIN auth.roles r2 ON ur2.role_id = r2.id
        WHERE ur2.user_id = u.id
          AND r2.slug = $${countParamIndex}
          AND (ur2.effective_until IS NULL OR ur2.effective_until > NOW())
      )`
      countParams.push(role)
      countParamIndex++
    }

    if (department) {
      countQuery += ` AND u.department = $${countParamIndex}`
      countParams.push(department)
      countParamIndex++
    }

    if (status === 'active') {
      countQuery += ` AND u.is_active = TRUE`
    } else if (status === 'inactive') {
      countQuery += ` AND u.is_active = FALSE`
    }

    const countResult = await db.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0]?.total || '0')

    return NextResponse.json(
      {
        success: true,
        data: result.rows.map((row) => ({
          id: row.id,
          email: row.email,
          name: row.display_name,
          firstName: row.first_name,
          lastName: row.last_name,
          phone: row.phone,
          mobile: row.mobile,
          department: row.department,
          jobTitle: row.job_title,
          isActive: row.is_active,
          twoFactorEnabled: row.two_factor_enabled,
          emailVerified: row.email_verified,
          createdAt: row.created_at,
          lastLoginAt: row.last_login_at,
          organization: row.org_name,
          roles: row.roles || [],
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('List users API error:', error)

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

    // Parse request body
    const body = await request.json()
    const {
      email,
      firstName,
      lastName,
      displayName,
      phone,
      mobile,
      department,
      jobTitle,
      role,
      sendInvitation,
    } = body

    if (!email || !displayName) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Email and display name are required',
        },
        { status: 400 }
      )
    }

    // Create user using auth provider
    const { authProvider } = await import('@/lib/auth/mock-provider')
    const newUser = await authProvider.createUser({
      email,
      name: displayName,
      role: role || 'user',
      department: department || '',
      phone: phone || '',
      mobile: mobile || '',
      org_id: user.orgId,
    } as any)

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        data: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          department: newUser.department,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create user API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

