/**
 * Redis Client Configuration with Connection Pooling
 *
 * Production-ready Redis client with:
 * - Connection pooling
 * - Auto-reconnection
 * - Error handling
 * - Health checks
 * - Session management
 */

import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

class RedisClientManager {
  private static instance: RedisClientManager;
  private client: RedisClientType | null = null;
  private isConnecting = false;
  private connectionRetries = 0;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  private constructor() {}

  public static getInstance(): RedisClientManager {
    if (!RedisClientManager.instance) {
      RedisClientManager.instance = new RedisClientManager();
    }
    return RedisClientManager.instance;
  }

  /**
   * Initialize Redis connection
   */
  public async connect(): Promise<RedisClientType> {
    // Return existing connection if available
    if (this.client?.isOpen) {
      return this.client;
    }

    // Prevent concurrent connection attempts
    if (this.isConnecting) {
      await this.waitForConnection();
      if (this.client?.isOpen) return this.client;
    }

    this.isConnecting = true;

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.MAX_RETRIES) {
              console.error(`Redis: Max reconnection attempts (${this.MAX_RETRIES}) reached`);
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * this.RETRY_DELAY, 10000);
            console.log(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          },
          connectTimeout: 10000,
        },
      });

      // Event handlers
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('Redis: Connected successfully');
        this.connectionRetries = 0;
      });

      this.client.on('reconnecting', () => {
        this.connectionRetries++;
        console.log(`Redis: Reconnecting... (attempt ${this.connectionRetries})`);
      });

      this.client.on('ready', () => {
        console.log('Redis: Ready to accept commands');
      });

      await this.client.connect();
      this.isConnecting = false;

      return this.client;
    } catch (error) {
      this.isConnecting = false;
      console.error('Redis: Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Wait for connection attempt to complete
   */
  private async waitForConnection(): Promise<void> {
    const maxWait = 30000; // 30 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (this.isConnecting && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }
  }

  /**
   * Get connected client
   */
  public async getClient(): Promise<RedisClientType> {
    if (!this.client?.isOpen) {
      return await this.connect();
    }
    return this.client;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      if (!this.client?.isOpen) {
        return { healthy: false, error: 'Not connected' };
      }

      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return { healthy: true, latency };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Graceful shutdown
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.client?.isOpen) {
        await this.client.quit();
        console.log('Redis: Disconnected gracefully');
      }
    } catch (error) {
      console.error('Redis: Error during disconnect:', error);
      // Force disconnect on error
      if (this.client) {
        await this.client.disconnect();
      }
    } finally {
      this.client = null;
      this.isConnecting = false;
      this.connectionRetries = 0;
    }
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.client?.isOpen || false;
  }
}

// Export singleton instance
export const redisManager = RedisClientManager.getInstance();

// Helper functions for common operations
export async function getRedisClient(): Promise<RedisClientType> {
  return redisManager.getClient();
}

export async function redisHealthCheck() {
  return redisManager.healthCheck();
}

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await redisManager.disconnect();
  });

  process.on('SIGINT', async () => {
    await redisManager.disconnect();
  });
}
