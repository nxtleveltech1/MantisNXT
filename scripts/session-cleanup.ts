#!/usr/bin/env tsx
/**
 * Session Cleanup Job
 *
 * Periodically clean up expired sessions from Redis
 * Run this as a cron job or scheduled task
 *
 * Usage:
 * - One-time: tsx scripts/session-cleanup.ts
 * - Continuous: tsx scripts/session-cleanup.ts --daemon --interval 3600
 */

import { sessionStore } from '../src/lib/cache/redis-session-store';
import { redisManager } from '../src/lib/cache/redis-client';

interface CleanupOptions {
  daemon?: boolean;
  interval?: number; // seconds
  verbose?: boolean;
}

async function cleanup(options: CleanupOptions = {}) {
  const { daemon = false, interval = 3600, verbose = false } = options;

  console.log('Session Cleanup Job Started');
  console.log(`Mode: ${daemon ? 'daemon' : 'one-time'}`);
  if (daemon) {
    console.log(`Interval: ${interval} seconds`);
  }

  let running = true;

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    running = false;
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    running = false;
  });

  const performCleanup = async () => {
    try {
      const startTime = Date.now();
      const cleaned = await sessionStore.cleanup();
      const duration = Date.now() - startTime;

      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Cleanup completed: ${cleaned} sessions removed in ${duration}ms`);

      if (verbose) {
        const count = await sessionStore.count();
        console.log(`[${timestamp}] Active sessions: ${count}`);
      }

      return { cleaned, duration };
    } catch (error) {
      console.error('Cleanup error:', error);
      return { cleaned: 0, duration: 0, error };
    }
  };

  // One-time cleanup
  if (!daemon) {
    const result = await performCleanup();
    await redisManager.disconnect();
    process.exit(result.error ? 1 : 0);
    return;
  }

  // Daemon mode
  console.log('Running in daemon mode. Press Ctrl+C to stop.');

  while (running) {
    await performCleanup();

    // Wait for next interval
    for (let i = 0; i < interval && running; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Cleanup on exit
  await redisManager.disconnect();
  console.log('Session cleanup job stopped');
  process.exit(0);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: CleanupOptions = {
  daemon: args.includes('--daemon'),
  interval: parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1] || '3600', 10),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

// Run cleanup
cleanup(options).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
