const { spawnSync } = require('child_process');
const path = require('path');

process.env.BROWSERSLIST_IGNORE_OLD_DATA = '1';
process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA = '1';

const suppressScript = path.join(__dirname, 'suppress-baseline-warning.cjs');
const requireOption = `--require=${suppressScript}`;
const existingNodeOptions = process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS.trim() : '';
process.env.NODE_OPTIONS = existingNodeOptions
  ? `${existingNodeOptions} ${requireOption}`
  : requireOption;

const nextBin = require.resolve('next/dist/bin/next');
const result = spawnSync(process.execPath, [nextBin, 'build', '--webpack'], {
  stdio: 'inherit',
  env: process.env,
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
