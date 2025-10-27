#!/usr/bin/env node

/**
 * Cache Monitor & Health Check Tool
 * Monitors Next.js webpack cache for corruption and performance issues
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const util = require('util');

class CacheMonitor {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || '.next/cache/webpack';
    this.maxPackSize = options.maxPackSize || 50 * 1024 * 1024; // 50MB
    this.maxTotalSize = options.maxTotalSize || 1024 * 1024 * 1024; // 1GB
    this.maxPackFiles = options.maxPackFiles || 100;
    this.verbose = options.verbose || false;

    // Statistics tracking
    this.stats = {
      totalSize: 0,
      packFiles: 0,
      tempFiles: 0,
      oversizedFiles: 0,
      corruptedFiles: 0,
      directories: new Set(),
      lastCheck: new Date(),
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📊',
      warn: '⚠️',
      error: '❌',
      success: '✅',
      debug: '🔍'
    }[level] || 'ℹ️';

    if (level === 'debug' && !this.verbose) return;

    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async findFiles(pattern, directory = this.cacheDir) {
    const files = [];

    try {
      const items = await fs.promises.readdir(directory, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(directory, item.name);

        if (item.isDirectory()) {
          const subFiles = await this.findFiles(pattern, fullPath);
          files.push(...subFiles);
          this.stats.directories.add(fullPath);
        } else if (item.isFile() && pattern.test(item.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.log(`Error reading directory ${directory}: ${error.message}`, 'error');
    }

    return files;
  }

  async validatePackFile(filePath) {
    try {
      const buffer = await fs.promises.readFile(filePath);

      // Check if it's a valid gzip file
      if (filePath.endsWith('.gz')) {
        await util.promisify(zlib.gunzip)(buffer);
      }

      return true;
    } catch (error) {
      this.log(`Pack file validation failed for ${filePath}: ${error.message}`, 'debug');
      return false;
    }
  }

  async analyzePackFiles() {
    const packFiles = await this.findFiles(/\.pack(\.gz)?$/);
    this.stats.packFiles = packFiles.length;

    const issues = [];

    for (const file of packFiles) {
      try {
        const stats = await fs.promises.stat(file);
        this.stats.totalSize += stats.size;

        // Check for oversized files
        if (stats.size > this.maxPackSize) {
          this.stats.oversizedFiles++;
          issues.push({
            type: 'oversized',
            file,
            size: stats.size,
            maxSize: this.maxPackSize
          });
        }

        // Validate file integrity
        const isValid = await this.validatePackFile(file);
        if (!isValid) {
          this.stats.corruptedFiles++;
          issues.push({
            type: 'corrupted',
            file,
            error: 'Invalid pack file format'
          });
        }

      } catch (error) {
        this.stats.corruptedFiles++;
        issues.push({
          type: 'access_error',
          file,
          error: error.message
        });
      }
    }

    return issues;
  }

  async findTemporaryFiles() {
    const tempPatterns = [
      /.*_$/,           // Files ending with underscore
      /\.tmp$/,         // .tmp files
      /\.lock$/,        // Lock files
      /\.pack\.gz\.old$/, // Old pack files
    ];

    const tempFiles = [];

    for (const pattern of tempPatterns) {
      const files = await this.findFiles(pattern);
      tempFiles.push(...files);
    }

    this.stats.tempFiles = tempFiles.length;
    return tempFiles;
  }

  async validateCacheStructure() {
    const issues = [];

    // Check if cache directory exists
    try {
      await fs.promises.access(this.cacheDir);
    } catch (error) {
      issues.push({
        type: 'missing_cache_dir',
        error: 'Cache directory does not exist'
      });
      return issues;
    }

    // Check expected subdirectories
    const expectedDirs = [
      'client-development',
      'client-development-fallback',
      'server-development',
      'server-production'
    ];

    for (const dir of expectedDirs) {
      const dirPath = path.join(this.cacheDir, dir);
      try {
        const stats = await fs.promises.stat(dirPath);
        if (!stats.isDirectory()) {
          issues.push({
            type: 'invalid_structure',
            path: dirPath,
            error: 'Expected directory but found file'
          });
        }
      } catch (error) {
        this.log(`Cache subdirectory ${dir} not found (this may be normal)`, 'debug');
      }
    }

    return issues;
  }

  async performHealthCheck() {
    this.log('Starting cache health check...', 'info');

    const allIssues = [];

    // Reset statistics
    this.stats = {
      totalSize: 0,
      packFiles: 0,
      tempFiles: 0,
      oversizedFiles: 0,
      corruptedFiles: 0,
      directories: new Set(),
      lastCheck: new Date(),
    };

    try {
      // Check cache structure
      const structureIssues = await this.validateCacheStructure();
      allIssues.push(...structureIssues);

      // Analyze pack files
      const packIssues = await this.analyzePackFiles();
      allIssues.push(...packIssues);

      // Find temporary files
      const tempFiles = await this.findTemporaryFiles();
      if (tempFiles.length > 0) {
        allIssues.push({
          type: 'temporary_files',
          files: tempFiles,
          count: tempFiles.length
        });
      }

      // Check total cache size
      if (this.stats.totalSize > this.maxTotalSize) {
        allIssues.push({
          type: 'cache_too_large',
          totalSize: this.stats.totalSize,
          maxSize: this.maxTotalSize
        });
      }

      // Check pack file count
      if (this.stats.packFiles > this.maxPackFiles) {
        allIssues.push({
          type: 'too_many_pack_files',
          count: this.stats.packFiles,
          maxCount: this.maxPackFiles
        });
      }

    } catch (error) {
      this.log(`Health check failed: ${error.message}`, 'error');
      allIssues.push({
        type: 'health_check_error',
        error: error.message
      });
    }

    return {
      issues: allIssues,
      stats: this.stats,
      healthy: allIssues.length === 0
    };
  }

  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  generateReport(healthCheck) {
    const { issues, stats, healthy } = healthCheck;

    console.log('\n' + '='.repeat(60));
    console.log('           CACHE HEALTH REPORT');
    console.log('='.repeat(60));

    // Overall status
    const status = healthy ? '✅ HEALTHY' : '🚨 ISSUES DETECTED';
    console.log(`Status: ${status}`);
    console.log(`Check Date: ${stats.lastCheck.toISOString()}`);
    console.log();

    // Statistics
    console.log('📊 Cache Statistics:');
    console.log(`   Total Size: ${this.formatSize(stats.totalSize)}`);
    console.log(`   Pack Files: ${stats.packFiles}`);
    console.log(`   Directories: ${stats.directories.size}`);
    console.log(`   Temporary Files: ${stats.tempFiles}`);
    console.log(`   Oversized Files: ${stats.oversizedFiles}`);
    console.log(`   Corrupted Files: ${stats.corruptedFiles}`);
    console.log();

    // Issues
    if (issues.length > 0) {
      console.log('🚨 Issues Found:');

      issues.forEach((issue, index) => {
        console.log(`\\n   ${index + 1}. ${issue.type.toUpperCase()}`);

        switch (issue.type) {
          case 'oversized':
            console.log(`      File: ${issue.file}`);
            console.log(`      Size: ${this.formatSize(issue.size)} (max: ${this.formatSize(issue.maxSize)})`);
            break;

          case 'corrupted':
            console.log(`      File: ${issue.file}`);
            console.log(`      Error: ${issue.error}`);
            break;

          case 'temporary_files':
            console.log(`      Count: ${issue.count} files`);
            if (this.verbose) {
              issue.files.forEach(file => console.log(`        - ${file}`));
            }
            break;

          case 'cache_too_large':
            console.log(`      Current: ${this.formatSize(issue.totalSize)}`);
            console.log(`      Maximum: ${this.formatSize(issue.maxSize)}`);
            break;

          default:
            console.log(`      Details: ${JSON.stringify(issue, null, 6)}`);
        }
      });
    } else {
      console.log('✅ No issues detected');
    }

    console.log();

    // Recommendations
    if (!healthy) {
      console.log('💡 Recommendations:');

      if (stats.corruptedFiles > 0) {
        console.log('   - Run cache cleanup to remove corrupted files');
      }

      if (stats.oversizedFiles > 0) {
        console.log('   - Consider reducing chunk sizes in webpack configuration');
      }

      if (stats.tempFiles > 0) {
        console.log('   - Clean temporary files that may indicate interrupted builds');
      }

      if (stats.totalSize > this.maxTotalSize) {
        console.log('   - Clear old cache files or reduce cache retention time');
      }

      console.log('   - Run: node scripts/cache-monitor.js --cleanup');
      console.log();
    }

    console.log('='.repeat(60));
  }

  async cleanupCache() {
    this.log('Starting cache cleanup...', 'info');

    let cleaned = {
      tempFiles: 0,
      corruptedFiles: 0,
      oversizedFiles: 0,
      totalSize: 0
    };

    try {
      // Remove temporary files
      const tempFiles = await this.findTemporaryFiles();
      for (const file of tempFiles) {
        try {
          const stats = await fs.promises.stat(file);
          await fs.promises.unlink(file);
          cleaned.tempFiles++;
          cleaned.totalSize += stats.size;
          this.log(`Removed temporary file: ${file}`, 'debug');
        } catch (error) {
          this.log(`Failed to remove ${file}: ${error.message}`, 'warn');
        }
      }

      // Remove corrupted pack files
      const packFiles = await this.findFiles(/\.pack(\.gz)?$/);
      for (const file of packFiles) {
        const isValid = await this.validatePackFile(file);
        if (!isValid) {
          try {
            const stats = await fs.promises.stat(file);
            await fs.promises.unlink(file);
            cleaned.corruptedFiles++;
            cleaned.totalSize += stats.size;
            this.log(`Removed corrupted pack file: ${file}`, 'debug');
          } catch (error) {
            this.log(`Failed to remove corrupted file ${file}: ${error.message}`, 'warn');
          }
        }
      }

      this.log(`Cleanup completed:`, 'success');
      this.log(`  - Temporary files removed: ${cleaned.tempFiles}`, 'info');
      this.log(`  - Corrupted files removed: ${cleaned.corruptedFiles}`, 'info');
      this.log(`  - Total space freed: ${this.formatSize(cleaned.totalSize)}`, 'info');

    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'error');
      throw error;
    }

    return cleaned;
  }

  async exportStats() {
    const healthCheck = await this.performHealthCheck();
    const statsFile = path.join('claudedocs', 'cache-stats.json');

    const exportData = {
      timestamp: new Date().toISOString(),
      stats: healthCheck.stats,
      issues: healthCheck.issues,
      healthy: healthCheck.healthy
    };

    try {
      await fs.promises.mkdir(path.dirname(statsFile), { recursive: true });
      await fs.promises.writeFile(statsFile, JSON.stringify(exportData, null, 2));
      this.log(`Stats exported to ${statsFile}`, 'success');
    } catch (error) {
      this.log(`Failed to export stats: ${error.message}`, 'error');
    }

    return exportData;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const flags = {
    validate: args.includes('--validate'),
    cleanup: args.includes('--cleanup'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    export: args.includes('--export'),
    help: args.includes('--help') || args.includes('-h')
  };

  if (flags.help) {
    console.log(`
Cache Monitor - Next.js Webpack Cache Health Tool

Usage: node scripts/cache-monitor.js [options]

Options:
  --validate    Perform cache health check (default)
  --cleanup     Clean corrupted and temporary files
  --export      Export statistics to JSON file
  --verbose, -v Show detailed output
  --help, -h    Show this help message

Examples:
  node scripts/cache-monitor.js --validate
  node scripts/cache-monitor.js --cleanup --verbose
  node scripts/cache-monitor.js --export
`);
    return;
  }

  const monitor = new CacheMonitor({ verbose: flags.verbose });

  try {
    if (flags.cleanup) {
      await monitor.cleanupCache();
    }

    if (flags.export) {
      await monitor.exportStats();
    }

    if (flags.validate || (!flags.cleanup && !flags.export)) {
      const healthCheck = await monitor.performHealthCheck();
      monitor.generateReport(healthCheck);

      // Exit with error code if issues found
      if (!healthCheck.healthy) {
        process.exit(1);
      }
    }

  } catch (error) {
    console.error(`❌ Cache monitor failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = CacheMonitor;