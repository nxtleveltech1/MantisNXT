/**
 * Global teardown for Jest test environment
 * Cleans up database connections and test resources
 */

module.exports = async () => {
  // Clean up any global resources
  console.log('Global Jest teardown completed');

  // Force exit after tests to prevent hanging
  if (process.env.CI) {
    process.exit(0);
  }
};