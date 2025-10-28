import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) {
    throw new Error('JWT_SECRET environment variable is required for authentication');
  }
  return s;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  organizationId: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
  isAuthenticated: boolean;
}

export function withAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            success: false,
            message: 'Authentication required',
            error: 'NO_TOKEN',
          },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);

      // Verify JWT token
      const decoded = jwt.verify(token, getJwtSecret()) as any;

      // Create auth context
      const authContext: AuthContext = {
        user: {
          userId: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          permissions: decoded.permissions,
          organizationId: decoded.organizationId,
        },
        isAuthenticated: true,
      };

      // Call the original handler with auth context
      return await handler(request, authContext);
    } catch (error) {
      console.error('Authentication error:', error);

      if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid or expired token',
            error: 'INVALID_TOKEN',
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: 'Authentication failed',
          error: 'AUTH_ERROR',
        },
        { status: 401 }
      );
    }
  };
}

export function withRole(
  requiredRole: string,
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return withAuth(async (request: NextRequest, context: AuthContext) => {
    if (context.user.role !== requiredRole) {
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient permissions',
          error: 'INSUFFICIENT_ROLE',
        },
        { status: 403 }
      );
    }

    return await handler(request, context);
  });
}

export function withPermission(
  requiredPermission: string,
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return withAuth(async (request: NextRequest, context: AuthContext) => {
    if (!context.user.permissions.includes(requiredPermission)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient permissions',
          error: 'INSUFFICIENT_PERMISSION',
        },
        { status: 403 }
      );
    }

    return await handler(request, context);
  });
}

export function withAnyPermission(
  requiredPermissions: string[],
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return withAuth(async (request: NextRequest, context: AuthContext) => {
    const hasPermission = requiredPermissions.some(permission =>
      context.user.permissions.includes(permission)
    );

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient permissions',
          error: 'INSUFFICIENT_PERMISSION',
        },
        { status: 403 }
      );
    }

    return await handler(request, context);
  });
}

export function withAllPermissions(
  requiredPermissions: string[],
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return withAuth(async (request: NextRequest, context: AuthContext) => {
    const hasAllPermissions = requiredPermissions.every(permission =>
      context.user.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient permissions',
          error: 'INSUFFICIENT_PERMISSION',
        },
        { status: 403 }
      );
    }

    return await handler(request, context);
  });
}

// Helper function to extract user from request
export function getUserFromRequest(request: NextRequest): AuthenticatedUser | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      permissions: decoded.permissions,
      organizationId: decoded.organizationId,
    };
  } catch (error) {
    return null;
  }
}

