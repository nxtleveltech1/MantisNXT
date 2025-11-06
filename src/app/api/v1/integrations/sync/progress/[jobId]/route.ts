/**
 * Real-Time Sync Progress SSE Endpoint
 *
 * GET /api/v1/integrations/sync/progress/[jobId]
 *
 * Server-Sent Events (SSE) streaming endpoint for real-time sync progress tracking.
 *
 * Features:
 * - Streams progress updates every 500ms
 * - Multiple event types: progress, metrics, completion, error
 * - Proper headers for HTTP streaming
 * - Graceful client disconnect handling
 * - Organization-level access control
 * - Automatic timeout after job completion + 1 minute
 *
 * Response Format (text/event-stream):
 * ```
 * event: progress
 * data: {"processedCount": 100, "failedCount": 2, "totalItems": 500}
 *
 * event: metrics
 * data: {"itemsPerMin": 120, "etaSeconds": 180, "elapsedSeconds": 200}
 *
 * event: completion
 * data: {"status": "completed", "totalTime": 245}
 * ```
 *
 * @author Claude Code
 * @date 2025-11-06
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, handleError } from '@/lib/auth/middleware';
import { syncProgressTracker } from '@/lib/services/SyncProgressTracker';

interface RouteParams {
  params: {
    jobId: string;
  };
}

/**
 * SSE Endpoint: Stream real-time progress updates
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = params;

  // Validate jobId format (UUID)
  if (!jobId || !/^[0-9a-f-]{36}$/i.test(jobId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid job ID format' },
      { status: 400 }
    );
  }

  try {
    // Authentication
    const user = await authenticateRequest(request);

    // Verify job ownership (organization-level access control)
    const progress = await syncProgressTracker.getProgress(jobId);
    if (!progress) {
      return NextResponse.json(
        { success: false, error: 'Sync job not found' },
        { status: 404 }
      );
    }

    // Verify org access
    if (progress.orgId !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: job belongs to different organization' },
        { status: 403 }
      );
    }

    // Create abort controller for connection timeout
    const abortController = new AbortController();
    const timeoutDuration =
      progress.status === 'running'
        ? 30 * 60 * 1000 // 30 min for running jobs
        : 60 * 1000; // 1 min for completed jobs

    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeoutDuration);

    // Create readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial state
          await sendEvent(controller, 'connected', {
            jobId,
            status: progress.status,
            timestamp: new Date().toISOString(),
          });

          let updateCount = 0;
          const updateIntervalMs = 500; // 500ms update frequency
          const maxUpdatesPerJob = 3600; // Max 30 min of updates @ 500ms

          // Subscription callback
          const handleUpdate = async (data: any) => {
            if (updateCount >= maxUpdatesPerJob) return;

            try {
              const currentProgress = await syncProgressTracker.getProgress(jobId);
              if (!currentProgress) return;

              // Send progress event
              await sendEvent(controller, 'progress', {
                processedCount: currentProgress.processedCount,
                failedCount: currentProgress.failedCount,
                totalItems: currentProgress.totalItems,
                timestamp: new Date().toISOString(),
              });

              // Send metrics event every 2nd update (1 second)
              if (updateCount % 2 === 0) {
                try {
                  const metrics = await syncProgressTracker.calculateMetrics(jobId);
                  await sendEvent(controller, 'metrics', metrics);
                } catch (error) {
                  console.warn('Metrics calculation error:', error);
                }
              }

              // Send completion event when done
              if (
                currentProgress.status === 'completed' ||
                currentProgress.status === 'failed' ||
                currentProgress.status === 'cancelled'
              ) {
                await sendEvent(controller, 'completion', {
                  status: currentProgress.status,
                  totalTime: Math.floor(
                    (currentProgress.completedAt!.getTime() -
                      currentProgress.startedAt.getTime()) /
                      1000
                  ),
                  processedCount: currentProgress.processedCount,
                  failedCount: currentProgress.failedCount,
                  timestamp: new Date().toISOString(),
                });

                // Close stream 1 minute after completion
                setTimeout(() => {
                  controller.close();
                  clearTimeout(timeoutId);
                }, 60000);
              }

              updateCount++;
            } catch (error) {
              console.error('Update handler error:', error);
              await sendEvent(controller, 'error', {
                message: 'Error processing update',
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          };

          // Subscribe to progress updates
          const unsubscribe = syncProgressTracker.subscribe(jobId, handleUpdate);

          // Polling fallback: fetch progress if no updates for 2 seconds
          let lastUpdateTime = Date.now();
          const pollingInterval = setInterval(async () => {
            const now = Date.now();
            if (now - lastUpdateTime > 2000) {
              // No updates in 2 seconds, manual fetch
              try {
                const currentProgress = await syncProgressTracker.getProgress(jobId);
                if (currentProgress) {
                  lastUpdateTime = now;
                  await handleUpdate(null);
                }
              } catch (error) {
                console.warn('Polling fetch error:', error);
              }
            }
          }, 1000);

          // Cleanup on abort or close
          const cleanup = () => {
            clearInterval(pollingInterval);
            unsubscribe();
            controller.close();
            clearTimeout(timeoutId);
          };

          request.signal.addEventListener('abort', cleanup);
          abortController.signal.addEventListener('abort', cleanup);

          // Initial fetch to trigger first update if status != running
          const initialProgress = await syncProgressTracker.getProgress(jobId);
          if (initialProgress?.status !== 'running') {
            await handleUpdate(null);
          }
        } catch (error) {
          console.error('SSE stream start error:', error);
          try {
            await sendEvent(controller, 'error', {
              message: 'Stream initialization error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          } catch (e) {
            // Ignore send errors during error handling
          }
          controller.close();
          clearTimeout(timeoutId);
        }
      },
    });

    // Return SSE response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Send SSE event to client
 */
async function sendEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  eventType: string,
  data: Record<string, any>
): Promise<void> {
  try {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoded = new TextEncoder().encode(message);
    controller.enqueue(encoded);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('closed')) {
      // Stream closed by client, ignore
      return;
    }
    console.error(`Error sending ${eventType} event:`, error);
    throw error;
  }
}

/**
 * OPTIONS: CORS preflight support
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
