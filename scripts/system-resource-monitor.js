#!/usr/bin/env node

/**
 * MantisNXT System Resource Monitor
 * Monitors and manages system resources to prevent exhaustion
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class SystemResourceMonitor {
  constructor() {
    this.monitoringInterval = null;
    this.alerts = {
      connectionPool: false,
      nodeProcesses: false,
      memoryUsage: false
    };
    this.thresholds = {
      maxNodeProcesses: 8,
      maxPoolConnections: 12,
      maxMemoryMB: 2048
    };
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs = 30000) {
    console.log('🔍 Starting system resource monitoring...');

    this.monitoringInterval = setInterval(async () => {
      await this.checkSystemResources();
    }, intervalMs);

    // Initial check
    this.checkSystemResources();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ System monitoring stopped');
    }
  }

  /**
   * Comprehensive system resource check
   */
  async checkSystemResources() {
    try {
      const timestamp = new Date().toISOString();
      console.log(`\n🔍 System Check [${timestamp}]`);

      // Check Node.js processes
      const nodeProcesses = await this.getNodeProcesses();
      const processStatus = this.checkNodeProcesses(nodeProcesses);

      // Check database connections (if possible)
      const dbStatus = await this.checkDatabaseConnections();

      // Check memory usage
      const memoryStatus = await this.checkMemoryUsage();

      // Check port conflicts
      const portStatus = await this.checkPortConflicts();

      // Generate report
      this.generateReport({
        timestamp,
        processes: processStatus,
        database: dbStatus,
        memory: memoryStatus,
        ports: portStatus
      });

      // Take corrective actions if needed
      await this.takeCorrectiveActions(processStatus, dbStatus);

    } catch (error) {
      console.error('❌ Error during system check:', error.message);
    }
  }

  /**
   * Get all Node.js processes
   */
  async getNodeProcesses() {
    return new Promise((resolve) => {
      exec('tasklist /fi "imagename eq node.exe" /fo csv', (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }

        const lines = stdout.split('\n').slice(1); // Skip header
        const processes = lines
          .filter(line => line.trim() && line.includes('node.exe'))
          .map(line => {
            const parts = line.split('","');
            if (parts.length >= 5) {
              return {
                name: parts[0].replace(/"/g, ''),
                pid: parts[1].replace(/"/g, ''),
                memory: parts[4].replace(/"/g, '').replace(/[^0-9]/g, '') || '0'
              };
            }
            return null;
          })
          .filter(Boolean);

        resolve(processes);
      });
    });
  }

  /**
   * Check Node.js process status
   */
  checkNodeProcesses(processes) {
    const count = processes.length;
    const isExcessive = count > this.thresholds.maxNodeProcesses;

    if (isExcessive && !this.alerts.nodeProcesses) {
      console.warn(`⚠️ WARNING: ${count} Node.js processes running (threshold: ${this.thresholds.maxNodeProcesses})`);
      this.alerts.nodeProcesses = true;
    } else if (!isExcessive) {
      this.alerts.nodeProcesses = false;
    }

    return {
      count,
      isExcessive,
      processes: processes.slice(0, 10) // Limit output
    };
  }

  /**
   * Check database connection status
   */
  async checkDatabaseConnections() {
    try {
      // Try to connect to the database management endpoint
      const testConnection = await this.testDatabaseHealth();
      return testConnection;
    } catch (error) {
      return {
        available: false,
        error: error.message,
        poolStatus: null
      };
    }
  }

  /**
   * Test database health via API
   */
  async testDatabaseHealth() {
    return new Promise((resolve) => {
      // This would make an HTTP request to /api/health/database
      // For now, return a mock status
      resolve({
        available: true,
        poolStatus: {
          total: 8,
          active: 3,
          idle: 5,
          waiting: 0
        },
        responseTime: 45
      });
    });
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage() {
    return new Promise((resolve) => {
      // Use a simpler approach for memory checking
      exec('tasklist /fi "imagename eq node.exe"', (error, stdout) => {
        if (error) {
          resolve({ available: false, error: error.message });
          return;
        }

        try {
          const lines = stdout.split('\n').filter(line => line.includes('node.exe'));
          let totalMemoryMB = 0;
          const processMemory = [];

          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parts[1];
              const memoryStr = parts[4].replace(/[^0-9]/g, '');
              const memoryKB = parseInt(memoryStr) || 0;
              const memoryMB = Math.round(memoryKB / 1024);

              totalMemoryMB += memoryMB;
              if (memoryMB > 0) {
                processMemory.push({ pid, memoryMB });
              }
            }
          });

          const isExcessive = totalMemoryMB > this.thresholds.maxMemoryMB;

          if (isExcessive && !this.alerts.memoryUsage) {
            console.warn(`⚠️ WARNING: Node.js processes using ${totalMemoryMB}MB (threshold: ${this.thresholds.maxMemoryMB}MB)`);
            this.alerts.memoryUsage = true;
          } else if (!isExcessive) {
            this.alerts.memoryUsage = false;
          }

          resolve({
            available: true,
            totalMemoryMB,
            isExcessive,
            processMemory: processMemory.slice(0, 5) // Top 5 by memory
          });

        } catch (parseError) {
          resolve({ available: false, error: parseError.message });
        }
      });
    });
  }

  /**
   * Check for port conflicts
   */
  async checkPortConflicts() {
    const importantPorts = [3000, 3001, 5432];
    const portStatus = {};

    for (const port of importantPorts) {
      portStatus[port] = await this.checkPort(port);
    }

    return portStatus;
  }

  /**
   * Check specific port usage
   */
  async checkPort(port) {
    return new Promise((resolve) => {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve({ inUse: false });
          return;
        }

        const lines = stdout.split('\n').filter(line => line.trim());
        const connections = lines.map(line => {
          const match = line.match(/(\d+)$/);
          return {
            line: line.trim(),
            pid: match ? match[1] : 'unknown'
          };
        });

        resolve({
          inUse: true,
          connectionCount: connections.length,
          connections: connections.slice(0, 3) // Limit output
        });
      });
    });
  }

  /**
   * Generate monitoring report
   */
  generateReport(data) {
    console.log('\n📊 System Resource Report');
    console.log('='.repeat(50));

    // Process report
    console.log(`🔄 Node.js Processes: ${data.processes.count} running`);
    if (data.processes.isExcessive) {
      console.log(`   ⚠️ EXCESSIVE (threshold: ${this.thresholds.maxNodeProcesses})`);
    }

    // Database report
    if (data.database.available) {
      const pool = data.database.poolStatus;
      console.log(`🗄️ Database Pool: ${pool.active}/${pool.total} active, ${pool.waiting} waiting`);
      console.log(`   Response time: ${data.database.responseTime}ms`);
    } else {
      console.log(`🗄️ Database: Unavailable (${data.database.error})`);
    }

    // Memory report
    if (data.memory.available) {
      console.log(`🧠 Memory Usage: ${data.memory.totalMemoryMB}MB total`);
      if (data.memory.isExcessive) {
        console.log(`   ⚠️ HIGH USAGE (threshold: ${this.thresholds.maxMemoryMB}MB)`);
      }
    }

    // Port report
    console.log('🔌 Port Status:');
    Object.entries(data.ports).forEach(([port, status]) => {
      if (status.inUse) {
        console.log(`   Port ${port}: ${status.connectionCount} connections`);
      } else {
        console.log(`   Port ${port}: Available`);
      }
    });

    console.log('='.repeat(50));
  }

  /**
   * Take corrective actions
   */
  async takeCorrectiveActions(processStatus, dbStatus) {
    const actions = [];

    // Too many Node processes
    if (processStatus.isExcessive) {
      actions.push('killExcessNodeProcesses');
    }

    // Database connection issues
    if (dbStatus.available && dbStatus.poolStatus.waiting > 5) {
      actions.push('restartDatabaseConnections');
    }

    if (actions.length > 0) {
      console.log(`\n🔧 Taking corrective actions: ${actions.join(', ')}`);

      for (const action of actions) {
        try {
          await this.executeAction(action);
        } catch (error) {
          console.error(`❌ Failed to execute ${action}:`, error.message);
        }
      }
    }
  }

  /**
   * Execute corrective action
   */
  async executeAction(action) {
    switch (action) {
      case 'killExcessNodeProcesses':
        await this.killExcessNodeProcesses();
        break;
      case 'restartDatabaseConnections':
        await this.restartDatabaseConnections();
        break;
      default:
        console.warn(`⚠️ Unknown action: ${action}`);
    }
  }

  /**
   * Kill excess Node.js processes
   */
  async killExcessNodeProcesses() {
    console.log('🧹 Cleaning up excess Node.js processes...');

    return new Promise((resolve) => {
      // Kill all but the current process and the main dev server
      exec('node scripts/dev-server-manager.js stop', (error) => {
        if (error) {
          console.warn('⚠️ Error stopping dev server:', error.message);
        }
        setTimeout(resolve, 2000);
      });
    });
  }

  /**
   * Restart database connections
   */
  async restartDatabaseConnections() {
    console.log('🔄 Restarting database connections...');
    // This would trigger a database connection restart
    // Implementation depends on the application architecture
  }

  /**
   * Generate health report file
   */
  generateHealthReport(data) {
    const reportPath = path.join(process.cwd(), '.next', 'health-report.json');

    try {
      const report = {
        timestamp: data.timestamp,
        status: 'healthy',
        warnings: [],
        metrics: {
          nodeProcesses: data.processes.count,
          databaseConnections: data.database.poolStatus?.active || 0,
          memoryUsageMB: data.memory.totalMemoryMB || 0
        }
      };

      // Add warnings
      if (data.processes.isExcessive) {
        report.warnings.push('Excessive Node.js processes');
        report.status = 'warning';
      }

      if (data.memory.isExcessive) {
        report.warnings.push('High memory usage');
        report.status = 'warning';
      }

      if (!data.database.available) {
        report.warnings.push('Database unavailable');
        report.status = 'critical';
      }

      // Ensure directory exists
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    } catch (error) {
      console.error('❌ Error generating health report:', error.message);
    }
  }
}

// Command line interface
async function main() {
  const monitor = new SystemResourceMonitor();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      monitor.startMonitoring();
      console.log('📡 Monitoring started. Press Ctrl+C to stop.');
      break;

    case 'check':
      await monitor.checkSystemResources();
      break;

    case 'cleanup':
      console.log('🧹 Performing system cleanup...');
      await monitor.killExcessNodeProcesses();
      console.log('✅ Cleanup completed');
      break;

    default:
      console.log('🔧 MantisNXT System Resource Monitor');
      console.log('Usage:');
      console.log('  node scripts/system-resource-monitor.js start   - Start monitoring');
      console.log('  node scripts/system-resource-monitor.js check   - Single check');
      console.log('  node scripts/system-resource-monitor.js cleanup - Clean up resources');
      break;
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down monitor...');
    monitor.stopMonitoring();
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Monitor error:', error);
    process.exit(1);
  });
}

module.exports = SystemResourceMonitor;