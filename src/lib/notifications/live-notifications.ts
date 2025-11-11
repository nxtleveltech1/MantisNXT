/**
 * Live Notification System
 * Real-time alerts and messaging with database integration
 */

import { EventEmitter } from 'events';
import { db } from '../database';
import { realtimeServer } from '../realtime/websocket-server';

export interface Notification {
  id: string;
  userId: string;
  organizationId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: unknown;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: NotificationChannel[];
  scheduledAt?: string;
  expiresAt?: string;
  createdAt: string;
  readAt?: string;
}

export interface NotificationChannel {
  type: 'in_app' | 'email' | 'sms' | 'push' | 'webhook';
  target: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  error?: string;
}

export interface NotificationRule {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  trigger: NotificationTrigger;
  conditions: NotificationCondition[];
  actions: NotificationAction[];
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  rateLimiting?: RateLimitConfig;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationTrigger {
  type: 'database_change' | 'schedule' | 'api_event' | 'threshold' | 'manual';
  table?: string;
  operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  schedule?: string; // Cron expression
  event?: string;
  threshold?: ThresholdConfig;
}

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  value: unknown;
}

export interface NotificationAction {
  type: 'send_notification' | 'create_task' | 'send_email' | 'call_webhook';
  template: string;
  channels: string[];
  recipients: NotificationRecipient[];
  data?: unknown;
}

export interface NotificationRecipient {
  type: 'user' | 'role' | 'email' | 'phone';
  value: string;
}

export interface ThresholdConfig {
  metric: string;
  value: number;
  comparison: 'greater_than' | 'less_than' | 'equals';
  duration?: number; // seconds
}

export interface RateLimitConfig {
  maxNotifications: number;
  windowMs: number;
  perUser?: boolean;
}

export class LiveNotificationSystem extends EventEmitter {
  private notificationRules: Map<string, NotificationRule> = new Map();
  private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize notification system
   */
  private async initialize(): Promise<void> {
    try {
      // Load notification rules from database
      await this.loadNotificationRules();

      // Listen to database changes for rule triggers
      await this.setupDatabaseTriggers();

      // Setup scheduled notifications
      await this.setupScheduledNotifications();

      console.log('🔔 Live notification system initialized');

    } catch (error) {
      console.error('❌ Failed to initialize notification system:', error);
    }
  }

  /**
   * Load notification rules from database
   */
  private async loadNotificationRules(): Promise<void> {
    const query = `
      SELECT * FROM notification_rules
      WHERE enabled = true
      ORDER BY priority DESC, created_at ASC
    `;

    const result = await db.query(query);

    for (const row of result.rows) {
      const rule: NotificationRule = {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        description: row.description,
        trigger: JSON.parse(row.trigger),
        conditions: JSON.parse(row.conditions || '[]'),
        actions: JSON.parse(row.actions),
        enabled: row.enabled,
        priority: row.priority,
        rateLimiting: row.rate_limiting ? JSON.parse(row.rate_limiting) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      this.notificationRules.set(rule.id, rule);
    }

    console.log(`📋 Loaded ${this.notificationRules.size} notification rules`);
  }

  /**
   * Setup database change triggers
   */
  private async setupDatabaseTriggers(): Promise<void> {
    // Listen for table changes
    await db.listen('table_changes', (payload) => {
      try {
        const change = JSON.parse(payload);
        this.handleDatabaseChange(change);
      } catch (error) {
        console.error('❌ Error processing database change:', error);
      }
    });

    console.log('🔔 Database triggers setup complete');
  }

  /**
   * Handle database changes and check notification rules
   */
  private async handleDatabaseChange(change: unknown): Promise<void> {
    const { operation, table, record } = change;

    // Find matching rules
    const matchingRules = Array.from(this.notificationRules.values()).filter(rule =>
      rule.trigger.type === 'database_change' &&
      rule.trigger.table === table &&
      (!rule.trigger.operation || rule.trigger.operation === operation)
    );

    for (const rule of matchingRules) {
      try {
        // Check conditions
        if (await this.evaluateConditions(rule.conditions, record)) {
          // Check rate limiting
          if (await this.checkRateLimit(rule, record.organization_id || '', record.user_id || '')) {
            // Execute actions
            await this.executeActions(rule, { change, record });
          }
        }
      } catch (error) {
        console.error(`❌ Error processing rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Evaluate notification conditions
   */
  private async evaluateConditions(conditions: NotificationCondition[], data: unknown): Promise<boolean> {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = data[condition.field];

      const result = this.evaluateCondition(fieldValue, condition.operator, condition.value);
      if (!result) return false;
    }

    return true;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(fieldValue: unknown, operator: string, expectedValue: unknown): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      case 'regex':
        return new RegExp(expectedValue).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(rule: NotificationRule, organizationId: string, userId: string): Promise<boolean> {
    if (!rule.rateLimiting) return true;

    const key = rule.rateLimiting.perUser
      ? `${rule.id}:${userId}`
      : `${rule.id}:${organizationId}`;

    const now = Date.now();
    const counter = this.rateLimitCounters.get(key);

    if (!counter || now > counter.resetTime) {
      // Reset or create counter
      this.rateLimitCounters.set(key, {
        count: 1,
        resetTime: now + rule.rateLimiting.windowMs
      });
      return true;
    }

    if (counter.count >= rule.rateLimiting.maxNotifications) {
      console.log(`⚠️ Rate limit exceeded for rule ${rule.id}`);
      return false;
    }

    counter.count++;
    this.rateLimitCounters.set(key, counter);
    return true;
  }

  /**
   * Execute notification actions
   */
  private async executeActions(rule: NotificationRule, context: unknown): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'send_notification':
            await this.sendNotification(rule, action, context);
            break;
          case 'send_email':
            await this.sendEmail(rule, action, context);
            break;
          case 'call_webhook':
            await this.callWebhook(rule, action, context);
            break;
          case 'create_task':
            await this.createTask(rule, action, context);
            break;
          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      } catch (error) {
        console.error(`❌ Error executing action ${action.type}:`, error);
      }
    }
  }

  /**
   * Send in-app notification
  */
  private async sendNotification(rule: NotificationRule, action: NotificationAction, context: unknown): Promise<void> {
    // Process template
    const title = this.processTemplate(action.template, context);
    const message = this.processTemplate(action.data?.message || '', context);

    // Get recipients
    const recipients = await this.resolveRecipients(action.recipients, rule.organizationId);

    for (const recipient of recipients) {
      const notification: Notification = {
        id: this.generateNotificationId(),
        userId: recipient,
        organizationId: rule.organizationId,
        type: this.mapPriorityToType(rule.priority),
        title,
        message,
        data: action.data || {},
        read: false,
        priority: rule.priority,
        channels: action.channels.map(channel => ({
          type: channel as unknown,
          target: recipient,
          status: 'pending'
        })),
        createdAt: new Date().toISOString()
      };

      // Save to database
      await this.saveNotification(notification);

      // Send real-time notification
      await this.sendRealTimeNotification(notification);

      // Emit event
      this.emit('notification_sent', notification);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(rule: NotificationRule, action: NotificationAction, context: unknown): Promise<void> {
    // Email sending logic would go here
    console.log(`📧 Sending email notification for rule ${rule.id}`, {
      template: action.template,
      recipientCount: action.recipients.length,
      context
    });
  }

  /**
   * Call webhook
   */
  private async callWebhook(rule: NotificationRule, action: NotificationAction, context: unknown): Promise<void> {
    // Webhook calling logic would go here
    console.log(`🔗 Calling webhook for rule ${rule.id}`, {
      channels: action.channels,
      data: action.data,
      context
    });
  }

  /**
   * Create task
   */
  private async createTask(rule: NotificationRule, action: NotificationAction, context: unknown): Promise<void> {
    // Task creation logic would go here
    console.log(`📋 Creating task for rule ${rule.id}`, {
      template: action.template,
      context
    });
  }

  /**
   * Save notification to database
   */
  private async saveNotification(notification: Notification): Promise<void> {
    const query = `
      INSERT INTO notifications (
        id, user_id, organization_id, type, title, message, data,
        read, priority, channels, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    await db.query(query, [
      notification.id,
      notification.userId,
      notification.organizationId,
      notification.type,
      notification.title,
      notification.message,
      JSON.stringify(notification.data),
      notification.read,
      notification.priority,
      JSON.stringify(notification.channels),
      notification.createdAt
    ]);
  }

  /**
   * Send real-time notification via WebSocket
   */
  private async sendRealTimeNotification(notification: Notification): Promise<void> {
    realtimeServer.broadcast({
      type: 'data',
      data: {
        type: 'notification',
        notification
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Process template with context variables
   */
  private processTemplate(template: string, context: unknown): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const keys = variable.trim().split('.');
      let value = context;

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return match; // Return original if variable not found
        }
      }

      return String(value);
    });
  }

  /**
   * Resolve recipients from recipient configurations
   */
  private async resolveRecipients(recipients: NotificationRecipient[], organizationId: string): Promise<string[]> {
    const userIds: string[] = [];

    for (const recipient of recipients) {
      try {
        switch (recipient.type) {
          case 'user':
            userIds.push(recipient.value);
            break;

          case 'role': {
            const roleQuery = `
              SELECT u.id FROM users u
              JOIN user_roles ur ON u.id = ur.user_id
              JOIN roles r ON ur.role_id = r.id
              WHERE r.name = $1 AND u.organization_id = $2
            `;
            const roleResult = await db.query(roleQuery, [recipient.value, organizationId]);
            userIds.push(...roleResult.rows.map(row => row.id));
            break;
          }

          case 'email': {
            const emailQuery = `
              SELECT id FROM users
              WHERE email = $1 AND organization_id = $2
            `;
            const emailResult = await db.query(emailQuery, [recipient.value, organizationId]);
            userIds.push(...emailResult.rows.map(row => row.id));
            break;
          }

          default:
            console.warn(`Unknown recipient type: ${recipient.type}`);
        }
      } catch (error) {
        console.error(`❌ Error resolving recipient ${recipient.value}:`, error);
      }
    }

    return [...new Set(userIds)]; // Remove duplicates
  }

  /**
   * Map priority to notification type
   */
  private mapPriorityToType(priority: string): 'info' | 'success' | 'warning' | 'error' {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'info';
    }
  }

  /**
   * Setup scheduled notifications
   */
  private async setupScheduledNotifications(): Promise<void> {
    // Scheduled notification logic would go here
    console.log('⏰ Scheduled notifications setup complete');
  }

  /**
   * Generate notification ID
   */
  private generateNotificationId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get notifications for user
   */
  async getUserNotifications(
    userId: string,
    organizationId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { page = 1, limit = 50, unreadOnly = false } = options;
    const offset = (page - 1) * limit;

    const whereClause = unreadOnly
      ? 'WHERE user_id = $1 AND organization_id = $2 AND read = false'
      : 'WHERE user_id = $1 AND organization_id = $2';

    const countQuery = `SELECT COUNT(*) as total FROM notifications ${whereClause}`;
    const dataQuery = `
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const [countResult, dataResult] = await Promise.all([
      db.query(countQuery, [userId, organizationId]),
      db.query(dataQuery, [userId, organizationId, limit, offset])
    ]);

    const notifications = dataResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: JSON.parse(row.data || '{}'),
      read: row.read,
      priority: row.priority,
      channels: JSON.parse(row.channels || '[]'),
      scheduledAt: row.scheduled_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      readAt: row.read_at
    }));

    return {
      notifications,
      total: parseInt(countResult.rows[0].total)
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE notifications
        SET read = true, read_at = NOW()
        WHERE id = $1 AND user_id = $2
      `;

      const result = await db.query(query, [notificationId, userId]);
      return result.rowCount ? result.rowCount > 0 : false;

    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Create manual notification
   */
  async createManualNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
    const fullNotification: Notification = {
      ...notification,
      id: this.generateNotificationId(),
      createdAt: new Date().toISOString()
    };

    await this.saveNotification(fullNotification);
    await this.sendRealTimeNotification(fullNotification);

    this.emit('notification_sent', fullNotification);

    return fullNotification.id;
  }
}

// Singleton instance
export const liveNotifications = new LiveNotificationSystem();

export default liveNotifications;
