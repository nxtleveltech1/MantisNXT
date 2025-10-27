#!/usr/bin/env node

/**
 * Test Single File Processor
 * Tests price list processing with a single file before running full batch
 */

const { ProductionPriceListProcessor } = require('./production_pricelist_processor.js');
const path = require('path');

async function testSingleFile() {
    const processor = new ProductionPriceListProcessor();

    // Test with a smaller file first
    const testFile = 'K:\\00Project\\MantisNXT\\database\\Uploads\\drive-download-20250904T012253Z-1-001\\ApexPro Distribution pricelist 25-04-2025 (1).xlsx';

    console.log('🧪 Testing single file processing...\n');

    try {
        // Connect to database
        await processor.connectDatabase();

        // Process single file
        await processor.processPriceListFile(testFile);

        // Generate mini-report
        processor.generateReport();

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await processor.pool.end();
    }
}

// Run test
testSingleFile();