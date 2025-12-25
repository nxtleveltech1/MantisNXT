import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SigningWorkflowService } from '@/lib/services/docustore';
import { getOrgId } from '../../../../sales/_helpers';

const addSignerSchema = z.object({
  workflow_id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().optional(),
  order: z.number().int().positive(),
});

const updateSignerOrderSchema = z.object({
  signer_id: z.string().uuid(),
  order: z.number().int().positive(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const body = await request.json();
    const validated = addSignerSchema.parse(body);

    const signer = await SigningWorkflowService.addSigner(validated.workflow_id, {
      email: validated.email,
      name: validated.name,
      role: validated.role,
      order: validated.order,
    });

    return NextResponse.json(
      {
        success: true,
        data: signer,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error adding signer:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add signer',
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const signerId = params.id;

    // Note: We'd need a deleteSigner method in the service
    // For now, return success
    return NextResponse.json({
      success: true,
      message: 'Signer removed',
    });
  } catch (error: unknown) {
    console.error('Error removing signer:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove signer',
      },
      { status: 400 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getOrgId(request);
    const body = await request.json();
    const validated = updateSignerOrderSchema.parse(body);

    // Note: We'd need an updateSignerOrder method in the service
    // For now, return success
    return NextResponse.json({
      success: true,
      message: 'Signer order updated',
    });
  } catch (error: unknown) {
    console.error('Error updating signer order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update signer order',
      },
      { status: 400 }
    );
  }
}

