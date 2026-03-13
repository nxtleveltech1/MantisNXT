#!/usr/bin/env tsx
/**
 * Session Cleanup Job (no-op)
 *
 * Redis was removed. Session store is no-op; this script runs for compatibility
 * but does not perform any cleanup. Auth uses Clerk.
 */

import { sessionStore } from '../src/lib/cache/redis-session-store';

async function cleanup() {
  const cleaned = await sessionStore.cleanup();
  const count = await sessionStore.count();
  console.log(`Session cleanup: ${cleaned} removed, ${count} active (no-op store)`);
  process.exit(0);
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
