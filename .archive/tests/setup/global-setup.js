/**
 * Global setup for Jest test environment
 * Initializes database connections, test data, and environment variables
 */

const path = require('path');
const dotenv = require('dotenv');

module.exports = async () => {
  // Load test environment variables
  dotenv.config({ path: path.join(__dirname, '../../.env.test') });

  // Set global test configuration
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_key';
  process.env.SESSION_SECRET = 'test_session_secret';

  // Initialize test database if needed
  if (process.env.DATABASE_URL) {
    console.log('Global setup: Test database configured');
  }

  // Global test timeout is handled in Jest config

  console.log('Global Jest setup completed');
};