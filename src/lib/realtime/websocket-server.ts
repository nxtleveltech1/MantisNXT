// @ts-nocheck

/**
 * Real-Time WebSocket Server for Live Data Synchronization
 * Handles real-time updates for all 102 enterprise tables
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { db } from '../database';

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'error' | 'heartbeat';
  channel?: string;
  table?: string;
  data?: unknown;
  timestamp: string;
  clientId: string;
}

export interface SubscriptionFilter {
  table: string;
  organizationId?: string;
  userId?: string;
  filters?: Record<string, unknown>;
}

export class RealTimeWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<SubscriptionFilter>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private port: number = 3001) {
    super();
    this.initialize();
  }

  /**
   * Initialize WebSocket server
   */
  private async initialize(): Promise<void> {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      console.log(`🔌 Client connected: ${clientId} (${this.clients.size} total)`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'data',
        data: { message: 'Connected to MantisNXT Real-Time Server', clientId },
        timestamp: new Date().toISOString(),
        clientId
      });

      // Handle client messages
      ws.on('message', (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error('❌ Invalid message from client:', error);
          this.sendError(clientId, 'Invalid message format');
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for client ${clientId}:`, error);
        this.handleClientDisconnect(clientId);
      });
    });

    // Start heartbeat
    this.startHeartbeat();

    // Listen to database changes
    await this.listenToDatabaseChanges();

    console.log(`🚀 Real-Time WebSocket server running on port ${this.port}`);
  }

  /**
   * Handle client messages
   */
  private handleClientMessage(clientId: string, message: WebSocketMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(clientId, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(clientId, message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(clientId);
        break;
      default:
        this.sendError(clientId, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle subscription requests
   */
  private handleSubscription(clientId: string, message: WebSocketMessage): void {
    if (!message.table) {
      this.sendError(clientId, 'Table name required for subscription');
      return;
    }

    const subscription: SubscriptionFilter = {
      table: message.table,
      organizationId: message.data?.organizationId,
      userId: message.data?.userId,
      filters: message.data?.filters || {}
    };

    // Add subscription for client
    if (!this.subscriptions.has(clientId)) {
      this.subscriptions.set(clientId, new Set());
    }
    this.subscriptions.get(clientId)!.add(subscription);

    // Confirm subscription
    this.sendToClient(clientId, {
      type: 'data',
      data: {
        message: `Subscribed to ${message.table}`,
        subscription
      },
      timestamp: new Date().toISOString(),
      clientId
    });

    console.log(`📡 Client ${clientId} subscribed to ${message.table}`);
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscription(clientId: string, message: WebSocketMessage): void {
    const clientSubscriptions = this.subscriptions.get(clientId);
    if (!clientSubscriptions) return;

    if (message.table) {
      // Remove specific table subscription
      for (const sub of clientSubscriptions) {
        if (sub.table === message.table) {
          clientSubscriptions.delete(sub);
          break;
        }
      }
    } else {
      // Remove all subscriptions
      clientSubscriptions.clear();
    }

    this.sendToClient(clientId, {
      type: 'data',
      data: { message: `Unsubscribed from ${message.table || 'all tables'}` },
      timestamp: new Date().toISOString(),
      clientId
    });
  }

  /**
   * Handle heartbeat
   */
  private handleHeartbeat(clientId: string): void {
    this.sendToClient(clientId, {
      type: 'heartbeat',
      data: { alive: true },
      timestamp: new Date().toISOString(),
      clientId
    });
  }

  /**
   * Listen to database changes
   */
  private async listenToDatabaseChanges(): Promise<void> {
    await db.listen('table_changes', (payload) => {
      try {
        const change = JSON.parse(payload);
        this.broadcastTableChange(change);
      } catch (error) {
        console.error('❌ Error parsing database change:', error);
      }
    });

    console.log('🔔 Listening for database changes...');
  }

  /**
   * Broadcast table changes to subscribed clients
   */
  private broadcastTableChange(change: unknown): void {
    const { operation, table, record } = change;

    for (const [clientId, subscriptions] of this.subscriptions) {
      for (const subscription of subscriptions) {
        if (subscription.table === table) {
          // Check if change matches subscription filters
          if (this.matchesSubscriptionFilters(record, subscription)) {
            this.sendToClient(clientId, {
              type: 'data',
              data: {
                operation,
                table,
                record,
                timestamp: change.timestamp
              },
              timestamp: new Date().toISOString(),
              clientId
            });
          }
        }
      }
    }
  }

  /**
   * Check if record matches subscription filters
   */
  private matchesSubscriptionFilters(record: unknown, subscription: SubscriptionFilter): boolean {
    // Organization filter
    if (subscription.organizationId && record.organization_id !== subscription.organizationId) {
      return false;
    }

    // User filter
    if (subscription.userId && record.user_id !== subscription.userId) {
      return false;
    }

    // Custom filters
    if (subscription.filters) {
      for (const [key, value] of Object.entries(subscription.filters)) {
        if (record[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Error sending message to client ${clientId}:`, error);
        this.handleClientDisconnect(clientId);
      }
    }
  }

  /**
   * Send error message to client
   */
  private sendError(clientId: string, error: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      data: { error },
      timestamp: new Date().toISOString(),
      clientId
    });
  }

  /**
   * Broadcast message to all clients
   */
  public broadcast(message: Omit<WebSocketMessage, 'clientId'>): void {
    for (const clientId of this.clients.keys()) {
      this.sendToClient(clientId, { ...message, clientId });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(clientId: string): void {
    this.clients.delete(clientId);
    this.subscriptions.delete(clientId);
    console.log(`🔌 Client disconnected: ${clientId} (${this.clients.size} remaining)`);
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      });
    }, 30000); // 30 seconds
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get server status
   */
  public getStatus() {
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce((sum, subs) => sum + subs.size, 0),
      port: this.port,
      uptime: process.uptime()
    };
  }

  /**
   * Shutdown server
   */
  public async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.close();
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    console.log('🔌 Real-Time WebSocket server shut down');
  }
}

// Singleton instance
export const realtimeServer = new RealTimeWebSocketServer(
  parseInt(process.env.WEBSOCKET_PORT || '3001')
);

export default realtimeServer;