#!/usr/bin/env bun
/**
 * lint-no-mocks.ts
 *
 * CI guardrail: scans production source paths for forbidden patterns
 * that indicate mock data, fallback org IDs, or fabricated metrics.
 *
 * Exit 0 = clean, Exit 1 = violations found.
 *
 * Usage:
 *   bun scripts/lint-no-mocks.ts
 *   bun scripts/lint-no-mocks.ts --fix  (shows suggestions)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

const ROOT = join(import.meta.dir, '..');

// Directories to scan (production code only)
const SCAN_DIRS = [
  'src/lib/services',
  'src/lib/analytics',
  'src/lib/ai/services',
  'src/app/api/v1/pricing',
  'src/app/api/v1/pricing-intel',
  'src/app/api/analytics',
  'src/app/pricing-optimization',
];

// File extensions to check
const EXTENSIONS = new Set(['.ts', '.tsx']);

// Patterns that should not appear in production paths.
// Each entry: [regex, description, severity]
type Severity = 'error' | 'warning';
const FORBIDDEN: [RegExp, string, Severity][] = [
  [
    /DEFAULT_ORG_ID/,
    'Hardcoded DEFAULT_ORG_ID — use authenticated org context',
    'error',
  ],
  [
    /FALLBACK_ORG_ID/,
    'Hardcoded FALLBACK_ORG_ID — use authenticated org context',
    'error',
  ],
  [
    /['"]00000000-0000-0000-0000-00000000000[0-9]['"]/,
    'Zero/emergency UUID literal — use authenticated org context',
    'error',
  ],
  [
    /Math\.random\(\)\s*\*\s*\d+.*(?:metric|value|price|cost|margin|score|rate|throughput|concurren|cpu|memory|disk|network)/i,
    'Math.random() generating user-facing metric — use real data or insufficient_data',
    'error',
  ],
  [
    /generateMock/i,
    'Mock data generator in production path',
    'error',
  ],
  [
    /\/\/\s*(?:For now|TODO:?\s*(?:Get from|Replace with|Wire to)).*(?:placeholder|mock|simul)/i,
    'TODO placeholder comment indicating incomplete implementation',
    'warning',
  ],
];

// Allowlist: files that are permitted to have specific patterns
const ALLOWLIST: Record<string, RegExp[]> = {
  // Test files are allowed to have anything
  'tests/': [/.*/],
  '.test.': [/.*/],
  '.spec.': [/.*/],
  // ML algorithms legitimately use Math.random for weight init, sampling
  'advanced-ml-models.ts': [/Math\.random/],
  'real-time-anomaly-detection.ts': [/Math\.random/],
};

interface Violation {
  file: string;
  line: number;
  pattern: string;
  description: string;
  severity: Severity;
  content: string;
}

function isAllowed(filePath: string, pattern: RegExp): boolean {
  for (const [pathFragment, allowedPatterns] of Object.entries(ALLOWLIST)) {
    if (filePath.includes(pathFragment)) {
      if (allowedPatterns.some(ap => ap.source === '.*' || ap.source === pattern.source)) {
        return true;
      }
    }
  }
  return false;
}

function collectFiles(dir: string): string[] {
  const files: string[] = [];
  const absDir = join(ROOT, dir);

  try {
    const entries = readdirSync(absDir);
    for (const entry of entries) {
      const fullPath = join(absDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        // Recurse, but compute relative sub-path
        const subRel = relative(ROOT, fullPath);
        files.push(...collectFiles(subRel));
      } else if (EXTENSIONS.has(extname(entry))) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist — skip silently
  }

  return files;
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const relPath = relative(ROOT, filePath);

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return violations;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const [pattern, description, severity] of FORBIDDEN) {
      if (pattern.test(line) && !isAllowed(relPath, pattern)) {
        violations.push({
          file: relPath,
          line: i + 1,
          pattern: pattern.source,
          description,
          severity,
          content: line.trim().substring(0, 120),
        });
      }
    }
  }

  return violations;
}

// Main
const allFiles: string[] = [];
for (const dir of SCAN_DIRS) {
  allFiles.push(...collectFiles(dir));
}

const allViolations: Violation[] = [];
for (const file of allFiles) {
  allViolations.push(...scanFile(file));
}

const errors = allViolations.filter(v => v.severity === 'error');
const warnings = allViolations.filter(v => v.severity === 'warning');

if (allViolations.length === 0) {
  console.log('✅ No mock/fallback patterns found in production paths.');
  process.exit(0);
}

console.log(`\n🔍 Scanned ${allFiles.length} files across ${SCAN_DIRS.length} directories\n`);

if (errors.length > 0) {
  console.log(`❌ ${errors.length} error(s):\n`);
  for (const v of errors) {
    console.log(`  ${v.file}:${v.line}`);
    console.log(`    ${v.description}`);
    console.log(`    > ${v.content}\n`);
  }
}

if (warnings.length > 0) {
  console.log(`⚠️  ${warnings.length} warning(s):\n`);
  for (const w of warnings) {
    console.log(`  ${w.file}:${w.line}`);
    console.log(`    ${w.description}`);
    console.log(`    > ${w.content}\n`);
  }
}

process.exit(errors.length > 0 ? 1 : 0);
