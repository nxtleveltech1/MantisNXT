import { readFileSync } from 'fs';
import { join } from 'path';

const file = join(process.cwd(), 'Platform Modules', 'Categories', 'Categories_Hierachy.md');
const content = readFileSync(file, 'utf-8');
const lines = content.split('\n');

console.log('Testing L1 pattern matching:');
const testLines = [
  '1\. Musical Instruments',
  '2\. Studio, Recording \& Production',
  '3\. Live Sound \& PA',
  '10\. Spares, Components \& Consumables',
];

testLines.forEach(testLine => {
  const match = testLine.match(/^(\d+)\\?\.\s+(.+)$/);
  if (match) {
    const num = parseInt(match[1]);
    const rest = match[2];
    const hasBullet = testLine.includes('•') || testLine.includes('o');
    const hasTab = testLine.startsWith('\t');
    const restHasNumber = rest.match(/^\d+\./);

    console.log(`\nLine: "${testLine}"`);
    console.log(`  Match: ${match ? 'YES' : 'NO'}`);
    console.log(`  Num: ${num} (1-10: ${num >= 1 && num <= 10})`);
    console.log(`  Rest: "${rest}"`);
    console.log(`  Has bullet: ${hasBullet}`);
    console.log(`  Has tab: ${hasTab}`);
    console.log(`  Rest has number: ${restHasNumber ? 'YES' : 'NO'}`);
    console.log(
      `  Would match: ${num >= 1 && num <= 10 && !hasBullet && !hasTab && !restHasNumber}`
    );
  }
});

console.log('\n\nActual L1 lines from file:');
const l1Lines = [11, 167, 243, 341, 387, 447, 507, 549, 595, 635];
l1Lines.forEach(lineNum => {
  const line = lines[lineNum - 1];
  console.log(`Line ${lineNum}: "${line.trim()}"`);
});
