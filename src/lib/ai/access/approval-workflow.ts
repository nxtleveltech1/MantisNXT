/**
 * Approval Workflow
 * Manages the approval flow for actions requiring human approval
 */

import { EventEmitter } from 'events';
import {
  PendingAction,
  ApprovalRequest,
  ApprovalResponse,
  AccessContext,
  ResourceType,
  ApprovalRequiredError,
  ApprovalTimeoutError,
  ApprovalDeniedError,
} from './types';
import { ActionQueue } from './action-queue';

export class ApprovalWorkflow extends EventEmitter {
  constructor(
    private actionQueue: ActionQueue,
    private defaultTimeoutMs: number = 300000 // 5 minutes
  ) {
    super();
    this.setupQueueListeners();
  }

  /**
   * Request approval for an action
   */
  async requestApproval(
    action: PendingAction,
    context: AccessContext,
    timeoutMs?: number
  ): Promise<ApprovalResponse> {
    const approvalRequest = this.createApprovalRequest(action);

    // Send notification (stub for future implementation)
    this.sendNotification(context.userId, approvalRequest);

    // Enqueue the action
    this.actionQueue.enqueue(action);

    // Wait for approval with timeout
    try {
      return await this.actionQueue.waitForApproval(action.id, timeoutMs || this.defaultTimeoutMs);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Approval timeout')) {
        throw new ApprovalTimeoutError(
          `Approval request timed out for action ${action.id}`,
          action.id,
          timeoutMs || this.defaultTimeoutMs
        );
      }
      throw error;
    }
  }

  /**
   * Create an approval request from a pending action
   */
  createApprovalRequest(action: PendingAction): ApprovalRequest {
    const summary = this.generateSummary(action);
    const expiresAt = new Date(Date.now() + this.defaultTimeoutMs);

    return {
      actionId: action.id,
      userId: action.context.userId,
      orgId: action.context.orgId,
      summary,
      details: {
        resource: action.context.requestedResource,
        action: action.context.requestedAction,
        toolName: action.context.toolName,
        parameters: action.parameters,
        potentialImpact: this.assessPotentialImpact(action),
      },
      requestedAt: action.requestedAt,
      expiresAt,
      priority: this.determinePriority(action),
    };
  }

  /**
   * Send notification to user (stub for future implementation)
   */
  sendNotification(userId: string, request: ApprovalRequest): void {
    // TODO: Implement actual notification system
    // This could integrate with email, Slack, in-app notifications, etc.
    this.emit('notificationSent', { userId, request });

    // For now, just log
    console.log(`[APPROVAL REQUEST] User ${userId}: ${request.summary}`);
  }

  /**
   * Handle approval timeout
   */
  handleApprovalTimeout(actionId: string): void {
    const action = this.actionQueue.dequeue(actionId);
    if (action) {
      this.emit('approvalTimeout', { actionId, action });
    }
  }

  /**
   * Allow user to modify action before approval
   */
  modifyAction(actionId: string, modifications: Record<string, unknown>): PendingAction | null {
    const action = this.actionQueue.dequeue(actionId);
    if (!action) {
      return null;
    }

    // Apply modifications to parameters
    action.parameters = { ...action.parameters, ...modifications };

    // Re-enqueue with modifications
    this.actionQueue.enqueue(action);

    this.emit('actionModified', { actionId, modifications, action });

    return action;
  }

  /**
   * Generate human-readable summary of what the action will do
   */
  generateSummary(action: PendingAction): string {
    const { requestedResource, requestedAction, toolName } = action.context;

    let summary = `AI requests to ${requestedAction} on ${requestedResource}`;

    if (toolName) {
      summary += ` using tool "${toolName}"`;
    }

    // Add context-specific details
    switch (requestedResource) {
      case 'inventory':
        summary += this.summarizeInventoryAction(action);
        break;
      case 'orders':
        summary += this.summarizeOrderAction(action);
        break;
      case 'customers':
        summary += this.summarizeCustomerAction(action);
        break;
      case 'suppliers':
        summary += this.summarizeSupplierAction(action);
        break;
      case 'analytics':
        summary += ' (data analysis operation)';
        break;
      case 'settings':
        summary += ' (system configuration change)';
        break;
    }

    return summary;
  }

  /**
   * Escalate approval for complex actions
   */
  escalate(actionId: string, reason: string): void {
    const action = this.actionQueue.dequeue(actionId);
    if (!action) {
      throw new Error(`Action ${actionId} not found`);
    }

    // Mark for escalation (could involve multiple approvers, managers, etc.)
    action.status = 'pending'; // Keep pending but mark as escalated

    this.emit('actionEscalated', { actionId, reason, action });

    // Re-enqueue with escalation flag
    this.actionQueue.enqueue(action);
  }

  /**
   * Get pending approvals for a user
   */
  getPendingApprovals(userId: string, orgId: string): ApprovalRequest[] {
    const actions = this.actionQueue.getQueuedActions(userId, orgId);
    return actions.map(action => this.createApprovalRequest(action));
  }

  /**
   * Approve an action
   */
  approveAction(
    actionId: string,
    approverId: string,
    reason?: string,
    modifications?: Record<string, unknown>
  ): void {
    // Apply modifications if provided
    if (modifications) {
      this.modifyAction(actionId, modifications);
    }

    const response: ApprovalResponse = {
      actionId,
      approved: true,
      approvedBy: approverId,
      approvedAt: new Date(),
      reason,
      modifications,
    };

    this.actionQueue.markApproved(actionId, response);
  }

  /**
   * Deny an action
   */
  denyAction(actionId: string, approverId: string, reason: string): void {
    this.actionQueue.markDenied(actionId, reason);

    const response: ApprovalResponse = {
      actionId,
      approved: false,
      approvedBy: approverId,
      approvedAt: new Date(),
      reason,
    };

    this.emit('actionDenied', { actionId, response });
  }

  /**
   * Set up listeners for queue events
   */
  private setupQueueListeners(): void {
    this.actionQueue.on('actionApproved', (event) => {
      this.emit('approvalGranted', event);
    });

    this.actionQueue.on('actionDenied', (event) => {
      this.emit('approvalDenied', event);
    });

    this.actionQueue.on('actionExpired', (event) => {
      this.emit('approvalExpired', event);
    });
  }

  /**
   * Assess potential impact of an action
   */
  private assessPotentialImpact(action: PendingAction): string {
    const { requestedResource, requestedAction } = action.context;

    // Simple impact assessment based on resource and action type
    const impactMatrix: Record<ResourceType, Record<string, string>> = {
      inventory: {
        create: 'Low - Adding new inventory items',
        update: 'Medium - Modifying existing inventory',
        delete: 'High - Removing inventory items',
        read: 'None - Read-only access',
      },
      suppliers: {
        create: 'Medium - Adding new supplier relationships',
        update: 'Medium - Modifying supplier information',
        delete: 'High - Removing supplier relationships',
        read: 'None - Read-only access',
      },
      orders: {
        create: 'High - Creating new orders',
        update: 'High - Modifying existing orders',
        delete: 'Critical - Canceling/deleting orders',
        read: 'None - Read-only access',
      },
      customers: {
        create: 'Medium - Adding new customers',
        update: 'Medium - Modifying customer data',
        delete: 'High - Removing customer records',
        read: 'None - Read-only access',
      },
      analytics: {
        create: 'Low - Generating new reports',
        update: 'Low - Updating report configurations',
        delete: 'Medium - Removing reports',
        read: 'None - Read-only access',
      },
      settings: {
        create: 'High - Adding new system settings',
        update: 'High - Modifying system configuration',
        delete: 'Critical - Removing system settings',
        read: 'None - Read-only access',
      },
    };

    return impactMatrix[requestedResource]?.[requestedAction] || 'Unknown impact';
  }

  /**
   * Determine approval priority
   */
  private determinePriority(action: PendingAction): 'low' | 'medium' | 'high' | 'critical' {
    const impact = this.assessPotentialImpact(action);

    if (impact.includes('Critical')) return 'critical';
    if (impact.includes('High')) return 'high';
    if (impact.includes('Medium')) return 'medium';
    return 'low';
  }

  /**
   * Generate resource-specific summaries
   */
  private summarizeInventoryAction(action: PendingAction): string {
    // Could analyze parameters to provide more specific summaries
    return ' (inventory management operation)';
  }

  private summarizeOrderAction(action: PendingAction): string {
    return ' (order processing operation)';
  }

  private summarizeCustomerAction(action: PendingAction): string {
    return ' (customer data operation)';
  }

  private summarizeSupplierAction(action: PendingAction): string {
    return ' (supplier management operation)';
  }
}

// Default instance
export const approvalWorkflow = new ApprovalWorkflow(actionQueue);