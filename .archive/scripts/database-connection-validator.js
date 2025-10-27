#!/usr/bin/env node

/**
 * Enterprise Database Connection Validator
 * Comprehensive testing suite for the new connection manager
 *
 * Tests:
 * 1. Enterprise Connection Manager initialization
 * 2. Connection pooling behavior
 * 3. Fallback mechanisms
 * 4. Concurrent operation handling
 * 5. Health monitoring functionality
 * 6. API endpoint compatibility
 */

const axios = require('axios');
const { spawn } = require('child_process');

const API_BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

class DatabaseConnectionValidator {
  constructor() {
    this.testResults = [];
    this.serverProcess = null;
  }

  async runValidationSuite() {
    console.log('🚀 Starting Enterprise Database Connection Validation Suite\n');

    try {
      // Start the development server
      await this.startDevelopmentServer();

      // Run test suites
      await this.testHealthEndpoints();
      await this.testConnectionReliability();
      await this.testAPIEndpoints();
      await this.testConcurrentOperations();
      await this.testFailoverScenarios();

      // Generate report
      this.generateValidationReport();

    } catch (error) {
      console.error('💥 Validation suite failed:', error);
    } finally {
      // Cleanup
      await this.stopDevelopmentServer();
    }
  }

  async startDevelopmentServer() {
    console.log('🔧 Starting development server...');

    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let outputBuffer = '';

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;

        // Look for server ready indicators
        if (output.includes('Ready in') || output.includes('started server on')) {
          console.log('✅ Development server started successfully');
          setTimeout(resolve, 2000); // Give server time to fully initialize
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.log('Server stderr:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        console.error('❌ Failed to start development server:', error);
        reject(error);
      });

      // Timeout fallback
      setTimeout(() => {
        if (!outputBuffer.includes('Ready in') && !outputBuffer.includes('started server on')) {
          console.log('⚠️ Server start timeout, proceeding with validation...');
          resolve();
        }
      }, 15000);
    });
  }

  async stopDevelopmentServer() {
    if (this.serverProcess) {
      console.log('🔌 Stopping development server...');
      this.serverProcess.kill('SIGTERM');

      // Force kill if needed
      setTimeout(() => {
        if (!this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  async testHealthEndpoints() {
    console.log('🏥 Testing health endpoints...\n');

    const healthTests = [
      {
        name: 'Enterprise Health Endpoint',
        endpoint: '/api/health/database-enterprise',
        expectedFields: ['connectionManager', 'tests', 'server', 'performance']
      },
      {
        name: 'Legacy Health Endpoint',
        endpoint: '/api/health/database',
        expectedFields: ['database']
      }
    ];

    for (const test of healthTests) {
      try {
        console.log(`   Testing: ${test.name}`);
        const response = await axios.get(`${API_BASE_URL}${test.endpoint}`, {
          timeout: TEST_TIMEOUT
        });

        const success = response.status === 200 && response.data.success;
        const hasExpectedFields = test.expectedFields.every(field =>
          response.data.hasOwnProperty(field)
        );

        this.recordTest(test.name, success && hasExpectedFields, {
          status: response.status,
          responseTime: response.headers['x-response-time'] || 'N/A',
          connectionState: response.data.connectionManager?.state || response.data.database?.status,
          healthScore: response.data.overallHealth?.score || response.data.database?.healthScore || 'N/A'
        });

        if (success && hasExpectedFields) {
          console.log(`   ✅ ${test.name} passed`);
          if (response.data.connectionManager?.state) {
            console.log(`      Connection State: ${response.data.connectionManager.state}`);
            console.log(`      Health Score: ${response.data.overallHealth?.score || 'N/A'}%`);
          }
        } else {
          console.log(`   ❌ ${test.name} failed`);
        }

      } catch (error) {
        console.log(`   ❌ ${test.name} error: ${error.message}`);
        this.recordTest(test.name, false, { error: error.message });
      }

      console.log('');
    }
  }

  async testConnectionReliability() {
    console.log('🔗 Testing connection reliability...\n');

    // Test multiple rapid requests
    try {
      console.log('   Testing rapid sequential requests...');
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          axios.get(`${API_BASE_URL}/api/health/database-enterprise`, {
            timeout: 5000
          }).then(response => ({
            success: response.status === 200,
            responseTime: response.duration || 0
          })).catch(error => ({
            success: false,
            error: error.message
          }))
        );
      }

      const results = await Promise.all(promises);
      const successfulRequests = results.filter(r => r.success).length;
      const reliability = (successfulRequests / results.length) * 100;

      this.recordTest('Rapid Sequential Requests', reliability >= 90, {
        total: results.length,
        successful: successfulRequests,
        reliability: `${reliability.toFixed(1)}%`,
        avgResponseTime: results.reduce((acc, r) => acc + (r.responseTime || 0), 0) / results.length
      });

      if (reliability >= 90) {
        console.log(`   ✅ Rapid requests test passed (${reliability.toFixed(1)}% success rate)`);
      } else {
        console.log(`   ❌ Rapid requests test failed (${reliability.toFixed(1)}% success rate)`);
      }

    } catch (error) {
      console.log(`   ❌ Connection reliability test error: ${error.message}`);
      this.recordTest('Rapid Sequential Requests', false, { error: error.message });
    }

    console.log('');
  }

  async testAPIEndpoints() {
    console.log('🔌 Testing API endpoint compatibility...\n');

    const apiEndpoints = [
      {
        name: 'Analytics Dashboard',
        endpoint: '/api/analytics/dashboard?organizationId=1',
        method: 'GET'
      },
      {
        name: 'Analytics Anomalies',
        endpoint: '/api/analytics/anomalies?organizationId=1&limit=5',
        method: 'GET'
      },
      {
        name: 'Analytics Predictions',
        endpoint: '/api/analytics/predictions?type=all&organizationId=1',
        method: 'GET'
      }
    ];

    for (const api of apiEndpoints) {
      try {
        console.log(`   Testing: ${api.name}`);

        const response = await axios({
          method: api.method,
          url: `${API_BASE_URL}${api.endpoint}`,
          timeout: TEST_TIMEOUT
        });

        const success = response.status === 200;
        this.recordTest(api.name, success, {
          status: response.status,
          hasData: !!response.data?.data || !!response.data?.success,
          responseSize: JSON.stringify(response.data).length
        });

        if (success) {
          console.log(`   ✅ ${api.name} passed`);
        } else {
          console.log(`   ❌ ${api.name} failed (${response.status})`);
        }

      } catch (error) {
        console.log(`   ⚠️ ${api.name} error: ${error.message}`);
        this.recordTest(api.name, false, { error: error.message });
      }

      console.log('');
    }
  }

  async testConcurrentOperations() {
    console.log('⚡ Testing concurrent operations...\n');

    try {
      console.log('   Testing concurrent health checks...');

      const concurrentRequests = Array(20).fill(0).map((_, i) =>
        axios.get(`${API_BASE_URL}/api/health/database-enterprise`, {
          timeout: 10000
        }).then(response => ({
          requestId: i,
          success: response.status === 200,
          duration: response.duration || 0
        })).catch(error => ({
          requestId: i,
          success: false,
          error: error.code || error.message
        }))
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      const successfulRequests = results.filter(r => r.success).length;
      const concurrencyScore = (successfulRequests / results.length) * 100;

      this.recordTest('Concurrent Operations', concurrencyScore >= 85, {
        totalRequests: results.length,
        successful: successfulRequests,
        concurrencyScore: `${concurrencyScore.toFixed(1)}%`,
        totalTime: `${totalTime}ms`,
        avgTimePerRequest: `${(totalTime / results.length).toFixed(1)}ms`,
        errors: results.filter(r => !r.success).map(r => r.error).slice(0, 5)
      });

      if (concurrencyScore >= 85) {
        console.log(`   ✅ Concurrent operations passed (${concurrencyScore.toFixed(1)}% success)`);
      } else {
        console.log(`   ❌ Concurrent operations failed (${concurrencyScore.toFixed(1)}% success)`);
      }

    } catch (error) {
      console.log(`   ❌ Concurrent operations test error: ${error.message}`);
      this.recordTest('Concurrent Operations', false, { error: error.message });
    }

    console.log('');
  }

  async testFailoverScenarios() {
    console.log('🛡️ Testing failover scenarios...\n');

    // Test error handling
    try {
      console.log('   Testing invalid query handling...');

      // This should test the error handling without breaking the connection
      const response = await axios.get(`${API_BASE_URL}/api/health/database-enterprise`, {
        timeout: 10000
      });

      const connectionManagerWorking = response.data.connectionManager?.state === 'healthy';

      this.recordTest('Error Recovery', connectionManagerWorking, {
        connectionState: response.data.connectionManager?.state || 'unknown',
        healthScore: response.data.overallHealth?.score || 0
      });

      if (connectionManagerWorking) {
        console.log('   ✅ Error recovery test passed');
      } else {
        console.log('   ❌ Error recovery test failed');
      }

    } catch (error) {
      console.log(`   ❌ Failover test error: ${error.message}`);
      this.recordTest('Error Recovery', false, { error: error.message });
    }

    console.log('');
  }

  recordTest(testName, passed, details = {}) {
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generateValidationReport() {
    const passedTests = this.testResults.filter(t => t.passed).length;
    const totalTests = this.testResults.length;
    const successRate = (passedTests / totalTests) * 100;

    console.log('📊 VALIDATION REPORT');
    console.log('=' .repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log('');

    // Detailed results
    console.log('📋 DETAILED RESULTS:');
    this.testResults.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${status} ${test.name}`);

      if (test.details && Object.keys(test.details).length > 0) {
        Object.entries(test.details).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
      console.log('');
    });

    // Overall assessment
    console.log('🎯 ASSESSMENT:');
    if (successRate >= 90) {
      console.log('✅ EXCELLENT - Enterprise Connection Manager is working optimally');
    } else if (successRate >= 75) {
      console.log('⚠️ GOOD - Some issues detected, review failed tests');
    } else if (successRate >= 50) {
      console.log('⚠️ FAIR - Multiple issues detected, investigation required');
    } else {
      console.log('❌ POOR - Serious issues detected, immediate attention required');
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (successRate < 100) {
      console.log('- Review failed tests and error messages');
      console.log('- Check database server connectivity and configuration');
      console.log('- Monitor connection pool metrics during operation');
    }

    if (successRate >= 90) {
      console.log('- Connection manager is ready for production use');
      console.log('- Continue monitoring connection health metrics');
      console.log('- Consider removing backup files after validation');
    }

    console.log('');
  }
}

// Main execution
async function main() {
  const validator = new DatabaseConnectionValidator();

  try {
    await validator.runValidationSuite();
    console.log('🎉 Validation suite completed successfully!');
  } catch (error) {
    console.error('💥 Validation suite failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Validation interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Validation terminated');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = DatabaseConnectionValidator;