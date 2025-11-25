import { readFileSync } from 'fs';
import { join } from 'path';

const file = join(process.cwd(), 'Platform Modules', 'Categories', 'Categories_Hierachy.md');
const content = readFileSync(file, 'utf-8');
const lines = content.split('\n');

const l1LineNums = [11, 167, 243, 341, 387, 447, 507, 549, 595, 635];

console.log('Checking actual L1 lines from file:');
l1LineNums.forEach(lineNum => {
  const rawLine = lines[lineNum - 1];
  const line = rawLine.trim();
  const match = line.match(/^(\d+)\\?\.\s+(.+)$/);
  
  console.log(`\nLine ${lineNum}:`);
  console.log(`  Raw: "${rawLine}" (length: ${rawLine.length})`);
  console.log(`  Trimmed: "${line}"`);
  console.log(`  Match: ${match ? 'YES' : 'NO'}`);
  if (match) {
    const num = parseInt(match[1]);
    const rest = match[2];
    const hasBullet = /[•o▪●○]/.test(line) || rawLine.match(/^[•o▪●○]/);
    const hasTab = rawLine.startsWith('\t');
    const restHasNumber = rest.match(/^\d+\./);
    
    console.log(`  Num: ${num}`);
    console.log(`  Rest: "${rest}"`);
    console.log(`  Has bullet: ${hasBullet}`);
    console.log(`  Has tab: ${hasTab}`);
    console.log(`  Rest has number: ${restHasNumber ? 'YES' : 'NO'}`);
    console.log(`  Would match L1: ${num >= 1 && num <= 10 && !hasBullet && !hasTab && !restHasNumber}`);
  }
});

