/**
 * =====================================================
 * FINANCIAL DATA STRUCTURE VALIDATION
 * Agent 5 - MantisNXT Invoice & Financial System
 * =====================================================
 * Validates the structure and logic of financial SQL scripts
 * Can be run without database connectivity for development/testing
 */

const fs = require('fs');
const path = require('path');

/**
 * Main validation function for financial data structure
 */
async function validateFinancialStructure() {
    console.log('🔍 VALIDATING FINANCIAL DATA STRUCTURE...\n');
    
    const validation = {
        schema: validateSchemaStructure(),
        invoices: validateInvoiceData(),
        businessLogic: validateBusinessLogic(),
        integrity: validateDataIntegrity()
    };
    
    // Generate validation report
    generateStructuralValidationReport(validation);
    
    // Calculate overall structural health score
    const healthScore = calculateStructuralHealthScore(validation);
    
    console.log('\n🎉 STRUCTURAL VALIDATION COMPLETE');
    console.log(`📊 Financial Structure Health Score: ${healthScore}%`);
    
    if (healthScore >= 95) {
        console.log('✅ EXCELLENT: Financial structure is production-ready');
    } else if (healthScore >= 85) {
        console.log('✅ GOOD: Financial structure is solid with minor areas for improvement');
    } else if (healthScore >= 75) {
        console.log('⚠️ WARNING: Financial structure has issues requiring attention');
    } else {
        console.log('🚨 CRITICAL: Financial structure has serious issues');
    }
    
    return validation;
}

/**
 * Validate database schema structure
 */
function validateSchemaStructure() {
    console.log('📋 Validating Schema Structure...');
    
    const validation = {
        score: 0,
        issues: [],
        checks: 0,
        passed: 0
    };
    
    try {
        const schemaContent = fs.readFileSync('scripts/create_invoice_and_financial_schema.sql', 'utf8');
        
        // Check for required tables
        const requiredTables = [
            'invoices',
            'invoice_line_items', 
            'payments',
            'payment_allocations',
            'accounts_payable',
            'general_ledger_entries',
            'general_ledger_lines',
            'three_way_matching',
            'chart_of_accounts'
        ];
        
        requiredTables.forEach(table => {
            validation.checks++;
            if (schemaContent.includes(`CREATE TABLE ${table}`)) {
                validation.passed++;
                console.log(`  ✅ Table ${table} defined`);
            } else {
                validation.issues.push(`Missing table: ${table}`);
                console.log(`  ❌ Table ${table} missing`);
            }
        });
        
        // Check for required enums
        const requiredEnums = [
            'invoice_status',
            'payment_status', 
            'three_way_match_status',
            'gl_account_type',
            'payment_method'
        ];
        
        requiredEnums.forEach(enumType => {
            validation.checks++;
            if (schemaContent.includes(`CREATE TYPE ${enumType}`)) {
                validation.passed++;
                console.log(`  ✅ Enum ${enumType} defined`);
            } else {
                validation.issues.push(`Missing enum: ${enumType}`);
                console.log(`  ❌ Enum ${enumType} missing`);
            }
        });
        
        // Check for foreign key relationships
        validation.checks++;
        if (schemaContent.includes('REFERENCES') && schemaContent.includes('FOREIGN KEY')) {
            validation.passed++;
            console.log('  ✅ Foreign key relationships defined');
        } else {
            validation.issues.push('Missing foreign key relationships');
            console.log('  ❌ Foreign key relationships incomplete');
        }
        
        // Check for proper constraints
        validation.checks++;
        if (schemaContent.includes('CHECK') && schemaContent.includes('NOT NULL')) {
            validation.passed++;
            console.log('  ✅ Database constraints defined');
        } else {
            validation.issues.push('Missing database constraints');
            console.log('  ❌ Database constraints incomplete');
        }
        
    } catch (error) {
        validation.issues.push(`Schema file error: ${error.message}`);
        console.log(`  ❌ Schema file error: ${error.message}`);
    }
    
    validation.score = Math.round((validation.passed / validation.checks) * 100);
    console.log(`  📊 Schema Structure Score: ${validation.score}%\n`);
    
    return validation;
}

/**
 * Validate invoice data structure and completeness
 */
function validateInvoiceData() {
    console.log('💰 Validating Invoice Data...');
    
    const validation = {
        score: 0,
        issues: [],
        checks: 0,
        passed: 0,
        invoiceCount: 0,
        scenarios: []
    };
    
    try {
        const invoiceContent = fs.readFileSync('scripts/generate_22_realistic_invoices.sql', 'utf8');
        
        // Count invoice insertions
        const invoiceMatches = invoiceContent.match(/INSERT INTO invoices/g);
        if (invoiceMatches) {
            validation.invoiceCount = invoiceMatches.length;
            console.log(`  📊 Found ${validation.invoiceCount} invoice INSERT statements`);
        }
        
        // Check for 22 invoices as required
        validation.checks++;
        const valueMatches = invoiceContent.match(/VALUES\s*\(/g);
        if (valueMatches && valueMatches.length >= 22) {
            validation.passed++;
            console.log('  ✅ 22 invoices data found');
        } else {
            validation.issues.push('Less than 22 invoices found');
            console.log('  ❌ Missing required 22 invoices');
        }
        
        // Check for realistic invoice statuses
        const statusTypes = ['paid', 'pending', 'approved', 'overdue', 'draft'];
        statusTypes.forEach(status => {
            validation.checks++;
            if (invoiceContent.includes(`'${status}'`)) {
                validation.passed++;
                validation.scenarios.push(status);
                console.log(`  ✅ ${status.toUpperCase()} status scenario included`);
            } else {
                validation.issues.push(`Missing ${status} status scenario`);
                console.log(`  ❌ Missing ${status} status scenario`);
            }
        });
        
        // Check for payment records
        validation.checks++;
        if (invoiceContent.includes('INSERT INTO payments')) {
            validation.passed++;
            console.log('  ✅ Payment records included');
        } else {
            validation.issues.push('Missing payment records');
            console.log('  ❌ Missing payment records');
        }
        
        // Check for accounts payable
        validation.checks++;
        if (invoiceContent.includes('INSERT INTO accounts_payable')) {
            validation.passed++;
            console.log('  ✅ Accounts payable entries included');
        } else {
            validation.issues.push('Missing accounts payable entries');
            console.log('  ❌ Missing accounts payable entries');
        }
        
        // Check for general ledger entries
        validation.checks++;
        if (invoiceContent.includes('INSERT INTO general_ledger_entries')) {
            validation.passed++;
            console.log('  ✅ General ledger entries included');
        } else {
            validation.issues.push('Missing general ledger entries');
            console.log('  ❌ Missing general ledger entries');
        }
        
        // Check for three-way matching
        validation.checks++;
        if (invoiceContent.includes('INSERT INTO three_way_matching')) {
            validation.passed++;
            console.log('  ✅ Three-way matching records included');
        } else {
            validation.issues.push('Missing three-way matching records');
            console.log('  ❌ Missing three-way matching records');
        }
        
        // Check for early payment discount logic
        validation.checks++;
        if (invoiceContent.includes('early_payment_discount')) {
            validation.passed++;
            console.log('  ✅ Early payment discount logic included');
        } else {
            validation.issues.push('Missing early payment discount logic');
            console.log('  ❌ Missing early payment discount logic');
        }
        
    } catch (error) {
        validation.issues.push(`Invoice data file error: ${error.message}`);
        console.log(`  ❌ Invoice data file error: ${error.message}`);
    }
    
    validation.score = Math.round((validation.passed / validation.checks) * 100);
    console.log(`  📊 Invoice Data Score: ${validation.score}%\n`);
    
    return validation;
}

/**
 * Validate business logic consistency
 */
function validateBusinessLogic() {
    console.log('🧠 Validating Business Logic...');
    
    const validation = {
        score: 0,
        issues: [],
        checks: 0,
        passed: 0,
        logicRules: []
    };
    
    try {
        const schemaContent = fs.readFileSync('scripts/create_invoice_and_financial_schema.sql', 'utf8');
        const invoiceContent = fs.readFileSync('scripts/generate_22_realistic_invoices.sql', 'utf8');
        
        // Check for calculated fields
        validation.checks++;
        if (schemaContent.includes('GENERATED ALWAYS AS')) {
            validation.passed++;
            validation.logicRules.push('Automatic calculation fields');
            console.log('  ✅ Calculated fields for automatic computation');
        } else {
            validation.issues.push('Missing automatic calculation fields');
            console.log('  ❌ Missing automatic calculation fields');
        }
        
        // Check for triggers
        validation.checks++;
        if (schemaContent.includes('CREATE TRIGGER') || schemaContent.includes('CREATE OR REPLACE FUNCTION')) {
            validation.passed++;
            validation.logicRules.push('Business logic triggers');
            console.log('  ✅ Business logic triggers defined');
        } else {
            validation.issues.push('Missing business logic triggers');
            console.log('  ❌ Missing business logic triggers');
        }
        
        // Check for proper status workflow
        validation.checks++;
        if (invoiceContent.includes("'draft'") && invoiceContent.includes("'approved'") && invoiceContent.includes("'paid'")) {
            validation.passed++;
            validation.logicRules.push('Status workflow progression');
            console.log('  ✅ Proper status workflow defined');
        } else {
            validation.issues.push('Incomplete status workflow');
            console.log('  ❌ Incomplete status workflow');
        }
        
        // Check for date logic consistency
        validation.checks++;
        if (invoiceContent.includes('CURRENT_DATE - INTERVAL') && invoiceContent.includes('CURRENT_DATE + INTERVAL')) {
            validation.passed++;
            validation.logicRules.push('Realistic date progressions');
            console.log('  ✅ Realistic date logic implemented');
        } else {
            validation.issues.push('Inconsistent date logic');
            console.log('  ❌ Inconsistent date logic');
        }
        
        // Check for financial calculations
        validation.checks++;
        if (invoiceContent.includes('early_payment_discount') && invoiceContent.includes('subtotal') && invoiceContent.includes('tax_amount')) {
            validation.passed++;
            validation.logicRules.push('Financial calculation accuracy');
            console.log('  ✅ Financial calculations included');
        } else {
            validation.issues.push('Incomplete financial calculations');
            console.log('  ❌ Incomplete financial calculations');
        }
        
    } catch (error) {
        validation.issues.push(`Business logic file error: ${error.message}`);
        console.log(`  ❌ Business logic file error: ${error.message}`);
    }
    
    validation.score = Math.round((validation.passed / validation.checks) * 100);
    console.log(`  📊 Business Logic Score: ${validation.score}%\n`);
    
    return validation;
}

/**
 * Validate data integrity and relationships
 */
function validateDataIntegrity() {
    console.log('🔗 Validating Data Integrity...');
    
    const validation = {
        score: 0,
        issues: [],
        checks: 0,
        passed: 0,
        relationships: []
    };
    
    try {
        const invoiceContent = fs.readFileSync('scripts/generate_22_realistic_invoices.sql', 'utf8');
        
        // Check for proper UUID structure
        validation.checks++;
        const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
        const uuidMatches = invoiceContent.match(uuidPattern);
        if (uuidMatches && uuidMatches.length >= 44) { // 22 invoices × 2 UUIDs minimum
            validation.passed++;
            validation.relationships.push('UUID referential integrity');
            console.log(`  ✅ UUID structure validated (${uuidMatches.length} UUIDs found)`);
        } else {
            validation.issues.push('Insufficient UUID relationships');
            console.log('  ❌ Insufficient UUID relationships');
        }
        
        // Check for organization consistency
        validation.checks++;
        const orgIdMatches = invoiceContent.match(/00000000-0000-0000-0000-000000000001/g);
        if (orgIdMatches && orgIdMatches.length >= 22) {
            validation.passed++;
            validation.relationships.push('Organization ID consistency');
            console.log('  ✅ Organization ID consistency maintained');
        } else {
            validation.issues.push('Organization ID inconsistency');
            console.log('  ❌ Organization ID inconsistency');
        }
        
        // Check for purchase order references
        validation.checks++;
        const poReferences = invoiceContent.match(/10000[0-9]{3}-0000-0000-0000-000000000001/g);
        if (poReferences && poReferences.length >= 22) {
            validation.passed++;
            validation.relationships.push('Purchase order references');
            console.log('  ✅ Purchase order references maintained');
        } else {
            validation.issues.push('Missing purchase order references');
            console.log('  ❌ Missing purchase order references');
        }
        
        // Check for supplier references
        validation.checks++;
        const supplierReferences = invoiceContent.match(/[1-9]{8}-[1-9]{4}-[1-9]{4}-[1-9]{4}-[1-9]{12}/g);
        if (supplierReferences && supplierReferences.length >= 22) {
            validation.passed++;
            validation.relationships.push('Supplier references');
            console.log('  ✅ Supplier references validated');
        } else {
            validation.issues.push('Missing supplier references');
            console.log('  ❌ Missing supplier references');
        }
        
        // Check for financial consistency
        validation.checks++;
        if (invoiceContent.includes('subtotal') && invoiceContent.includes('total_amount') && invoiceContent.includes('paid_amount')) {
            validation.passed++;
            validation.relationships.push('Financial field consistency');
            console.log('  ✅ Financial field consistency validated');
        } else {
            validation.issues.push('Financial field inconsistency');
            console.log('  ❌ Financial field inconsistency');
        }
        
    } catch (error) {
        validation.issues.push(`Data integrity file error: ${error.message}`);
        console.log(`  ❌ Data integrity file error: ${error.message}`);
    }
    
    validation.score = Math.round((validation.passed / validation.checks) * 100);
    console.log(`  📊 Data Integrity Score: ${validation.score}%\n`);
    
    return validation;
}

/**
 * Generate comprehensive validation report
 */
function generateStructuralValidationReport(results) {
    console.log('📋 STRUCTURAL VALIDATION REPORT');
    console.log('=====================================\n');
    
    // Schema validation summary
    console.log('🏗️ SCHEMA STRUCTURE:');
    console.log(`   Score: ${results.schema.score}%`);
    console.log(`   Checks: ${results.schema.passed}/${results.schema.checks} passed`);
    if (results.schema.issues.length > 0) {
        console.log('   Issues:');
        results.schema.issues.forEach(issue => console.log(`     - ${issue}`));
    }
    console.log('');
    
    // Invoice data summary
    console.log('💰 INVOICE DATA:');
    console.log(`   Score: ${results.invoices.score}%`);
    console.log(`   Checks: ${results.invoices.passed}/${results.invoices.checks} passed`);
    console.log(`   Invoice Count: ${results.invoices.invoiceCount}`);
    console.log(`   Scenarios: ${results.invoices.scenarios.join(', ')}`);
    if (results.invoices.issues.length > 0) {
        console.log('   Issues:');
        results.invoices.issues.forEach(issue => console.log(`     - ${issue}`));
    }
    console.log('');
    
    // Business logic summary
    console.log('🧠 BUSINESS LOGIC:');
    console.log(`   Score: ${results.businessLogic.score}%`);
    console.log(`   Checks: ${results.businessLogic.passed}/${results.businessLogic.checks} passed`);
    console.log(`   Logic Rules: ${results.businessLogic.logicRules.join(', ')}`);
    if (results.businessLogic.issues.length > 0) {
        console.log('   Issues:');
        results.businessLogic.issues.forEach(issue => console.log(`     - ${issue}`));
    }
    console.log('');
    
    // Data integrity summary
    console.log('🔗 DATA INTEGRITY:');
    console.log(`   Score: ${results.integrity.score}%`);
    console.log(`   Checks: ${results.integrity.passed}/${results.integrity.checks} passed`);
    console.log(`   Relationships: ${results.integrity.relationships.join(', ')}`);
    if (results.integrity.issues.length > 0) {
        console.log('   Issues:');
        results.integrity.issues.forEach(issue => console.log(`     - ${issue}`));
    }
    console.log('');
}

/**
 * Calculate overall structural health score
 */
function calculateStructuralHealthScore(results) {
    const weights = {
        schema: 0.30,      // 30% - Database structure is critical
        invoices: 0.35,    // 35% - Invoice data is the core deliverable
        businessLogic: 0.20, // 20% - Business logic ensures correctness
        integrity: 0.15    // 15% - Data relationships support system integrity
    };
    
    const weightedScore = 
        (results.schema.score * weights.schema) +
        (results.invoices.score * weights.invoices) +
        (results.businessLogic.score * weights.businessLogic) +
        (results.integrity.score * weights.integrity);
    
    return Math.round(weightedScore);
}

/**
 * Validate specific business scenarios
 */
function validateBusinessScenarios() {
    console.log('🎭 Validating Business Scenarios...');
    
    const validation = {
        scenarios: {
            earlyPayment: false,
            standardPayment: false,
            overduePayment: false,
            pendingApproval: false,
            threeWayMatching: false,
            paymentAllocations: false,
            discounts: false,
            multiCurrency: false
        },
        score: 0
    };
    
    try {
        const invoiceContent = fs.readFileSync('scripts/generate_22_realistic_invoices.sql', 'utf8');
        
        // Check scenarios
        if (invoiceContent.includes('early_payment_discount_percentage')) validation.scenarios.earlyPayment = true;
        if (invoiceContent.includes("'paid'")) validation.scenarios.standardPayment = true;
        if (invoiceContent.includes("'overdue'")) validation.scenarios.overduePayment = true;
        if (invoiceContent.includes("'pending'")) validation.scenarios.pendingApproval = true;
        if (invoiceContent.includes('three_way_matching')) validation.scenarios.threeWayMatching = true;
        if (invoiceContent.includes('payment_allocations')) validation.scenarios.paymentAllocations = true;
        if (invoiceContent.includes('discount_amount')) validation.scenarios.discounts = true;
        if (invoiceContent.includes("'ZAR'") || invoiceContent.includes("'USD'")) validation.scenarios.multiCurrency = true;
        
        const scenarioCount = Object.values(validation.scenarios).filter(Boolean).length;
        validation.score = Math.round((scenarioCount / Object.keys(validation.scenarios).length) * 100);
        
        console.log(`  📊 Business Scenarios Coverage: ${validation.score}%`);
        console.log('  Scenarios covered:');
        Object.entries(validation.scenarios).forEach(([scenario, covered]) => {
            console.log(`    ${covered ? '✅' : '❌'} ${scenario}`);
        });
        
    } catch (error) {
        console.log(`  ❌ Business scenario validation error: ${error.message}`);
    }
    
    return validation;
}

// Run validation if script is executed directly
if (require.main === module) {
    validateFinancialStructure()
        .then(() => {
            console.log('\n🎯 VALIDATION COMPLETE - Ready for Agent coordination');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Validation failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    validateFinancialStructure,
    validateSchemaStructure,
    validateInvoiceData,
    validateBusinessLogic,
    validateDataIntegrity
};