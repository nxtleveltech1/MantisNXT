import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AlertService } from '@/lib/services/pricing-intel/AlertService';
import { getOrgId } from '../../_helpers';

const configureSchema = z.object({
  orgId: z.string().uuid(),
  alert_type: z.string(),
  enabled: z.boolean(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  threshold_percent: z.number().optional(),
  threshold_amount: z.number().optional(),
  competitor_id: z.string().uuid().optional(),
  notification_channels: z.array(z.string()),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orgId = await getOrgId(request, body);

    const validated = configureSchema.parse({ ...body, orgId });

    const alertService = new AlertService();

    // Configure alert threshold
    await alertService.configureAlert(orgId, {
      alertType: validated.alert_type,
      severity: validated.severity,
      thresholdConfig: {
        percent: validated.threshold_percent,
        amount: validated.threshold_amount,
        competitorId: validated.competitor_id,
        notificationChannels: validated.notification_channels,
        ...validated.metadata,
      },
      enabled: validated.enabled,
    });

    return NextResponse.json({ data: { success: true }, error: null });
  } catch (error) {
    console.error('Error configuring alert:', error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to configure alert',
        },
      },
      { status: 500 }
    );
  }
}
