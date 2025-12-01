/**
 * Action Queue
 * Manages pending actions that require approval before execution
 */

import { EventEmitter } from 'events';
import { PendingAction, ApprovalResponse, QueueStats, AccessEvent } from './types';

export class ActionQueue extends EventEmitter {
  private queue = new Map<string, PendingAction>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private maxAgeMs: number = 24 * 60 * 60 * 1000) {
    // 24 hours default
    super();
    this.startCleanupInterval();
  }

  /**
   * Add an action to the approval queue
   */
  enqueue(action: PendingAction): string {
    const actionId = action.id;
    this.queue.set(actionId, action);

    this.emit('actionQueued', {
      type: 'approval_requested',
      actionId,
      userId: action.context.userId,
      orgId: action.context.orgId,
      timestamp: new Date(),
      data: { action },
    } as AccessEvent);

    return actionId;
  }

  /**
   * Retrieve an action from the queue
   */
  dequeue(actionId: string): PendingAction | null {
    return this.queue.get(actionId) || null;
  }

  /**
   * Get all queued actions for a specific user/org
   */
  getQueuedActions(userId: string, orgId: string): PendingAction[] {
    return Array.from(this.queue.values()).filter(
      action =>
        action.context.userId === userId &&
        action.context.orgId === orgId &&
        action.status === 'pending'
    );
  }

  /**
   * Mark an action as approved
   */
  markApproved(actionId: string, response: ApprovalResponse): void {
    const action = this.queue.get(actionId);
    if (!action) {
      throw new Error(`Action ${actionId} not found in queue`);
    }

    action.status = 'approved';
    action.approvalReason = response.reason;
    action.approvedBy = response.approvedBy;
    action.approvedAt = response.approvedAt;

    // Apply any modifications from the approval
    if (response.modifications) {
      action.parameters = { ...action.parameters, ...response.modifications };
    }

    this.emit('actionApproved', {
      type: 'approval_granted',
      actionId,
      userId: action.context.userId,
      orgId: action.context.orgId,
      timestamp: new Date(),
      data: { action, response },
    } as AccessEvent);
  }

  /**
   * Mark an action as denied
   */
  markDenied(actionId: string, reason: string): void {
    const action = this.queue.get(actionId);
    if (!action) {
      throw new Error(`Action ${actionId} not found in queue`);
    }

    action.status = 'denied';
    action.approvalReason = reason;

    this.emit('actionDenied', {
      type: 'approval_denied',
      actionId,
      userId: action.context.userId,
      orgId: action.context.orgId,
      timestamp: new Date(),
      data: { action, reason },
    } as AccessEvent);
  }

  /**
   * Wait for approval with timeout
   */
  async waitForApproval(actionId: string, timeoutMs: number = 300000): Promise<ApprovalResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.markExpired(actionId);
        reject(new Error(`Approval timeout for action ${actionId}`));
      }, timeoutMs);

      const onApproved = (event: AccessEvent) => {
        if (event.actionId === actionId && event.type === 'approval_granted') {
          clearTimeout(timeout);
          this.removeListener('actionApproved', onApproved);
          this.removeListener('actionDenied', onDenied);
          resolve(event.data.response);
        }
      };

      const onDenied = (event: AccessEvent) => {
        if (event.actionId === actionId && event.type === 'approval_denied') {
          clearTimeout(timeout);
          this.removeListener('actionApproved', onApproved);
          this.removeListener('actionDenied', onDenied);
          reject(new Error(`Action ${actionId} was denied: ${event.data.reason}`));
        }
      };

      this.on('actionApproved', onApproved);
      this.on('actionDenied', onDenied);
    });
  }

  /**
   * Mark an action as expired
   */
  private markExpired(actionId: string): void {
    const action = this.queue.get(actionId);
    if (action && action.status === 'pending') {
      action.status = 'expired';

      this.emit('actionExpired', {
        type: 'approval_expired',
        actionId,
        userId: action.context.userId,
        orgId: action.context.orgId,
        timestamp: new Date(),
        data: { action },
      } as AccessEvent);
    }
  }

  /**
   * Clean up expired actions
   */
  expireOldActions(maxAge?: number): number {
    const cutoff = maxAge || this.maxAgeMs;
    const now = Date.now();
    let expiredCount = 0;

    for (const [actionId, action] of this.queue.entries()) {
      if (action.status === 'pending' && now - action.requestedAt.getTime() > cutoff) {
        this.markExpired(actionId);
        expiredCount++;
      }
    }

    return expiredCount;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const actions = Array.from(this.queue.values());
    const pendingActions = actions.filter(a => a.status === 'pending');
    const approvedActions = actions.filter(a => a.status === 'approved');
    const deniedActions = actions.filter(a => a.status === 'denied');
    const expiredActions = actions.filter(a => a.status === 'expired');

    const waitTimes = approvedActions
      .filter(a => a.approvedAt && a.requestedAt)
      .map(a => a.approvedAt!.getTime() - a.requestedAt.getTime());

    const averageWaitTime =
      waitTimes.length > 0 ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length : 0;

    const oldestPending =
      pendingActions.length > 0
        ? pendingActions.reduce((oldest, current) =>
            current.requestedAt < oldest.requestedAt ? current : oldest
          ).requestedAt
        : undefined;

    return {
      totalPending: pendingActions.length,
      totalApproved: approvedActions.length,
      totalDenied: deniedActions.length,
      totalExpired: expiredActions.length,
      averageWaitTime,
      oldestPending,
    };
  }

  /**
   * Remove completed actions from queue (for memory management)
   */
  cleanupCompleted(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    // 7 days default
    const cutoff = Date.now() - maxAge;
    let removedCount = 0;

    for (const [actionId, action] of this.queue.entries()) {
      if (
        action.status !== 'pending' &&
        action.approvedAt &&
        action.approvedAt.getTime() < cutoff
      ) {
        this.queue.delete(actionId);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Cancel a pending action
   */
  cancelAction(actionId: string): boolean {
    const action = this.queue.get(actionId);
    if (action && action.status === 'pending') {
      action.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Get all actions (for debugging/admin purposes)
   */
  getAllActions(): PendingAction[] {
    return Array.from(this.queue.values());
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    // Clean up every hour
    this.cleanupInterval = setInterval(
      () => {
        const expired = this.expireOldActions();
        const cleaned = this.cleanupCompleted();

        if (expired > 0 || cleaned > 0) {
          this.emit('cleanup', { expired, cleaned, timestamp: new Date() });
        }
      },
      60 * 60 * 1000
    ); // 1 hour
  }

  /**
   * Stop cleanup interval (for testing/cleanup)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.size === 0;
  }
}

// Default singleton instance
export const actionQueue = new ActionQueue();
