#!/usr/bin/env node

/**
 * Quick Architecture Test for MantisNXT
 * Tests database connectivity and system health via API endpoints
 */

const http = require('http');
const { spawn, exec } = require('child_process');

class ArchitectureValidator {
  constructor() {
    this.results = {
      devServer: { status: 'unknown', details: null },
      database: { status: 'unknown', details: null },
      monitoring: { status: 'unknown', details: null },
      overall: { status: 'unknown', score: 0 }
    };
  }

  /**
   * Test if development server can start and respond
   */
  async testDevServer() {
    console.log('🚀 Testing Development Server...');

    return new Promise((resolve) => {
      // Start dev server in background
      const devProcess = spawn('npm', ['run', 'dev:raw'], {
        stdio: 'pipe',
        shell: true
      });

      let serverReady = false;
      let timeout;

      // Listen for server ready signal
      devProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Ready') || output.includes('Local:') || output.includes('localhost:3000')) {
          serverReady = true;
          console.log('  ✅ Dev server started successfully');

          // Test HTTP endpoint
          this.testHttpEndpoint()
            .then(result => {
              this.results.devServer = result;
              devProcess.kill();
              clearTimeout(timeout);
              resolve(result);
            })
            .catch(error => {
              console.log('  ❌ HTTP endpoint test failed:', error.message);
              this.results.devServer = { status: 'failed', details: error.message };
              devProcess.kill();
              clearTimeout(timeout);
              resolve(this.results.devServer);
            });
        }
      });

      devProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('EADDRINUSE') || error.includes('port')) {
          console.log('  ⚠️ Port already in use - server may already be running');
          this.testHttpEndpoint()
            .then(result => {
              this.results.devServer = result;
              clearTimeout(timeout);
              resolve(result);
            })
            .catch(err => {
              this.results.devServer = { status: 'failed', details: 'Port conflict' };
              clearTimeout(timeout);
              resolve(this.results.devServer);
            });
        }
      });

      // Timeout after 30 seconds
      timeout = setTimeout(() => {
        if (!serverReady) {
          console.log('  ❌ Dev server startup timeout');
          this.results.devServer = { status: 'failed', details: 'Startup timeout' };
          devProcess.kill();
          resolve(this.results.devServer);
        }
      }, 30000);
    });
  }

  /**
   * Test HTTP endpoint connectivity
   */
  async testHttpEndpoint() {
    return new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3000/api/health', (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              console.log('  ✅ HTTP health endpoint responding');
              resolve({ status: 'healthy', details: { statusCode: res.statusCode } });
            } else {
              console.log(`  ⚠️ HTTP endpoint returned status ${res.statusCode}`);
              resolve({ status: 'degraded', details: { statusCode: res.statusCode } });
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('HTTP request timeout'));
      });
    });
  }

  /**
   * Test database connectivity via API
   */
  async testDatabase() {
    console.log('🗄️ Testing Database Connection...');

    return new Promise((resolve) => {
      const req = http.get('http://localhost:3000/api/health/database', (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log('  ✅ Database health endpoint responding');
              console.log(`     Response time: ${result.responseTime || 'unknown'}ms`);
              console.log(`     Status: ${result.status || 'unknown'}`);

              this.results.database = {
                status: 'healthy',
                details: result
              };
            } else {
              console.log(`  ❌ Database endpoint returned status ${res.statusCode}`);
              this.results.database = {
                status: 'failed',
                details: { statusCode: res.statusCode, response: data }
              };
            }
            resolve(this.results.database);
          } catch (error) {
            console.log('  ❌ Database endpoint error:', error.message);
            this.results.database = {
              status: 'failed',
              details: error.message
            };
            resolve(this.results.database);
          }
        });
      });

      req.on('error', (error) => {
        console.log('  ❌ Database connection test failed:', error.message);
        this.results.database = {
          status: 'failed',
          details: error.message
        };
        resolve(this.results.database);
      });

      req.setTimeout(15000, () => {
        req.destroy();
        console.log('  ❌ Database test timeout');
        this.results.database = {
          status: 'failed',
          details: 'Timeout'
        };
        resolve(this.results.database);
      });
    });
  }

  /**
   * Test system monitoring capabilities
   */
  async testMonitoring() {
    console.log('📊 Testing System Monitoring...');

    return new Promise((resolve) => {
      try {
        const SystemResourceMonitor = require('./system-resource-monitor.js');
        const monitor = new SystemResourceMonitor();

        console.log('  ✅ Resource monitor loaded successfully');

        // Test monitoring capabilities
        monitor.checkSystemResources()
          .then(() => {
            console.log('  ✅ System resource check completed');
            this.results.monitoring = {
              status: 'healthy',
              details: { monitorActive: true }
            };
            resolve(this.results.monitoring);
          })
          .catch(error => {
            console.log('  ❌ System resource check failed:', error.message);
            this.results.monitoring = {
              status: 'failed',
              details: error.message
            };
            resolve(this.results.monitoring);
          });

      } catch (error) {
        console.log('  ❌ Monitoring system error:', error.message);
        this.results.monitoring = {
          status: 'failed',
          details: error.message
        };
        resolve(this.results.monitoring);
      }
    });
  }

  /**
   * Generate final report
   */
  generateReport() {
    console.log('\\n📋 Architecture Validation Report');
    console.log('==================================');

    const statuses = Object.values(this.results).filter(r => r.status !== 'unknown');
    const healthy = statuses.filter(r => r.status === 'healthy').length;
    const total = statuses.filter(r => r.status !== 'unknown').length - 1; // Exclude overall

    const score = total > 0 ? Math.round((healthy / total) * 100) : 0;
    const overallStatus = score >= 70 ? 'healthy' : score >= 40 ? 'degraded' : 'failed';

    this.results.overall = { status: overallStatus, score };

    console.log(`Overall Health: ${score}% (${healthy}/${total} components healthy)`);
    console.log(`System Status: ${this.getStatusEmoji(overallStatus)} ${overallStatus.toUpperCase()}`);

    console.log('\\nComponent Status:');
    console.log(`  Development Server: ${this.getStatusEmoji(this.results.devServer.status)} ${this.results.devServer.status}`);
    console.log(`  Database: ${this.getStatusEmoji(this.results.database.status)} ${this.results.database.status}`);
    console.log(`  Monitoring: ${this.getStatusEmoji(this.results.monitoring.status)} ${this.results.monitoring.status}`);

    if (this.results.database.status === 'healthy' && this.results.database.details) {
      console.log('\\n📊 Database Details:');
      console.log(`    Response Time: ${this.results.database.details.responseTime || 'unknown'}ms`);
      console.log(`    Pool Status: ${this.results.database.details.pool?.active || '?'}/${this.results.database.details.pool?.total || '?'} active`);
    }

    console.log('\\n💡 Recommendations:');
    if (this.results.devServer.status !== 'healthy') {
      console.log('  ❗ Fix development server startup issues');
    }
    if (this.results.database.status !== 'healthy') {
      console.log('  ❗ Resolve database connectivity problems');
    }
    if (this.results.monitoring.status !== 'healthy') {
      console.log('  ❗ Enable system monitoring for production readiness');
    }
    if (overallStatus === 'healthy') {
      console.log('  🎉 System architecture is stable!');
      console.log('  🚀 Ready for development and testing');
    }

    return this.results;
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'failed': return '❌';
      default: return '❓';
    }
  }

  /**
   * Run complete validation
   */
  async runValidation() {
    console.log('🔍 MantisNXT Quick Architecture Test');
    console.log('====================================\\n');

    try {
      // Test components in sequence
      await this.testDevServer();
      await this.testDatabase();
      await this.testMonitoring();

      // Generate report
      const results = this.generateReport();

      return results.overall.status === 'healthy';

    } catch (error) {
      console.error('❌ Validation error:', error);
      return false;
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ArchitectureValidator();

  validator.runValidation()
    .then(success => {
      const exitCode = success ? 0 : 1;
      console.log(`\\n🏁 Validation completed with exit code: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Validation script error:', error);
      process.exit(1);
    });
}

module.exports = ArchitectureValidator;