/**
 * MASTER VALIDATION RUNNER FOR MANTISNXT
 *
 * Orchestrates all database and platform validation tools:
 * - Database connectivity and validation
 * - Performance optimization analysis
 * - Cross-module data flow testing
 * - Sample data generation
 * - API endpoint validation
 * - Comprehensive reporting
 */

const DatabaseValidationSuite = require('./database-validation-suite');
const DatabasePerformanceOptimizer = require('./performance-optimizer');
const CrossModuleDataFlowTester = require('./cross-module-tester');
const SampleDataGenerator = require('./sample-data-generator');
const ApiValidationSuite = require('./api-validation-suite');

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

class MasterValidationRunner {
  constructor() {
    this.startTime = performance.now();
    this.results = {
      summary: {},
      databaseValidation: {},
      performanceOptimization: {},
      crossModuleFlow: {},
      sampleDataGeneration: {},
      apiValidation: {},
      overall: {}
    };

    this.config = {
      runDatabaseValidation: true,
      runPerformanceOptimization: true,
      runCrossModuleFlow: true,
      generateSampleData: false, // Set to true if you want sample data
      runApiValidation: true,
      generateReport: true,
      cleanup: true
    };
  }

  /**
   * Run complete MantisNXT platform validation
   */
  async runCompleteValidation() {
    console.log('🚀 STARTING MANTISNXT COMPLETE PLATFORM VALIDATION');
    console.log('=' .repeat(60));
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Step 1: Database Validation
      if (this.config.runDatabaseValidation) {
        await this.runDatabaseValidation();
      }

      // Step 2: Performance Optimization
      if (this.config.runPerformanceOptimization) {
        await this.runPerformanceOptimization();
      }

      // Step 3: Cross-Module Data Flow Testing
      if (this.config.runCrossModuleFlow) {
        await this.runCrossModuleFlow();
      }

      // Step 4: Sample Data Generation (optional)
      if (this.config.generateSampleData) {
        await this.generateSampleData();
      }

      // Step 5: API Validation
      if (this.config.runApiValidation) {
        await this.runApiValidation();
      }

      // Step 6: Generate Comprehensive Report
      if (this.config.generateReport) {
        await this.generateComprehensiveReport();
      }

      this.displayFinalSummary();

    } catch (error) {
      console.error('\n❌ CRITICAL ERROR IN VALIDATION SUITE:', error);
      this.results.overall.status = 'failed';
      this.results.overall.error = error.message;
      throw error;
    }
  }

  /**
   * Step 1: Database Validation
   */
  async runDatabaseValidation() {
    console.log('\n📊 STEP 1: DATABASE VALIDATION');
    console.log('─'.repeat(40));

    const startTime = performance.now();

    try {
      const validator = new DatabaseValidationSuite();
      await validator.runCompleteValidation();

      const executionTime = performance.now() - startTime;

      this.results.databaseValidation = {
        status: 'completed',
        executionTime: `${executionTime.toFixed(2)}ms`,
        message: 'Database validation completed successfully'
      };

      console.log(`✅ Database validation completed in ${executionTime.toFixed(2)}ms`);

    } catch (error) {
      this.results.databaseValidation = {
        status: 'failed',
        error: error.message,
        executionTime: `${(performance.now() - startTime).toFixed(2)}ms`
      };

      console.log('❌ Database validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Step 2: Performance Optimization
   */
  async runPerformanceOptimization() {
    console.log('\n⚡ STEP 2: PERFORMANCE OPTIMIZATION ANALYSIS');
    console.log('─'.repeat(40));

    const startTime = performance.now();

    try {
      const optimizer = new DatabasePerformanceOptimizer();
      await optimizer.runPerformanceAnalysis();

      const executionTime = performance.now() - startTime;

      this.results.performanceOptimization = {
        status: 'completed',
        executionTime: `${executionTime.toFixed(2)}ms`,
        message: 'Performance analysis completed successfully',
        optimizationScript: 'scripts/performance-optimization.sql'
      };

      console.log(`✅ Performance optimization completed in ${executionTime.toFixed(2)}ms`);

    } catch (error) {
      this.results.performanceOptimization = {
        status: 'failed',
        error: error.message,
        executionTime: `${(performance.now() - startTime).toFixed(2)}ms`
      };

      console.log('❌ Performance optimization failed:', error.message);
      // Don't throw error - continue with other tests
    }
  }

  /**
   * Step 3: Cross-Module Data Flow Testing
   */
  async runCrossModuleFlow() {
    console.log('\n🔄 STEP 3: CROSS-MODULE DATA FLOW TESTING');
    console.log('─'.repeat(40));

    const startTime = performance.now();

    try {
      const tester = new CrossModuleDataFlowTester();
      await tester.runCrossModuleTests();

      const executionTime = performance.now() - startTime;

      this.results.crossModuleFlow = {
        status: 'completed',
        executionTime: `${executionTime.toFixed(2)}ms`,
        message: 'Cross-module data flow testing completed successfully'
      };

      console.log(`✅ Cross-module testing completed in ${executionTime.toFixed(2)}ms`);

    } catch (error) {
      this.results.crossModuleFlow = {
        status: 'failed',
        error: error.message,
        executionTime: `${(performance.now() - startTime).toFixed(2)}ms`
      };

      console.log('❌ Cross-module testing failed:', error.message);
      // Don't throw error - continue with other tests
    }
  }

  /**
   * Step 4: Sample Data Generation (Optional)
   */
  async generateSampleData() {
    console.log('\n🎭 STEP 4: SAMPLE DATA GENERATION');
    console.log('─'.repeat(40));

    const startTime = performance.now();

    try {
      const generator = new SampleDataGenerator();
      await generator.generateCompleteSampleData();

      const executionTime = performance.now() - startTime;

      this.results.sampleDataGeneration = {
        status: 'completed',
        executionTime: `${executionTime.toFixed(2)}ms`,
        message: 'Sample data generation completed successfully'
      };

      console.log(`✅ Sample data generation completed in ${executionTime.toFixed(2)}ms`);

    } catch (error) {
      this.results.sampleDataGeneration = {
        status: 'failed',
        error: error.message,
        executionTime: `${(performance.now() - startTime).toFixed(2)}ms`
      };

      console.log('❌ Sample data generation failed:', error.message);
      // Don't throw error - continue with other tests
    }
  }

  /**
   * Step 5: API Validation
   */
  async runApiValidation() {
    console.log('\n🌐 STEP 5: API ENDPOINT VALIDATION');
    console.log('─'.repeat(40));

    const startTime = performance.now();

    try {
      const validator = new ApiValidationSuite();
      await validator.runApiValidation();

      const executionTime = performance.now() - startTime;

      this.results.apiValidation = {
        status: 'completed',
        executionTime: `${executionTime.toFixed(2)}ms`,
        message: 'API validation completed successfully'
      };

      console.log(`✅ API validation completed in ${executionTime.toFixed(2)}ms`);

    } catch (error) {
      this.results.apiValidation = {
        status: 'failed',
        error: error.message,
        executionTime: `${(performance.now() - startTime).toFixed(2)}ms`
      };

      console.log('❌ API validation failed:', error.message);
      // Don't throw error - continue with report generation
    }
  }

  /**
   * Generate Comprehensive Validation Report
   */
  async generateComprehensiveReport() {
    console.log('\n📋 STEP 6: GENERATING COMPREHENSIVE REPORT');
    console.log('─'.repeat(40));

    const reportData = {
      timestamp: new Date().toISOString(),
      totalExecutionTime: `${(performance.now() - this.startTime).toFixed(2)}ms`,
      platform: 'MantisNXT Enterprise Platform',
      database: {
        host: process.env.DB_HOST || '62.169.20.53',
        port: process.env.DB_PORT || '6600',
        database: process.env.DB_NAME || 'nxtprod-db_001'
      },
      validationResults: this.results,
      summary: this.generateSummary()
    };

    const reportContent = this.formatReport(reportData);

    // Save report to file
    const reportsDir = path.join(__dirname, '..', 'claudedocs');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFileName = `validation-report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
    const reportPath = path.join(reportsDir, reportFileName);

    fs.writeFileSync(reportPath, reportContent);

    console.log(`✅ Comprehensive report generated: ${reportPath}`);

    this.results.summary.reportPath = reportPath;
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    const completedTests = Object.values(this.results)
      .filter(result => result.status === 'completed').length;

    const failedTests = Object.values(this.results)
      .filter(result => result.status === 'failed').length;

    const totalTests = completedTests + failedTests;

    return {
      totalTests: totalTests,
      completedTests: completedTests,
      failedTests: failedTests,
      successRate: totalTests > 0 ? ((completedTests / totalTests) * 100).toFixed(1) : '0',
      overallStatus: failedTests === 0 ? 'excellent' :
                    failedTests <= 1 ? 'good' :
                    failedTests <= 2 ? 'fair' : 'poor'
    };
  }

  /**
   * Format comprehensive report
   */
  formatReport(reportData) {
    return `# MantisNXT Platform Validation Report

**Generated:** ${reportData.timestamp}
**Total Execution Time:** ${reportData.totalExecutionTime}
**Database:** ${reportData.database.host}:${reportData.database.port}/${reportData.database.database}

## Executive Summary

- **Total Tests:** ${reportData.summary.totalTests}
- **Completed:** ${reportData.summary.completedTests}
- **Failed:** ${reportData.summary.failedTests}
- **Success Rate:** ${reportData.summary.successRate}%
- **Overall Status:** ${reportData.summary.overallStatus}

## Validation Results

### 📊 Database Validation
- **Status:** ${reportData.validationResults.databaseValidation.status}
- **Execution Time:** ${reportData.validationResults.databaseValidation.executionTime}
- **Message:** ${reportData.validationResults.databaseValidation.message || 'N/A'}
${reportData.validationResults.databaseValidation.error ? `- **Error:** ${reportData.validationResults.databaseValidation.error}` : ''}

### ⚡ Performance Optimization
- **Status:** ${reportData.validationResults.performanceOptimization.status}
- **Execution Time:** ${reportData.validationResults.performanceOptimization.executionTime}
- **Message:** ${reportData.validationResults.performanceOptimization.message || 'N/A'}
${reportData.validationResults.performanceOptimization.optimizationScript ? `- **Optimization Script:** ${reportData.validationResults.performanceOptimization.optimizationScript}` : ''}
${reportData.validationResults.performanceOptimization.error ? `- **Error:** ${reportData.validationResults.performanceOptimization.error}` : ''}

### 🔄 Cross-Module Data Flow
- **Status:** ${reportData.validationResults.crossModuleFlow.status}
- **Execution Time:** ${reportData.validationResults.crossModuleFlow.executionTime}
- **Message:** ${reportData.validationResults.crossModuleFlow.message || 'N/A'}
${reportData.validationResults.crossModuleFlow.error ? `- **Error:** ${reportData.validationResults.crossModuleFlow.error}` : ''}

${reportData.validationResults.sampleDataGeneration.status ? `### 🎭 Sample Data Generation
- **Status:** ${reportData.validationResults.sampleDataGeneration.status}
- **Execution Time:** ${reportData.validationResults.sampleDataGeneration.executionTime}
- **Message:** ${reportData.validationResults.sampleDataGeneration.message || 'N/A'}
${reportData.validationResults.sampleDataGeneration.error ? `- **Error:** ${reportData.validationResults.sampleDataGeneration.error}` : ''}
` : ''}

### 🌐 API Validation
- **Status:** ${reportData.validationResults.apiValidation.status}
- **Execution Time:** ${reportData.validationResults.apiValidation.executionTime}
- **Message:** ${reportData.validationResults.apiValidation.message || 'N/A'}
${reportData.validationResults.apiValidation.error ? `- **Error:** ${reportData.validationResults.apiValidation.error}` : ''}

## Recommendations

${this.generateRecommendations()}

## Next Steps

1. **Address Failed Tests:** Review and fix any failed validation tests
2. **Performance Optimization:** Execute the generated performance optimization script
3. **Monitoring:** Set up continuous monitoring for database and API performance
4. **Documentation:** Update system documentation based on validation results
5. **Regular Validation:** Schedule regular validation runs to ensure ongoing system health

## Technical Details

### Database Configuration
- **Host:** ${reportData.database.host}
- **Port:** ${reportData.database.port}
- **Database:** ${reportData.database.database}

### Validation Tools Used
- Database Validation Suite
- Performance Optimizer
- Cross-Module Data Flow Tester
- API Validation Suite

---
*Report generated by MantisNXT Validation Framework*
`;
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations() {
    const recommendations = [];

    // Check each validation result for failures
    Object.entries(this.results).forEach(([testType, result]) => {
      if (result.status === 'failed') {
        switch (testType) {
          case 'databaseValidation':
            recommendations.push('🔧 **Database Issues:** Review database connectivity and table structure');
            break;
          case 'performanceOptimization':
            recommendations.push('⚡ **Performance Issues:** Analyze slow queries and optimize database indexes');
            break;
          case 'crossModuleFlow':
            recommendations.push('🔄 **Integration Issues:** Review cross-module data flow and referential integrity');
            break;
          case 'apiValidation':
            recommendations.push('🌐 **API Issues:** Review API endpoints and response formats');
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('✅ **All Systems Operational:** No critical issues detected');
      recommendations.push('📈 **Optimization:** Consider implementing performance optimization suggestions');
      recommendations.push('🔍 **Monitoring:** Set up proactive monitoring for continued system health');
    }

    return recommendations.map(rec => `- ${rec}`).join('\n');
  }

  /**
   * Display final summary
   */
  displayFinalSummary() {
    const totalTime = performance.now() - this.startTime;
    const summary = this.generateSummary();

    console.log('\n' + '='.repeat(60));
    console.log('🎯 MANTISNXT PLATFORM VALIDATION COMPLETE');
    console.log('='.repeat(60));

    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   Completed: ${summary.completedTests}`);
    console.log(`   Failed: ${summary.failedTests}`);
    console.log(`   Success Rate: ${summary.successRate}%`);
    console.log(`   Overall Status: ${summary.overallStatus.toUpperCase()}`);

    console.log(`\n⏱️  EXECUTION TIME:`);
    console.log(`   Total: ${totalTime.toFixed(2)}ms`);

    Object.entries(this.results).forEach(([testType, result]) => {
      if (result.executionTime) {
        console.log(`   ${testType}: ${result.executionTime}`);
      }
    });

    console.log(`\n📄 REPORT:`);
    if (this.results.summary.reportPath) {
      console.log(`   Generated: ${this.results.summary.reportPath}`);
    }

    if (summary.failedTests === 0) {
      console.log('\n✅ ALL VALIDATION TESTS PASSED!');
      console.log('🚀 MantisNXT platform is ready for production use');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED');
      console.log('🔧 Review the detailed report and address failed tests');
    }

    console.log(`\nCompleted at: ${new Date().toISOString()}`);
  }
}

// CLI argument parsing
function parseCliArguments() {
  const args = process.argv.slice(2);
  const config = {
    runDatabaseValidation: true,
    runPerformanceOptimization: true,
    runCrossModuleFlow: true,
    generateSampleData: false,
    runApiValidation: true,
    generateReport: true
  };

  args.forEach(arg => {
    switch (arg) {
      case '--no-db':
        config.runDatabaseValidation = false;
        break;
      case '--no-perf':
        config.runPerformanceOptimization = false;
        break;
      case '--no-flow':
        config.runCrossModuleFlow = false;
        break;
      case '--with-sample-data':
        config.generateSampleData = true;
        break;
      case '--no-api':
        config.runApiValidation = false;
        break;
      case '--no-report':
        config.generateReport = false;
        break;
      case '--help':
        console.log(`
MantisNXT Master Validation Runner

Usage: node master-validation-runner.js [options]

Options:
  --no-db             Skip database validation
  --no-perf           Skip performance optimization
  --no-flow           Skip cross-module flow testing
  --with-sample-data  Generate sample data
  --no-api            Skip API validation
  --no-report         Skip report generation
  --help              Show this help message

Examples:
  node master-validation-runner.js
  node master-validation-runner.js --with-sample-data
  node master-validation-runner.js --no-perf --no-api
        `);
        process.exit(0);
        break;
    }
  });

  return config;
}

// Run if called directly
if (require.main === module) {
  const config = parseCliArguments();
  const runner = new MasterValidationRunner();
  Object.assign(runner.config, config);

  runner.runCompleteValidation().catch(error => {
    console.error('\n💥 VALIDATION SUITE FAILED:', error);
    process.exit(1);
  });
}

// Export for use in other scripts
module.exports = MasterValidationRunner;