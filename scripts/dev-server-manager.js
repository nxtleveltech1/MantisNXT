#!/usr/bin/env node

/**
 * MantisNXT Development Server Manager
 * Prevents multiple dev server instances and manages resources
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const LOCK_FILE = path.join(process.cwd(), '.next', 'dev-server.lock');
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

class DevServerManager {
  constructor() {
    this.lockFile = LOCK_FILE;
    this.pid = process.pid;
    this.startTime = Date.now();
  }

  /**
   * Check if another dev server is already running
   */
  async checkExistingServer() {
    try {
      if (!fs.existsSync(this.lockFile)) {
        return { running: false };
      }

      const lockData = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));

      // Check if the process is still alive
      const isAlive = await this.isProcessAlive(lockData.pid);

      if (!isAlive) {
        console.log('🧹 Removing stale lock file...');
        fs.unlinkSync(this.lockFile);
        return { running: false };
      }

      return {
        running: true,
        ...lockData
      };
    } catch (error) {
      console.warn('⚠️ Error checking existing server:', error.message);
      return { running: false };
    }
  }

  /**
   * Check if a process is alive
   */
  async isProcessAlive(pid) {
    try {
      return new Promise((resolve) => {
        exec(`tasklist /fi "PID eq ${pid}" | findstr /i "${pid}"`, (error, stdout) => {
          resolve(!error && stdout.includes(pid.toString()));
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Kill all Node.js processes on dev ports
   */
  async killDevProcesses() {
    console.log('🔄 Killing existing development processes...');

    try {
      // Kill processes on common dev ports
      const ports = [3000, 3001, 3002, 3003];

      for (const port of ports) {
        await new Promise((resolve) => {
          exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
            if (!error && stdout) {
              const lines = stdout.split('\n');
              lines.forEach(line => {
                const match = line.match(/(\d+)$/);
                if (match) {
                  const pid = match[1];
                  exec(`taskkill /F /PID ${pid}`, () => {});
                }
              });
            }
            resolve();
          });
        });
      }

      // Wait for processes to die
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ Development processes cleaned up');
    } catch (error) {
      console.error('❌ Error killing dev processes:', error.message);
    }
  }

  /**
   * Create lock file
   */
  createLockFile() {
    try {
      const lockDir = path.dirname(this.lockFile);
      if (!fs.existsSync(lockDir)) {
        fs.mkdirSync(lockDir, { recursive: true });
      }

      const lockData = {
        pid: this.pid,
        port: PORT,
        host: HOST,
        startTime: this.startTime,
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(this.lockFile, JSON.stringify(lockData, null, 2));
      console.log(`🔒 Lock file created: PID ${this.pid}, Port ${PORT}`);
    } catch (error) {
      console.error('❌ Error creating lock file:', error.message);
    }
  }

  /**
   * Remove lock file
   */
  removeLockFile() {
    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
        console.log('🧹 Lock file removed');
      }
    } catch (error) {
      console.error('❌ Error removing lock file:', error.message);
    }
  }

  /**
   * Setup cleanup handlers
   */
  setupCleanup() {
    const cleanup = () => {
      console.log('🔄 Cleaning up dev server...');
      this.removeLockFile();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);

    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught exception in dev server:', error);
      this.removeLockFile();
      process.exit(1);
    });
  }

  /**
   * Start the development server
   */
  async startServer() {
    console.log('🚀 Starting MantisNXT development server...');

    // Check for existing server
    const existing = await this.checkExistingServer();
    if (existing.running) {
      console.log(`❌ Development server already running on port ${existing.port} (PID: ${existing.pid})`);
      console.log(`Started: ${existing.timestamp}`);
      console.log('Use "npm run dev:stop" to stop the existing server');
      process.exit(1);
    }

    // Clean up any orphaned processes
    await this.killDevProcesses();

    // Create lock file
    this.createLockFile();

    // Setup cleanup
    this.setupCleanup();

    // Start Next.js dev server
    console.log(`🌟 Starting Next.js on ${HOST}:${PORT}...`);

    const nextProcess = spawn('npx', ['next', 'dev', '-p', PORT, '-H', HOST], {
      stdio: 'inherit',
      shell: true
    });

    nextProcess.on('error', (error) => {
      console.error('❌ Failed to start dev server:', error);
      this.removeLockFile();
      process.exit(1);
    });

    nextProcess.on('exit', (code) => {
      console.log(`📡 Dev server exited with code ${code}`);
      this.removeLockFile();
      process.exit(code);
    });
  }

  /**
   * Stop the development server
   */
  async stopServer() {
    console.log('🛑 Stopping development server...');

    const existing = await this.checkExistingServer();
    if (!existing.running) {
      console.log('💤 No development server running');
      return;
    }

    try {
      // Kill the specific process
      await new Promise((resolve) => {
        exec(`taskkill /F /PID ${existing.pid}`, (error) => {
          if (error) {
            console.warn(`⚠️ Could not kill PID ${existing.pid}:`, error.message);
          } else {
            console.log(`✅ Killed dev server process ${existing.pid}`);
          }
          resolve();
        });
      });

      // Clean up all dev processes
      await this.killDevProcesses();

      // Remove lock file
      this.removeLockFile();

      console.log('✅ Development server stopped');
    } catch (error) {
      console.error('❌ Error stopping server:', error.message);
    }
  }

  /**
   * Get server status
   */
  async getStatus() {
    const existing = await this.checkExistingServer();

    if (existing.running) {
      console.log('📡 Development Server Status: RUNNING');
      console.log(`   PID: ${existing.pid}`);
      console.log(`   Port: ${existing.port}`);
      console.log(`   Host: ${existing.host}`);
      console.log(`   Started: ${existing.timestamp}`);

      const uptime = Math.round((Date.now() - existing.startTime) / 1000);
      console.log(`   Uptime: ${uptime} seconds`);
    } else {
      console.log('📡 Development Server Status: NOT RUNNING');
    }
  }
}

// Command handling
async function main() {
  const manager = new DevServerManager();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      await manager.startServer();
      break;
    case 'stop':
      await manager.stopServer();
      break;
    case 'status':
      await manager.getStatus();
      break;
    case 'restart':
      await manager.stopServer();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await manager.startServer();
      break;
    default:
      console.log('🔧 MantisNXT Dev Server Manager');
      console.log('Usage:');
      console.log('  node scripts/dev-server-manager.js start   - Start dev server');
      console.log('  node scripts/dev-server-manager.js stop    - Stop dev server');
      console.log('  node scripts/dev-server-manager.js status  - Check status');
      console.log('  node scripts/dev-server-manager.js restart - Restart server');
      break;
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Dev server manager error:', error);
    process.exit(1);
  });
}

module.exports = DevServerManager;