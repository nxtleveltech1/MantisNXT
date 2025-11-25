const testLine = "1.2 Amps \\& Guitar Electronics";
const line = testLine.trim();

console.log('Testing line:', line);
console.log('L1 match:', line.match(/^(\d+)\\?\.\s+(.+)$/));
console.log('L2 match:', line.match(/^(\d+)\.(\d+)\s+(.+)$/));
console.log('Has bullet:', line.includes('•'));
console.log('Has o:', line.includes('o'));
console.log('Has 3 numbers:', /^\d+\.\d+\.\d+/.test(line));

const l1Match = line.match(/^(\d+)\\?\.\s+(.+)$/);
if (l1Match) {
  const num = parseInt(l1Match[1]);
  const rest = l1Match[2];
  console.log('L1 num:', num, 'rest:', rest);
  console.log('Rest has number:', rest.match(/^\d+\./));
  console.log('Would be L1:', num >= 1 && num <= 10 && !rest.match(/^\d+\./));
}

const l2Match = line.match(/^(\d+)\.(\d+)\s+(.+)$/);
if (l2Match) {
  console.log('L2 would match:', !line.includes('•') && !line.includes('o') && !line.match(/^\d+\.\d+\.\d+/));
}

