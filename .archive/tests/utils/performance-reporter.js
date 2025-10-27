const fs = require('fs')
const path = require('path')

/**
 * Custom Jest reporter for performance monitoring
 */
class PerformanceReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig
    this.options = options
    this.results = {
      testResults: [],
      performance: {
        slowTests: [],
        memoryUsage: [],
        totalDuration: 0,
        coverage: null
      },
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        avgTestDuration: 0,
        slowestTest: null,
        fastestTest: null
      }
    }
  }

  onRunStart() {
    this.startTime = Date.now()
    this.initialMemory = process.memoryUsage()
    console.log('🚀 Starting test run with performance monitoring...')
  }

  onTestResult(test, testResult) {
    const testDuration = testResult.perfStats.end - testResult.perfStats.start

    // Track test performance
    const testPerformance = {
      testPath: testResult.testFilePath.replace(this.globalConfig.rootDir, ''),
      duration: testDuration,
      memoryUsage: process.memoryUsage(),
      numTests: testResult.numTotalTests,
      passed: testResult.numPassingTests,
      failed: testResult.numFailingTests,
      skipped: testResult.numTodoTests + testResult.numPendingTests
    }

    this.results.testResults.push(testPerformance)

    // Track slow tests (> 5 seconds)
    if (testDuration > 5000) {
      this.results.performance.slowTests.push({
        ...testPerformance,
        threshold: '5s'
      })
    }

    // Track memory usage spikes
    const currentMemory = process.memoryUsage()
    const memoryIncrease = currentMemory.heapUsed - this.initialMemory.heapUsed

    if (memoryIncrease > 50 * 1024 * 1024) { // 50MB threshold
      this.results.performance.memoryUsage.push({
        testPath: testPerformance.testPath,
        memoryIncrease: memoryIncrease / (1024 * 1024), // Convert to MB
        heapUsed: currentMemory.heapUsed / (1024 * 1024)
      })
    }

    // Update summary statistics
    this.results.summary.totalTests += testPerformance.numTests
    this.results.summary.passedTests += testPerformance.passed
    this.results.summary.failedTests += testPerformance.failed
    this.results.summary.skippedTests += testPerformance.skipped

    // Track slowest and fastest tests
    if (!this.results.summary.slowestTest || testDuration > this.results.summary.slowestTest.duration) {
      this.results.summary.slowestTest = testPerformance
    }

    if (!this.results.summary.fastestTest || testDuration < this.results.summary.fastestTest.duration) {
      this.results.summary.fastestTest = testPerformance
    }
  }

  onRunComplete(contexts, results) {
    const totalDuration = Date.now() - this.startTime
    this.results.performance.totalDuration = totalDuration

    // Calculate average test duration
    if (this.results.testResults.length > 0) {
      const totalTestDuration = this.results.testResults.reduce((sum, test) => sum + test.duration, 0)
      this.results.summary.avgTestDuration = totalTestDuration / this.results.testResults.length
    }

    // Add coverage information if available
    if (results.coverageMap) {
      const coverage = results.coverageMap.getCoverageSummary()
      this.results.performance.coverage = {
        lines: coverage.lines.pct,
        statements: coverage.statements.pct,
        functions: coverage.functions.pct,
        branches: coverage.branches.pct
      }
    }

    this.generateReport()
    this.logSummary()
  }

  generateReport() {
    const reportDir = path.join(this.globalConfig.rootDir, 'test-results')

    // Ensure report directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    // Write detailed performance report
    const reportPath = path.join(reportDir, 'performance-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2))

    // Generate human-readable report
    const humanReadableReport = this.generateHumanReadableReport()
    const humanReportPath = path.join(reportDir, 'performance-report.md')
    fs.writeFileSync(humanReportPath, humanReadableReport)

    // Generate CI-friendly report
    const ciReport = this.generateCIReport()
    const ciReportPath = path.join(reportDir, 'performance-results.json')
    fs.writeFileSync(ciReportPath, JSON.stringify(ciReport, null, 2))
  }

  generateHumanReadableReport() {
    const { summary, performance, testResults } = this.results

    return `# Test Performance Report

## Summary
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passedTests}
- **Failed**: ${summary.failedTests}
- **Skipped**: ${summary.skippedTests}
- **Total Duration**: ${(performance.totalDuration / 1000).toFixed(2)}s
- **Average Test Duration**: ${summary.avgTestDuration.toFixed(2)}ms

## Performance Metrics

### Test Duration Analysis
- **Slowest Test**: ${summary.slowestTest?.testPath} (${summary.slowestTest?.duration.toFixed(2)}ms)
- **Fastest Test**: ${summary.fastestTest?.testPath} (${summary.fastestTest?.duration.toFixed(2)}ms)

### Slow Tests (>5s)
${performance.slowTests.length === 0 ? 'No slow tests detected.' :
  performance.slowTests.map(test =>
    `- ${test.testPath}: ${(test.duration / 1000).toFixed(2)}s`
  ).join('\n')
}

### Memory Usage Analysis
${performance.memoryUsage.length === 0 ? 'No significant memory spikes detected.' :
  performance.memoryUsage.map(mem =>
    `- ${mem.testPath}: +${mem.memoryIncrease.toFixed(2)}MB (Total: ${mem.heapUsed.toFixed(2)}MB)`
  ).join('\n')
}

### Coverage Summary
${performance.coverage ? `
- **Lines**: ${performance.coverage.lines.toFixed(2)}%
- **Statements**: ${performance.coverage.statements.toFixed(2)}%
- **Functions**: ${performance.coverage.functions.toFixed(2)}%
- **Branches**: ${performance.coverage.branches.toFixed(2)}%
` : 'Coverage data not available'}

## Test Files Performance
${testResults
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 10)
  .map(test => `- ${test.testPath}: ${test.duration.toFixed(2)}ms (${test.numTests} tests)`)
  .join('\n')}

## Recommendations
${this.generateRecommendations()}
`
  }

  generateRecommendations() {
    const recommendations = []
    const { performance, summary } = this.results

    if (performance.slowTests.length > 0) {
      recommendations.push('🐌 Consider optimizing slow tests or splitting them into smaller units')
    }

    if (performance.memoryUsage.length > 0) {
      recommendations.push('💾 Review memory usage in tests with significant memory spikes')
    }

    if (summary.avgTestDuration > 1000) {
      recommendations.push('⏱️ Average test duration is high - consider test optimization')
    }

    if (performance.coverage && performance.coverage.lines < 80) {
      recommendations.push('📊 Test coverage is below 80% - consider adding more tests')
    }

    if (performance.totalDuration > 60000) {
      recommendations.push('🚀 Total test duration is high - consider parallel execution or test optimization')
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '✅ No performance issues detected'
  }

  generateCIReport() {
    return {
      api: {
        averageResponseTime: this.getAverageForSuite('api'),
        requestsPerSecond: this.calculateRPS('api'),
        errorRate: this.getErrorRate('api')
      },
      database: {
        averageQueryTime: this.getAverageForSuite('integration'),
        slowQueryCount: this.getSlowTestCount('integration')
      },
      memory: {
        peakUsage: Math.max(...this.results.performance.memoryUsage.map(m => m.heapUsed), 0),
        leaksDetected: this.results.performance.memoryUsage.length > 0
      },
      overall: {
        totalDuration: this.results.performance.totalDuration,
        testCount: this.results.summary.totalTests,
        successRate: (this.results.summary.passedTests / this.results.summary.totalTests) * 100
      }
    }
  }

  getAverageForSuite(suite) {
    const suiteTests = this.results.testResults.filter(test =>
      test.testPath.includes(`/${suite}/`)
    )

    if (suiteTests.length === 0) return 0

    const totalDuration = suiteTests.reduce((sum, test) => sum + test.duration, 0)
    return totalDuration / suiteTests.length
  }

  calculateRPS(suite) {
    const suiteTests = this.results.testResults.filter(test =>
      test.testPath.includes(`/${suite}/`)
    )

    if (suiteTests.length === 0) return 0

    const totalDuration = suiteTests.reduce((sum, test) => sum + test.duration, 0)
    const totalTests = suiteTests.reduce((sum, test) => sum + test.numTests, 0)

    return totalDuration > 0 ? (totalTests / (totalDuration / 1000)) : 0
  }

  getErrorRate(suite) {
    const suiteTests = this.results.testResults.filter(test =>
      test.testPath.includes(`/${suite}/`)
    )

    if (suiteTests.length === 0) return 0

    const totalTests = suiteTests.reduce((sum, test) => sum + test.numTests, 0)
    const failedTests = suiteTests.reduce((sum, test) => sum + test.failed, 0)

    return totalTests > 0 ? (failedTests / totalTests) * 100 : 0
  }

  getSlowTestCount(suite) {
    return this.results.performance.slowTests.filter(test =>
      test.testPath.includes(`/${suite}/`)
    ).length
  }

  logSummary() {
    const { summary, performance } = this.results

    console.log('\n📊 Test Performance Summary:')
    console.log(`   Total Duration: ${(performance.totalDuration / 1000).toFixed(2)}s`)
    console.log(`   Average Test Duration: ${summary.avgTestDuration.toFixed(2)}ms`)
    console.log(`   Slow Tests: ${performance.slowTests.length}`)
    console.log(`   Memory Spikes: ${performance.memoryUsage.length}`)

    if (performance.coverage) {
      console.log(`   Coverage: ${performance.coverage.lines.toFixed(1)}% lines`)
    }

    if (performance.slowTests.length > 0) {
      console.log('\n⚠️  Slow tests detected:')
      performance.slowTests.forEach(test => {
        console.log(`   ${test.testPath}: ${(test.duration / 1000).toFixed(2)}s`)
      })
    }

    if (performance.memoryUsage.length > 0) {
      console.log('\n💾 Memory usage warnings:')
      performance.memoryUsage.forEach(mem => {
        console.log(`   ${mem.testPath}: +${mem.memoryIncrease.toFixed(2)}MB`)
      })
    }

    console.log('\n📝 Detailed report saved to test-results/performance-report.md')
  }
}

module.exports = PerformanceReporter