/**
 * Timestamp Validation Test Component
 * Tests all date/timestamp handling scenarios to ensure robustness
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  safeParseDate,
  safeGetTime,
  formatTimestamp,
  getRelativeTime,
  serializeTimestamp,
  sortByTimestamp,
  filterByDateRange
} from '@/lib/utils/date-utils';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface TestCase {
  name: string;
  input: unknown;
  expectedResult: 'valid' | 'invalid' | 'fallback';
  description: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  result: any;
  error?: string;
  duration: number;
}

const TEST_CASES: TestCase[] = [
  // Valid dates
  { name: 'ISO String', input: '2024-01-15T10:30:00.000Z', expectedResult: 'valid', description: 'Standard ISO date string' },
  { name: 'Date Object', input: new Date('2024-01-15'), expectedResult: 'valid', description: 'Native Date object' },
  { name: 'Timestamp Number', input: 1705312200000, expectedResult: 'valid', description: 'Unix timestamp' },
  { name: 'Simple Date String', input: '2024-01-15', expectedResult: 'valid', description: 'YYYY-MM-DD format' },

  // Invalid dates that should fallback gracefully
  { name: 'Null Input', input: null, expectedResult: 'fallback', description: 'Null value' },
  { name: 'Undefined Input', input: undefined, expectedResult: 'fallback', description: 'Undefined value' },
  { name: 'Empty String', input: '', expectedResult: 'fallback', description: 'Empty string' },
  { name: 'Invalid String', input: 'not-a-date', expectedResult: 'fallback', description: 'Non-date string' },
  { name: 'Invalid Number', input: NaN, expectedResult: 'fallback', description: 'NaN value' },
  { name: 'Invalid Date Object', input: new Date('invalid'), expectedResult: 'fallback', description: 'Invalid Date object' },

  // Edge cases
  { name: 'Future Date', input: '2030-12-31T23:59:59.999Z', expectedResult: 'valid', description: 'Far future date' },
  { name: 'Past Date', input: '1970-01-01T00:00:00.000Z', expectedResult: 'valid', description: 'Unix epoch' },
  { name: 'Zero Timestamp', input: 0, expectedResult: 'valid', description: 'Zero timestamp' },
];

export default function TimestampValidationTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<any>(null);

  /**
   * Run individual test case
   */
  const runTest = (testCase: TestCase): TestResult => {
    const startTime = performance.now();

    try {
      // Test safeParseDate
      const parseResult = safeParseDate(testCase.input);
      const isValidParse = parseResult !== null;

      // Test safeGetTime
      const timeResult = safeGetTime(testCase.input);
      const isValidTime = !isNaN(timeResult);

      // Test formatTimestamp
      const formatResult = formatTimestamp(testCase.input);
      const isValidFormat = !formatResult.includes('Invalid');

      // Test getRelativeTime
      const relativeResult = getRelativeTime(testCase.input);
      const isValidRelative = !relativeResult.includes('Unknown');

      // Test serializeTimestamp
      const serializeResult = serializeTimestamp(testCase.input);
      const isValidSerialize = serializeResult.includes('T') && serializeResult.includes('Z');

      const endTime = performance.now();

      // Determine if test passed based on expected result
      let passed = false;
      if (testCase.expectedResult === 'valid') {
        passed = isValidParse && isValidTime && isValidFormat && isValidRelative && isValidSerialize;
      } else if (testCase.expectedResult === 'fallback') {
        passed = !isValidParse && !isValidRelative; // Should fallback gracefully
      }

      return {
        name: testCase.name,
        passed,
        result: {
          parseResult: parseResult?.toISOString() || 'null',
          timeResult,
          formatResult,
          relativeResult,
          serializeResult,
          isValidParse,
          isValidTime,
          isValidFormat,
          isValidRelative,
          isValidSerialize
        },
        duration: endTime - startTime
      };

    } catch (error) {
      const endTime = performance.now();
      return {
        name: testCase.name,
        passed: false,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: endTime - startTime
      };
    }
  };

  /**
   * Run all tests
   */
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const results: TestResult[] = [];

    for (const testCase of TEST_CASES) {
      const result = runTest(testCase);
      results.push(result);

      // Update results incrementally for better UX
      setTestResults([...results]);

      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    setIsRunning(false);
  };

  /**
   * Test API endpoint timestamp handling
   */
  const testApiEndpoint = async () => {
    try {
      const response = await fetch('/api/activities/recent?limit=5');
      const result = await response.json();

      if (result.success && result.data) {
        // Test that all timestamps can be parsed
        const timestampTests = result.data.map((activity: any) => ({
          id: activity.id,
          timestamp: activity.timestamp,
          canParse: safeParseDate(activity.timestamp) !== null,
          formatted: formatTimestamp(activity.timestamp),
          relative: getRelativeTime(activity.timestamp)
        }));

        setApiTestResult({
          success: true,
          totalActivities: result.data.length,
          validTimestamps: timestampTests.filter((t: any) => t.canParse).length,
          details: timestampTests
        });
      } else {
        setApiTestResult({
          success: false,
          error: result.error || 'Failed to fetch activities'
        });
      }
    } catch (error) {
      setApiTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'API test failed'
      });
    }
  };

  /**
   * Test array sorting and filtering
   */
  const testArrayOperations = () => {
    const testData = [
      { id: '1', timestamp: '2024-01-15T10:00:00Z', name: 'First' },
      { id: '2', timestamp: '2024-01-15T12:00:00Z', name: 'Second' },
      { id: '3', timestamp: null, name: 'Null timestamp' },
      { id: '4', timestamp: '2024-01-15T08:00:00Z', name: 'Third' },
      { id: '5', timestamp: 'invalid-date', name: 'Invalid timestamp' }
    ];

    try {
      // Test sorting
      const sorted = sortByTimestamp(testData, 'desc');
      const sortedValid = sorted.filter(item => safeParseDate(item.timestamp) !== null);

      // Test filtering
      const filtered = filterByDateRange(
        testData,
        '2024-01-15T09:00:00Z',
        '2024-01-15T11:00:00Z'
      );

      return {
        success: true,
        originalCount: testData.length,
        sortedCount: sorted.length,
        validAfterSort: sortedValid.length,
        filteredCount: filtered.length,
        sortOrder: sorted.map(item => item.name)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Array operations failed'
      };
    }
  };

  /**
   * Calculate test summary
   */
  const testSummary = React.useMemo(() => {
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const avgDuration = total > 0 ? testResults.reduce((sum, r) => sum + r.duration, 0) / total : 0;

    return { total, passed, failed, avgDuration };
  }, [testResults]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Timestamp Validation Test Suite</span>
          </CardTitle>
          <CardDescription>
            Comprehensive testing of date/timestamp handling across the application
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              onClick={runAllTests}
              disabled={isRunning}
              variant="default"
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>

            <Button
              onClick={testApiEndpoint}
              variant="outline"
            >
              Test API Endpoint
            </Button>

            <Button
              onClick={() => setTestResults([])}
              variant="outline"
              disabled={isRunning}
            >
              Clear Results
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{testSummary.total}</div>
                <div className="text-sm text-gray-600">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{testSummary.passed}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{testSummary.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{testSummary.avgDuration.toFixed(2)}ms</div>
                <div className="text-sm text-gray-600">Avg Duration</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {result.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{result.name}</div>
                      {result.error && (
                        <div className="text-sm text-red-600">{result.error}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant={result.passed ? 'default' : 'destructive'}>
                      {result.passed ? 'PASS' : 'FAIL'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {result.duration.toFixed(2)}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Test Results */}
      {apiTestResult && (
        <Card>
          <CardHeader>
            <CardTitle>API Endpoint Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {apiTestResult.success ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    API test successful! {apiTestResult.validTimestamps}/{apiTestResult.totalActivities} timestamps are valid.
                  </AlertDescription>
                </Alert>

                {apiTestResult.details && (
                  <div className="space-y-2">
                    {apiTestResult.details.map((detail: any, index: number) => (
                      <div key={index} className="p-2 border rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-mono">{detail.id}</span>
                          <Badge variant={detail.canParse ? 'default' : 'destructive'}>
                            {detail.canParse ? 'Valid' : 'Invalid'}
                          </Badge>
                        </div>
                        <div className="text-gray-600 mt-1">
                          <div>Formatted: {detail.formatted}</div>
                          <div>Relative: {detail.relative}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  API test failed: {apiTestResult.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Array Operations Test */}
      <Card>
        <CardHeader>
          <CardTitle>Array Operations Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              const result = testArrayOperations();
              console.log('Array operations test result:', result);
              alert(JSON.stringify(result, null, 2));
            }}
            variant="outline"
          >
            Test Sorting & Filtering
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}