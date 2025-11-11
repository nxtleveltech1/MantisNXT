/**
 * XLSX Upload API Route - Live Database Processing
 * Real-time file upload with progress tracking and live database integration
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import type { ValidationRule } from '@/lib/integrations/xlsx-processor';
import { xlsxProcessor } from '@/lib/integrations/xlsx-processor';
import { multiTenantAuth } from '@/lib/auth/multi-tenant-auth';

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const authResult = await multiTenantAuth.verifyToken(token);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const user = authResult.user!;

    // Check permissions
    if (!multiTenantAuth.hasPermission(user, 'import.create')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetTable = formData.get('targetTable') as string;
    const sheetName = formData.get('sheetName') as string;
    const skipRows = parseInt(formData.get('skipRows') as string || '0');
    const validateData = formData.get('validateData') === 'true';
    const updateExisting = formData.get('updateExisting') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!targetTable) {
      return NextResponse.json(
        { success: false, error: 'Target table is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only Excel files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Define validation rules based on target table
    const validationRules = getValidationRules(targetTable);

    // Start processing
    const { processId, progress } = await xlsxProcessor.processFile(
      buffer,
      {
        organizationId: user.organizationId,
        userId: user.id,
        targetTable,
        sheetName: sheetName || undefined,
        skipRows,
        batchSize: 100,
        validateData,
        updateExisting
      },
      validationRules
    );

    return NextResponse.json({
      success: true,
      data: {
        processId,
        progress,
        message: 'File upload started successfully'
      }
    });

  } catch (error) {
    console.error('❌ XLSX upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process file' },
      { status: 500 }
    );
  }
}

/**
 * GET - Check upload progress
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const authResult = await multiTenantAuth.verifyToken(token);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('processId');

    if (!processId) {
      return NextResponse.json(
        { success: false, error: 'Process ID is required' },
        { status: 400 }
      );
    }

    const progress = xlsxProcessor.getProcessingStatus(processId);

    if (!progress) {
      return NextResponse.json(
        { success: false, error: 'Process not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('❌ Progress check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check progress' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cancel upload process
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const authResult = await multiTenantAuth.verifyToken(token);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('processId');

    if (!processId) {
      return NextResponse.json(
        { success: false, error: 'Process ID is required' },
        { status: 400 }
      );
    }

    const cancelled = xlsxProcessor.cancelProcessing(processId);

    return NextResponse.json({
      success: cancelled,
      message: cancelled ? 'Process cancelled successfully' : 'Process not found or already completed'
    });

  } catch (error) {
    console.error('❌ Cancel process error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel process' },
      { status: 500 }
    );
  }
}

/**
 * Get validation rules for different tables
 */
function getValidationRules(tableName: string): ValidationRule[] {
  const commonRules = [
    { column: 'organization_id', required: false }, // Added automatically
    { column: 'created_by', required: false } // Added automatically
  ];

  switch (tableName) {
    case 'inventory_items':
      return [
        ...commonRules,
        { column: 'name', required: true, type: 'string', minLength: 1, maxLength: 255 },
        { column: 'sku', required: true, type: 'string', minLength: 1, maxLength: 100 },
        { column: 'cost_price', required: true, type: 'number' },
        { column: 'selling_price', required: true, type: 'number' },
        { column: 'quantity_on_hand', required: false, type: 'number' },
        { column: 'reorder_level', required: false, type: 'number' },
        { column: 'status', required: false, allowedValues: ['active', 'inactive', 'discontinued'] }
      ];

    case 'customers':
      return [
        ...commonRules,
        { column: 'name', required: true, type: 'string', minLength: 1, maxLength: 255 },
        { column: 'email', required: false, type: 'email' },
        { column: 'phone', required: false, type: 'phone' },
        { column: 'status', required: false, allowedValues: ['active', 'inactive', 'suspended'] }
      ];

    case 'suppliers':
      return [
        ...commonRules,
        { column: 'name', required: true, type: 'string', minLength: 1, maxLength: 255 },
        { column: 'contact_email', required: false, type: 'email' },
        { column: 'contact_phone', required: false, type: 'phone' },
        { column: 'status', required: false, allowedValues: ['active', 'inactive', 'suspended'] }
      ];

    case 'products':
      return [
        ...commonRules,
        { column: 'name', required: true, type: 'string', minLength: 1, maxLength: 255 },
        { column: 'price', required: true, type: 'number' },
        { column: 'status', required: false, allowedValues: ['active', 'inactive', 'discontinued'] }
      ];

    default:
      return commonRules;
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}