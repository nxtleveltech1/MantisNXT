import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // Cleanup operations after all tests
  console.log('🧹 Cleaning up test environment');

  // Clean up any test data, close connections, etc.
  // This is where you'd clean up databases, file uploads, etc.
}

export default globalTeardown;
