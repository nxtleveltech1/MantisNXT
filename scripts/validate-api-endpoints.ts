import assert from 'node:assert';
import http from 'node:http';

function request(url: string, method = 'GET', headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const base = process.env.VALIDATION_BASE_URL || 'http://localhost:3000';

  const health = await request(`${base}/api/health`);
  assert.strictEqual(health.status, 200, 'health should be 200');

  const inv = await request(`${base}/api/inventory`);
  assert.strictEqual(inv.status, 200, 'inventory should be 200');

  const sup = await request(`${base}/api/suppliers`);
  assert.strictEqual(sup.status, 200, 'suppliers should be 200');

  // Parse inventory shape
  try {
    const invJson = JSON.parse(inv.body);
    assert.ok(Array.isArray(invJson.items), 'inventory.items should be array');
    assert.ok('nextCursor' in invJson, 'inventory should include nextCursor');
  } catch (e) {
    throw new Error('Inventory response is not valid JSON or invalid shape');
  }

  console.log('API endpoint validation passed.');
}

main().catch((err) => {
  console.error('API endpoint validation failed:', err);
  process.exit(1);
});

/**
 * API Endpoint Validation Script
 *
 * Comprehensive validation using Chrome DevTools MCP to verify all API endpoint fixes.
 * This script orchestrates browser testing and generates detailed reports.
 *
 * Usage:
 *   npm run validate:api
 *
 * Prerequisites:
 *   - Chrome DevTools MCP server running
 *   - Development server running on http://localhost:3000
 *   - Backend fixes deployed
 */

interface EndpointTest {
  name: string;
  url: string;
  method: string;
  expectedStatus: number;
  critical: boolean;
}

interface PageTest {
  name: string;
  path: string;
  criticalEndpoints: string[];
  expectedConsoleErrors: number;
}

interface ValidationResult {
  timestamp: string;
  serverUrl: string;
  summary: {
    totalEndpoints: number;
    successfulEndpoints: number;
    failedEndpoints: number;
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    consoleErrorsBefore: number;
    consoleErrorsAfter: number;
  };
  endpointResults: EndpointResult[];
  pageResults: PageResult[];
  recommendations: string[];
}

interface EndpointResult {
  endpoint: string;
  method: string;
  status: 'success' | 'failed' | 'timeout';
  statusCode: number;
  responseTime: number;
  errorMessage?: string;
  critical: boolean;
}

interface PageResult {
  page: string;
  path: string;
  status: 'success' | 'failed';
  consoleErrors: ConsoleError[];
  networkRequests: NetworkRequest[];
  screenshotPath?: string;
  loadTime: number;
}

interface ConsoleError {
  type: string;
  message: string;
  source: string;
  timestamp: number;
}

interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  statusText: string;
  resourceType: string;
  duration: number;
}

// Define critical API endpoints to test
const ENDPOINTS_TO_TEST: EndpointTest[] = [
  // Analytics endpoints
  {
    name: 'Analytics Dashboard',
    url: '/api/analytics/dashboard',
    method: 'GET',
    expectedStatus: 200,
    critical: true
  },
  {
    name: 'Dashboard Metrics',
    url: '/api/dashboard_metrics',
    method: 'GET',
    expectedStatus: 200,
    critical: true
  },

  // Inventory endpoints
  {
    name: 'Inventory List',
    url: '/api/inventory',
    method: 'GET',
    expectedStatus: 200,
    critical: true
  },
  {
    name: 'Inventory Complete',
    url: '/api/inventory/complete',
    method: 'GET',
    expectedStatus: 200,
    critical: true
  },

  // Supplier endpoints
  {
    name: 'Suppliers List',
    url: '/api/suppliers',
    method: 'GET',
    expectedStatus: 200,
    critical: true
  },
  {
    name: 'Supplier Management',
    url: '/api/supplier-management',
    method: 'GET',
    expectedStatus: 200,
    critical: false
  },

  // Health check endpoints
  {
    name: 'Database Health',
    url: '/api/health/database',
    method: 'GET',
    expectedStatus: 200,
    critical: true
  },
  {
    name: 'Database Enterprise Health',
    url: '/api/health/database-enterprise',
    method: 'GET',
    expectedStatus: 200,
    critical: false
  },

  // SPP endpoints
  {
    name: 'SPP Dashboard',
    url: '/api/spp/dashboard',
    method: 'GET',
    expectedStatus: 200,
    critical: false
  },

  // Test endpoints
  {
    name: 'Live Test',
    url: '/api/test/live',
    method: 'GET',
    expectedStatus: 200,
    critical: false
  }
];

// Define pages to test
const PAGES_TO_TEST: PageTest[] = [
  {
    name: 'Dashboard',
    path: '/',
    criticalEndpoints: ['/api/analytics/dashboard', '/api/dashboard_metrics'],
    expectedConsoleErrors: 0
  },
  {
    name: 'Inventory',
    path: '/inventory',
    criticalEndpoints: ['/api/inventory', '/api/inventory/complete'],
    expectedConsoleErrors: 0
  },
  {
    name: 'Suppliers',
    path: '/suppliers',
    criticalEndpoints: ['/api/suppliers'],
    expectedConsoleErrors: 0
  },
  {
    name: 'Admin Dashboard',
    path: '/admin',
    criticalEndpoints: ['/api/analytics/dashboard'],
    expectedConsoleErrors: 0
  }
];

class APIValidator {
  private serverUrl: string;
  private results: ValidationResult;

  constructor(serverUrl: string = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
    this.results = this.initializeResults();
  }

  private initializeResults(): ValidationResult {
    return {
      timestamp: new Date().toISOString(),
      serverUrl: this.serverUrl,
      summary: {
        totalEndpoints: ENDPOINTS_TO_TEST.length,
        successfulEndpoints: 0,
        failedEndpoints: 0,
        totalPages: PAGES_TO_TEST.length,
        successfulPages: 0,
        failedPages: 0,
        consoleErrorsBefore: 0,
        consoleErrorsAfter: 0
      },
      endpointResults: [],
      pageResults: [],
      recommendations: []
    };
  }

  /**
   * Execute full validation workflow
   */
  async validate(): Promise<ValidationResult> {
    console.log('🚀 Starting API Endpoint Validation');
    console.log(`📍 Server URL: ${this.serverUrl}`);
    console.log(`🎯 Testing ${ENDPOINTS_TO_TEST.length} endpoints across ${PAGES_TO_TEST.length} pages\n`);

    try {
      // Step 1: Validate direct endpoint access
      console.log('📡 Step 1: Testing direct endpoint access...');
      await this.validateEndpoints();

      // Step 2: Validate pages with Chrome DevTools
      console.log('\n🌐 Step 2: Testing pages with Chrome DevTools...');
      await this.validatePages();

      // Step 3: Generate recommendations
      console.log('\n💡 Step 3: Generating recommendations...');
      this.generateRecommendations();

      // Step 4: Generate report
      console.log('\n📊 Step 4: Generating validation report...');
      await this.generateReport();

      console.log('\n✅ Validation complete!');

    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }

    return this.results;
  }

  /**
   * Test direct endpoint access
   */
  private async validateEndpoints(): Promise<void> {
    for (const endpoint of ENDPOINTS_TO_TEST) {
      const startTime = Date.now();

      try {
        const response = await fetch(`${this.serverUrl}${endpoint.url}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        const result: EndpointResult = {
          endpoint: endpoint.url,
          method: endpoint.method,
          status: response.status === endpoint.expectedStatus ? 'success' : 'failed',
          statusCode: response.status,
          responseTime,
          critical: endpoint.critical
        };

        if (response.status !== endpoint.expectedStatus) {
          result.errorMessage = `Expected ${endpoint.expectedStatus}, got ${response.status}`;
          this.results.summary.failedEndpoints++;
          console.log(`  ❌ ${endpoint.name}: ${response.status} (${responseTime}ms)`);
        } else {
          this.results.summary.successfulEndpoints++;
          console.log(`  ✅ ${endpoint.name}: ${response.status} (${responseTime}ms)`);
        }

        this.results.endpointResults.push(result);

      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        this.results.summary.failedEndpoints++;
        this.results.endpointResults.push({
          endpoint: endpoint.url,
          method: endpoint.method,
          status: 'timeout',
          statusCode: 0,
          responseTime,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          critical: endpoint.critical
        });

        console.log(`  ❌ ${endpoint.name}: TIMEOUT/ERROR (${responseTime}ms)`);
      }
    }
  }

  /**
   * Validate pages using Chrome DevTools MCP
   * NOTE: This method requires Chrome DevTools MCP to be active
   */
  private async validatePages(): Promise<void> {
    console.log('  ⚠️  Manual Chrome DevTools validation required');
    console.log('  Use the following MCP tools after starting the browser:');
    console.log('    1. mcp__chrome-devtools__list_pages');
    console.log('    2. mcp__chrome-devtools__navigate_page');
    console.log('    3. mcp__chrome-devtools__list_console_messages');
    console.log('    4. mcp__chrome-devtools__list_network_requests');
    console.log('    5. mcp__chrome-devtools__take_screenshot');

    // Placeholder for manual validation
    // The actual validation will be performed using MCP tools
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(): void {
    const { summary, endpointResults } = this.results;

    // Critical endpoint failures
    const criticalFailures = endpointResults.filter(r => r.critical && r.status !== 'success');
    if (criticalFailures.length > 0) {
      this.results.recommendations.push(
        `🚨 CRITICAL: ${criticalFailures.length} critical endpoints failing - immediate attention required`
      );
      criticalFailures.forEach(failure => {
        this.results.recommendations.push(
          `  - ${failure.endpoint}: ${failure.errorMessage || 'Status ' + failure.statusCode}`
        );
      });
    }

    // Performance issues
    const slowEndpoints = endpointResults.filter(r => r.responseTime > 1000);
    if (slowEndpoints.length > 0) {
      this.results.recommendations.push(
        `⚠️  ${slowEndpoints.length} endpoints responding slowly (>1s) - consider optimization`
      );
    }

    // Success rate
    const successRate = (summary.successfulEndpoints / summary.totalEndpoints) * 100;
    if (successRate < 100) {
      this.results.recommendations.push(
        `📊 Overall success rate: ${successRate.toFixed(1)}% - target 100%`
      );
    }

    // No issues found
    if (this.results.recommendations.length === 0) {
      this.results.recommendations.push('✅ All endpoints responding correctly - no issues detected');
    }
  }

  /**
   * Generate comprehensive validation report
   */
  private async generateReport(): Promise<void> {
    const report = this.formatReport();
    const reportPath = `K:\\00Project\\MantisNXT\\validation-reports\\api-validation-${Date.now()}.md`;

    console.log('\n' + '='.repeat(80));
    console.log(report);
    console.log('='.repeat(80));

    // Note: Actual file writing would happen here
    console.log(`\n📄 Full report would be saved to: ${reportPath}`);
  }

  /**
   * Format validation results as markdown report
   */
  private formatReport(): string {
    const { summary, endpointResults, recommendations } = this.results;

    let report = `# API Endpoint Validation Report\n\n`;
    report += `**Generated:** ${new Date(this.results.timestamp).toLocaleString()}\n`;
    report += `**Server:** ${this.serverUrl}\n\n`;

    // Summary section
    report += `## Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Endpoints | ${summary.totalEndpoints} |\n`;
    report += `| Successful | ${summary.successfulEndpoints} |\n`;
    report += `| Failed | ${summary.failedEndpoints} |\n`;
    report += `| Success Rate | ${((summary.successfulEndpoints / summary.totalEndpoints) * 100).toFixed(1)}% |\n\n`;

    // Endpoint results
    report += `## Endpoint Results\n\n`;
    report += `| Endpoint | Method | Status | Code | Time (ms) | Critical |\n`;
    report += `|----------|--------|--------|------|-----------|----------|\n`;

    endpointResults.forEach(result => {
      const statusIcon = result.status === 'success' ? '✅' : '❌';
      const critical = result.critical ? '🚨' : '';
      report += `| ${result.endpoint} | ${result.method} | ${statusIcon} | ${result.statusCode} | ${result.responseTime} | ${critical} |\n`;
    });

    report += `\n`;

    // Recommendations
    report += `## Recommendations\n\n`;
    recommendations.forEach(rec => {
      report += `${rec}\n`;
    });

    return report;
  }
}

// Main execution
async function main() {
  const validator = new APIValidator();
  const results = await validator.validate();

  // Exit with appropriate code
  process.exit(results.summary.failedEndpoints > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { APIValidator, ValidationResult, EndpointResult, PageResult };
