const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function patchBaselineBundle(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const search = 'console.warn("[baseline-browser-mapping]';
  const replacement = '(()=>{})("[baseline-browser-mapping]';

  if (!source.includes(search)) {
    return false;
  }

  const patched = source.replace(search, replacement);

  if (patched === source) {
    return false;
  }

  fs.writeFileSync(filePath, patched, 'utf8');
  return true;
}

function patchBaselineBrowserMapping() {
  const candidateDirs = [
    path.join(process.cwd(), 'node_modules', 'baseline-browser-mapping', 'dist'),
    path.join(process.cwd(), 'node_modules', 'browserslist', 'node_modules', 'baseline-browser-mapping', 'dist'),
  ];

  let patchedCount = 0;

  for (const baseDir of candidateDirs) {
    patchedCount += [
      path.join(baseDir, 'index.cjs'),
      path.join(baseDir, 'index.js'),
    ].filter(patchBaselineBundle).length;
  }

  if (patchedCount > 0) {
    console.log('Patched baseline-browser-mapping warning output for build environments.');
  }
}

patchBaselineBrowserMapping();

const repoGitDir = path.join(process.cwd(), '.git');
const isVercel = Boolean(process.env.VERCEL);

if (isVercel || !fs.existsSync(repoGitDir)) {
  console.log('Skipping Husky install: git metadata not available in this environment.');
  process.exit(0);
}

const result = spawnSync('bun', ['x', 'husky', 'install'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(0);
