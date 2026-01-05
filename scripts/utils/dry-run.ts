import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { normalizeToolCalls } from '../src/lib/ai/orchestrator/tool-call-utils';

type DryRunTestResult = {
  name: string;
  passed: boolean;
  details: Record<string, unknown>;
};

const resultsDir = resolve(process.cwd(), 'results', 'dry-run');

const writeResult = (result: DryRunTestResult) => {
  mkdirSync(resultsDir, { recursive: true });
  const filePath = resolve(resultsDir, `${result.name}.json`);
  writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
};

const hasArguments = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
};

const runToolCallMappingTest = (): DryRunTestResult => {
  const rawToolCalls = [
    {
      toolCallId: 'call_123',
      toolName: 'fetch_inventory',
      input: { sku: 'ABC-123', includePricing: true },
    },
    {
      id: 'call_legacy',
      name: 'update_price',
      arguments: { sku: 'XYZ-789', price: 42.5, currency: 'USD' },
    },
  ];

  const normalized = normalizeToolCalls(rawToolCalls);
  const preservedInputs = normalized.every(call => hasArguments(call.arguments));

  return {
    name: 'tool-call-argument-preservation',
    passed: preservedInputs,
    details: {
      rawToolCalls,
      normalized,
    },
  };
};

const runMixedArgumentShapeTest = (): DryRunTestResult => {
  const rawToolCalls = [
    {
      toolCallId: 'call_array',
      toolName: 'batch_process',
      input: [
        { id: 'row-1', action: 'create' },
        { id: 'row-2', action: 'update', changes: { price: 19.99 } },
      ],
    },
    {
      toolCallId: 'call_scalar',
      toolName: 'toggle_feature',
      input: 'enable-experimental-mode',
    },
  ];

  const normalized = normalizeToolCalls(rawToolCalls);
  const argumentShapes = normalized.map(call => typeof call.arguments);
  const preservedShapes = argumentShapes.includes('object') && argumentShapes.includes('string');

  return {
    name: 'tool-call-shape-coverage',
    passed: preservedShapes,
    details: {
      rawToolCalls,
      normalized,
      argumentShapes,
    },
  };
};

const tests: DryRunTestResult[] = [runToolCallMappingTest(), runMixedArgumentShapeTest()];

tests.forEach(writeResult);

const failures = tests.filter(test => !test.passed);

if (failures.length > 0) {
  console.error('Dry run checks failed:', failures.map(failure => failure.name).join(', '));
  process.exit(1);
}

console.log(`Dry run checks passed. Results written to ${resultsDir}`);
