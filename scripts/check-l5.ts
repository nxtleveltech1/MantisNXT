import { readFileSync } from 'fs';
import { join } from 'path';

const file = join(process.cwd(), 'Platform Modules', 'Categories', 'Categories_Hierachy.md');
const content = readFileSync(file, 'utf-8');
const lines = content.split('\n');

console.log('Checking line 19 (should be L5):');
const line19 = lines[18];
console.log(`Raw: "${line19}"`);
console.log(`Trimmed: "${line19.trim()}"`);
console.log(`First char: "${line19.trim()[0]}" (code: ${line19.trim().charCodeAt(0)})`);
console.log(`Has 5 numbers: ${/^\d+\.\d+\.\d+\.\d+\.\d+/.test(line19.trim())}`);

console.log('\nAll lines with 5 numbers:');
let count = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (/^\d+\.\d+\.\d+\.\d+\.\d+/.test(line)) {
    count++;
    console.log(`  Line ${i+1}: "${line.substring(0, 50)}" (first char code: ${line.charCodeAt(0)})`);
    if (count >= 10) break;
  }
}

