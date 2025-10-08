const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Installing dependencies for price list upload system...\n');

// Required dependencies for the upload system
const dependencies = [
  'xlsx',           // Excel file parsing
  'csv-parse',      // CSV file parsing
  'uuid',           // UUID generation
  'mime-types',     // MIME type detection
  'multer',         // File upload handling (if needed)
  '@types/uuid',    // TypeScript types for UUID
];

const devDependencies = [
  '@types/xlsx',    // TypeScript types for xlsx
];

try {
  console.log('📦 Installing production dependencies...');
  execSync(`npm install ${dependencies.join(' ')}`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('\n📦 Installing development dependencies...');
  execSync(`npm install --save-dev ${devDependencies.join(' ')}`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('\n✅ All dependencies installed successfully!\n');

  // Create upload directories if they don't exist
  const uploadDirs = [
    'uploads',
    'uploads/pricelists',
    'uploads/temp',
    'uploads/processed'
  ];

  console.log('📁 Creating upload directories...');
  uploadDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`  ✓ Created ${dir}/`);
    } else {
      console.log(`  ✓ ${dir}/ already exists`);
    }
  });

  // Create .gitignore entries for upload directories
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const gitignoreEntries = [
    '',
    '# Price list upload files',
    'uploads/pricelists/*.xlsx',
    'uploads/pricelists/*.xls',
    'uploads/pricelists/*.csv',
    'uploads/pricelists/*.json',
    'uploads/temp/*',
    'uploads/processed/*',
    '!uploads/pricelists/.gitkeep',
    '!uploads/temp/.gitkeep',
    '!uploads/processed/.gitkeep'
  ];

  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('# Price list upload files')) {
      fs.appendFileSync(gitignorePath, gitignoreEntries.join('\n') + '\n');
      console.log('  ✓ Updated .gitignore with upload directory rules');
    } else {
      console.log('  ✓ .gitignore already configured');
    }
  }

  // Create .gitkeep files for empty directories
  const gitkeepDirs = ['uploads/pricelists', 'uploads/temp', 'uploads/processed'];
  gitkeepDirs.forEach(dir => {
    const gitkeepPath = path.join(process.cwd(), dir, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
      console.log(`  ✓ Created ${dir}/.gitkeep`);
    }
  });

  console.log('\n🎉 Price list upload system setup complete!\n');

  console.log('📋 Next steps:');
  console.log('1. Run the database schema setup:');
  console.log('   npm run db:setup-upload-tables');
  console.log('');
  console.log('2. Configure environment variables (if needed):');
  console.log('   MAX_UPLOAD_SIZE=52428800  # 50MB');
  console.log('   UPLOAD_DIR=uploads/pricelists');
  console.log('');
  console.log('3. Test the upload system:');
  console.log('   npm run test:upload');
  console.log('');

  // Create a test script for the upload system
  const testScript = `#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing price list upload system...');

// Test file parsing utilities
try {
  const { FileParserService } = require('./src/lib/upload/file-parser.ts');
  console.log('✅ File parser service loaded');
} catch (error) {
  console.log('❌ File parser service failed to load:', error.message);
}

// Test data transformer
try {
  const { DataTransformer } = require('./src/lib/upload/transformer.ts');
  console.log('✅ Data transformer loaded');
} catch (error) {
  console.log('❌ Data transformer failed to load:', error.message);
}

// Test data validator
try {
  const { DataValidator } = require('./src/lib/upload/validator.ts');
  console.log('✅ Data validator loaded');
} catch (error) {
  console.log('❌ Data validator failed to load:', error.message);
}

// Test upload directories
const uploadDirs = ['uploads', 'uploads/pricelists', 'uploads/temp', 'uploads/processed'];
uploadDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(\`✅ \${dir}/ directory exists\`);
  } else {
    console.log(\`❌ \${dir}/ directory missing\`);
  }
});

console.log('\\n🎉 Upload system test complete!');
`;

  fs.writeFileSync(path.join(process.cwd(), 'scripts/test-upload-system.js'), testScript);
  console.log('📝 Created test script at scripts/test-upload-system.js');

  // Update package.json scripts
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    // Add upload-related scripts
    const newScripts = {
      'db:setup-upload-tables': 'psql $DATABASE_URL -f database/schema/pricelist-upload-tables.sql',
      'test:upload': 'node scripts/test-upload-system.js',
      'upload:cleanup': 'node scripts/cleanup-old-uploads.js'
    };

    Object.assign(packageJson.scripts, newScripts);

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('📝 Updated package.json with upload scripts');
  }

} catch (error) {
  console.error('❌ Installation failed:', error.message);
  console.error('\nPlease install dependencies manually:');
  console.error(`npm install ${dependencies.join(' ')}`);
  console.error(`npm install --save-dev ${devDependencies.join(' ')}`);
  process.exit(1);
}