import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

const TARGET_DIRS = ['src', 'scripts'];
const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const DML_REGEX = /\b(INSERT|UPDATE|DELETE)\b[\s\S]{0,200}?public\.(suppliers|inventory_items)\b/gi;

const IGNORED_PATHS = [
  'node_modules',
  '.next',
  '.git',
  'database',
  'migrations',
  'tools',
  '__tests__',
];

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relativePath = fullPath.replace(process.cwd(), '').replace(/^[/\\]/, '');

    if (
      IGNORED_PATHS.some(ignore => relativePath.startsWith(ignore)) ||
      relativePath.includes('scripts/check-public-dml.ts')
    ) {
      continue;
    }

    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (FILE_EXTENSIONS.has(extname(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  const matches: { file: string; snippet: string }[] = [];

  for (const dir of TARGET_DIRS) {
    const root = join(process.cwd(), dir);
    let files: string[] = [];
    try {
      files = collectFiles(root);
    } catch {
      continue;
    }

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const results = Array.from(content.matchAll(DML_REGEX));
      if (results.length > 0) {
        matches.push({
          file,
          snippet: results
            .map(match => match[0].trim().replace(/\s+/g, ' ').slice(0, 200))
            .join('\n'),
        });
      }
    }
  }

  if (matches.length > 0) {
    console.error('❌ Detected DML statements targeting public.suppliers/public.inventory_items:');
    for (const match of matches) {
      console.error(`- ${match.file}\n  ${match.snippet}`);
    }
    process.exit(1);
  } else {
    console.log(
      '✓ No direct DML statements targeting public.suppliers/public.inventory_items found.'
    );
  }
}

main();
