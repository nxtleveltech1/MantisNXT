import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/middleware/auth';
import { QAValidator } from '@/lib/quality/qa-validator';
import { query } from '@/lib/database';

// GET /api/quality/validate - Run quality assurance validation
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Check if user has permission to run quality validation
    if (
      !context.user.permissions.includes('admin') &&
      !context.user.permissions.includes('quality.read')
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient permissions to run quality validation',
          error: 'INSUFFICIENT_PERMISSION',
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const category = url.searchParams.get('category');

    const validator = new QAValidator(query);
    let result;

    if (category) {
      // Run specific category validation
      switch (category) {
        case 'database':
          result = await validator.validateDatabase();
          break;
        case 'api':
          result = await validator.validateAPI();
          break;
        case 'security':
          result = await validator.validateSecurity();
          break;
        case 'performance':
          result = await validator.validatePerformance();
          break;
        case 'code':
          result = await validator.validateCode();
          break;
        default:
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid validation category',
              error: 'INVALID_CATEGORY',
            },
            { status: 400 }
          );
      }
    } else {
      // Run comprehensive validation
      result = await validator.validate();
    }

    return NextResponse.json({
      success: true,
      message: 'Quality validation completed',
      data: {
        result,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Quality validation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Quality validation failed',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
});

// POST /api/quality/validate - Run quality validation with options
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Check if user has permission to run quality validation
    if (
      !context.user.permissions.includes('admin') &&
      !context.user.permissions.includes('quality.write')
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient permissions to run quality validation',
          error: 'INSUFFICIENT_PERMISSION',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { categories = [], options = {} } = body;

    const validator = new QAValidator(query);
    let result;

    if (categories.length > 0) {
      // Run specific categories validation
      const results = await Promise.all(
        categories.map(async (category: string) => {
          switch (category) {
            case 'database':
              return { category, result: await validator.validateDatabase() };
            case 'api':
              return { category, result: await validator.validateAPI() };
            case 'security':
              return { category, result: await validator.validateSecurity() };
            case 'performance':
              return { category, result: await validator.validatePerformance() };
            case 'code':
              return { category, result: await validator.validateCode() };
            default:
              return {
                category,
                result: {
                  success: false,
                  message: `Invalid category: ${category}`,
                },
              };
          }
        })
      );

      result = {
        success: results.every(r => r.result.success),
        message: 'Selected categories validation completed',
        categories: results,
      };
    } else {
      // Run comprehensive validation
      result = await validator.validate();
    }

    return NextResponse.json({
      success: true,
      message: 'Quality validation completed',
      data: {
        result,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Quality validation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Quality validation failed',
        error: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
});


