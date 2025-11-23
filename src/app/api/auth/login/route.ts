import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sign as signJwt, verify as verifyJwt } from 'jsonwebtoken';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Validation schema
const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(3, 'Password must be at least 3 characters'),
  remember_me: z.boolean().default(false),
  two_factor_code: z.string().optional(),
});

// Mock user database - in production, this would be a real database
const mockUsers = [
  {
    id: 'user_001',
    email: 'gambew@gmail.com',
    name: 'System Administrator',
    role: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    permissions: ['read', 'write', 'delete', 'admin', 'bulk_operations', 'user_management'],
    organizationId: 'org_001',
    isActive: true,
    twoFactorEnabled: false,
    lastLogin: new Date(),
  },
  {
    id: 'user_002',
    email: 'manager@company.com',
    name: 'Inventory Manager',
    role: 'manager',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    permissions: ['read', 'write', 'bulk_operations'],
    organizationId: 'org_001',
    isActive: true,
    twoFactorEnabled: false,
    lastLogin: new Date(),
  },
  {
    id: 'user_003',
    email: 'user@company.com',
    name: 'Regular User',
    role: 'user',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    permissions: ['read'],
    organizationId: 'org_001',
    isActive: true,
    twoFactorEnabled: false,
    lastLogin: new Date(),
  },
];

// JWT secret - allow a harmless placeholder only during static build so Vercel can compile
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const rawJwtSecret = process.env.JWT_SECRET || (isBuildPhase ? 'build-placeholder-secret' : undefined);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!rawJwtSecret) {
  throw new Error('JWT_SECRET environment variable is required for authentication');
}

const JWT_SECRET: string = rawJwtSecret;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = LoginSchema.parse(body);
    const { email, password, remember_me, two_factor_code } = validatedData;

    // Find user
    const user = mockUsers.find(u => u.email === email);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: 'Account is disabled',
          error: 'ACCOUNT_DISABLED',
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled && !two_factor_code) {
      return NextResponse.json(
        {
          success: false,
          message: 'Two-factor authentication required',
          error: 'TWO_FACTOR_REQUIRED',
          requires_two_factor: true,
          two_factor_token: 'temp_2fa_token_' + user.id,
        },
        { status: 200 }
      );
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      organizationId: user.organizationId,
    };

    const signOptions: SignOptions = {
      expiresIn: (remember_me ? '30d' : JWT_EXPIRES_IN) as SignOptions['expiresIn'],
    };

    const token = signJwt(tokenPayload as Record<string, unknown>, JWT_SECRET, signOptions);

    // Update last login
    user.lastLogin = new Date();

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
            organizationId: user.organizationId,
            lastLogin: user.lastLogin,
          },
          token,
          expiresIn: remember_me ? '30d' : JWT_EXPIRES_IN,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid input data',
          error: 'VALIDATION_ERROR',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Login failed due to server error',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for checking authentication status
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'No authentication token provided',
          error: 'NO_TOKEN',
        },
        { status: 401 }
      );
    }

    try {
      const decoded = verifyJwt(token, JWT_SECRET) as JwtPayload;

      // Find user to get current data
      const user = mockUsers.find(u => u.id === decoded.userId);
      if (!user || !user.isActive) {
        return NextResponse.json(
          {
            success: false,
            message: 'User not found or inactive',
            error: 'USER_NOT_FOUND',
          },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Authentication valid',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
            organizationId: user.organizationId,
            lastLogin: user.lastLogin,
          },
        },
      });
    } catch (jwtError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired token',
          error: 'INVALID_TOKEN',
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Authentication check failed',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
