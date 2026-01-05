import { readFileSync } from 'fs';
import { join } from 'path';

const file = join(process.cwd(), 'Platform Modules', 'Categories', 'Categories_Hierachy.md');
const content = readFileSync(file, 'utf-8');
const lines = content.split('\n');

console.log('Looking for L1 categories (should be 10):');
let l1Count = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  // Check for L1 pattern: number followed by dot (escaped or not)
  if (/^\d+\\?\.\s+[A-Z]/.test(line) && !line.includes('•') && !line.includes('o')) {
    l1Count++;
    console.log(`  Line ${i + 1}: "${line.substring(0, 60)}"`);
    if (l1Count >= 12) break;
  }
}

console.log(`\nFound ${l1Count} L1 categories`);

console.log('\nLooking for L5 categories:');
let l5Count = 0;
for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  const line = raw.trim();
  // Check for L5: five numbers
  if (/^\d+\.\d+\.\d+\.\d+\.\d+/.test(line)) {
    l5Count++;
    console.log(`  Line ${i + 1}: "${line.substring(0, 60)}"`);
    console.log(`    Raw: "${raw.substring(0, 60)}"`);
    console.log(`    First char code: ${raw.charCodeAt(0)}`);
    if (l5Count >= 5) break;
  }
}

console.log(`\nFound ${l5Count} L5 categories`);
