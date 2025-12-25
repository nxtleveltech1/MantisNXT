// UPDATE: [2025-12-25] Added on-demand agreement generation with DocuStore integration

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth-helper';
import { 
  getAgreementByReservation, 
  getOrGenerateAgreement,
  getReservationForAgreement,
  generateAgreementPDF,
} from '@/services/rentals/agreementService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Use getOrGenerate to automatically create agreement if it doesn't exist
    const agreement = await getOrGenerateAgreement(id, user.userId);

    if (!agreement) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: agreement });
  } catch (error) {
    console.error('Error in GET /api/rentals/reservations/[id]/agreement:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch agreement',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Regenerate agreement PDF (force regeneration)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Get existing agreement
    const agreement = await getAgreementByReservation(id);
    if (!agreement) {
      // Create new agreement
      const newAgreement = await getOrGenerateAgreement(id, user.userId);
      if (!newAgreement) {
        return NextResponse.json(
          { success: false, error: 'NOT_FOUND', message: 'Reservation not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: newAgreement });
    }
    
    // Regenerate PDF for existing agreement
    const reservation = await getReservationForAgreement(id);
    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Reservation not found' },
        { status: 404 }
      );
    }
    
    const pdfResult = await generateAgreementPDF(agreement, reservation, user.userId);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...agreement,
        document_id: pdfResult.documentId,
        artifact_id: pdfResult.artifactId,
      }
    });
  } catch (error) {
    console.error('Error in POST /api/rentals/reservations/[id]/agreement:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate agreement',
      },
      { status: 500 }
    );
  }
}

