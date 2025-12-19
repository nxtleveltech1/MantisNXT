import { NextRequest } from 'next/server';
import { getOrgId } from '@/app/api/v1/sales/_helpers';
import { DeliveryTrackingService } from '@/lib/services/logistics/DeliveryTrackingService';

/**
 * Server-Sent Events (SSE) endpoint for real-time delivery updates
 * Next.js doesn't natively support WebSocket, so we use SSE instead
 */
export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');
    const clientId = searchParams.get('clientId') || Math.random().toString(36).substring(2, 11);

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Send initial connection message
        const sendMessage = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        sendMessage({
          type: 'CONNECTED',
          clientId,
          deliveryId: deliveryId || 'all',
          timestamp: new Date().toISOString(),
        });

        // Poll for updates every 5 seconds
        const pollInterval = setInterval(async () => {
          try {
            if (deliveryId) {
              // Poll specific delivery
              const result = await DeliveryTrackingService.pollProviderForStatus(
                deliveryId,
                orgId
              );

              if (result.statusUpdated) {
                sendMessage({
                  type: 'STATUS_UPDATE',
                  deliveryId,
                  status: result.newStatus,
                  timestamp: new Date().toISOString(),
                });
              }

              // Send latest tracking info
              const trackingInfo = await DeliveryTrackingService.getTrackingInfo(
                deliveryId,
                orgId
              );
              sendMessage({
                type: 'TRACKING_UPDATE',
                deliveryId,
                data: trackingInfo,
                timestamp: new Date().toISOString(),
              });
            } else {
              // Poll all active deliveries (for dashboard)
              await DeliveryTrackingService.pollAllActiveDeliveries(orgId);
              sendMessage({
                type: 'POLL_COMPLETE',
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error('Error in SSE polling:', error);
            sendMessage({
              type: 'ERROR',
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            });
          }
        }, 5000); // Poll every 5 seconds

        // Cleanup on client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(pollInterval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering for nginx
      },
    });
  } catch (error) {
    console.error('Error setting up SSE connection:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to establish connection',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * POST endpoint for sending messages/commands
 */
export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json();
    const { type, data, clientId } = body;

    switch (type) {
      case 'SUBSCRIBE_DELIVERY':
        return Response.json({
          type: 'SUBSCRIPTION_CONFIRMED',
          deliveryId: data.deliveryId,
          clientId,
          timestamp: new Date().toISOString(),
        });

      case 'REQUEST_UPDATE':
        if (data.deliveryId) {
          const result = await DeliveryTrackingService.pollProviderForStatus(
            data.deliveryId,
            orgId
          );
          return Response.json({
            type: 'UPDATE_RESPONSE',
            deliveryId: data.deliveryId,
            statusUpdated: result.statusUpdated,
            newStatus: result.newStatus,
            timestamp: new Date().toISOString(),
          });
        }
        return Response.json({ error: 'deliveryId required' }, { status: 400 });

      default:
        return Response.json({ error: 'Unknown message type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error handling POST request:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process request',
      },
      { status: 500 }
    );
  }
}

