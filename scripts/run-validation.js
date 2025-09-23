#!/usr/bin/env node

/**
 * SIMPLE VALIDATION RUNNER
 *
 * Quick execution script for MantisNXT database validation
 */

require('dotenv').config();

const MasterValidationRunner = require('./master-validation-runner');

async function runValidation() {
  console.log('🚀 MantisNXT Database Validation Starting...\n');

  try {
    const runner = new MasterValidationRunner();
    await runner.runCompleteValidation();

    console.log('\n✅ Validation completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    process.exit(1);
  }
}

runValidation();