#!/usr/bin/env tsx

/**
 * Script to analyze the current state of category management and uncategorized products
 * for the MantisNXT system
 */

import { query } from '@/lib/database';

async function analyzeCategories() {
  console.log('🔍 Analyzing Category Structure...');

  try {
    // Get all categories with hierarchy information using correct schema
    const categoriesResult = await query(`
      SELECT
        id,
        name,
        parent_id as "parentId",
        path
      FROM categories
      ORDER BY path, name
    `);

    const categories = categoriesResult.rows;
    console.log(`📊 Found ${categories.length} categories total`);

    // Analyze hierarchy levels based on path
    const levelCounts = {};
    const parentChildMap = new Map();

    categories.forEach(cat => {
      // Calculate level from path (number of segments minus root)
      const pathSegments = cat.path.split('/').filter(Boolean);
      const level = pathSegments.length - 1;
      levelCounts[level] = (levelCounts[level] || 0) + 1;

      if (cat.parentId) {
        if (!parentChildMap.has(cat.parentId)) {
          parentChildMap.set(cat.parentId, []);
        }
        parentChildMap.get(cat.parentId).push(cat);
      }
    });

    console.log('📈 Category hierarchy distribution:');
    Object.entries(levelCounts).forEach(([level, count]) => {
      console.log(`  Level ${level}: ${count} categories`);
    });

    // Find top-level categories
    const topLevelCategories = categories.filter(cat => !cat.parentId);
    console.log(`\n🏠 Top-level categories (${topLevelCategories.length}):`);
    topLevelCategories.forEach(cat => {
      const children = parentChildMap.get(cat.id) || [];
      console.log(`  - ${cat.name} (${cat.id}) - ${children.length} subcategories`);
    });

    return categories;
  } catch (error) {
    console.error('❌ Error analyzing categories:', error);
    throw error;
  }
}

async function analyzeUncategorizedProducts() {
  console.log('\n📦 Analyzing Uncategorized Products...');

  try {
    // Get uncategorized products with detailed information using correct schema
    const productsResult = await query(`
      SELECT
        p.sku,
        p.description,
        p.brand,
        p.series_range as "seriesRange",
        p.price,
        p.stock_type as "stockType",
        p.image_url as "imageUrl",
        p.attributes,
        p.supplier_id as "supplierId",
        p.updated_at as "updatedAt"
      FROM products p
      WHERE p.category_id IS NULL
      ORDER BY p.sku
      LIMIT 2000
    `);

    const products = productsResult.rows;
    console.log(`📋 Found ${products.length} uncategorized products`);

    if (products.length > 0) {
      // Analyze by supplier
      const supplierCounts = {};
      products.forEach(product => {
        const supplier = product.supplierId || 'Unknown';
        supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
      });

      console.log('\n🏢 Products by supplier:');
      Object.entries(supplierCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([supplier, count]) => {
          console.log(`  ${supplier}: ${count} products`);
        });

      // Analyze by brand
      const brandCounts = {};
      products.forEach(product => {
        const brand = product.brand || 'Unknown';
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
      });

      console.log('\n🏷️  Top brands in uncategorized products:');
      Object.entries(brandCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([brand, count]) => {
          console.log(`  ${brand}: ${count} products`);
        });

      // Show sample products
      console.log('\n🔍 Sample uncategorized products:');
      products.slice(0, 5).forEach((product, index) => {
        console.log(`  ${index + 1}. SKU: ${product.sku}`);
        console.log(`     Description: ${product.description || 'None'}`);
        console.log(`     Brand: ${product.brand || 'None'}`);
        console.log(`     Supplier: ${product.supplierId}`);
        console.log(`     Series Range: ${product.seriesRange || 'None'}`);
        console.log(`     Price: ${product.price || 'N/A'}`);
        console.log(`     Stock Type: ${product.stockType || 'N/A'}`);
        console.log('');
      });
    }

    return products;
  } catch (error) {
    console.error('❌ Error analyzing uncategorized products:', error);
    throw error;
  }
}

async function analyzeAICategorizationJobs() {
  console.log('🤖 Analyzing AI Categorization Jobs...');

  try {
    // Check for existing AI categorization jobs - first check if table exists
    const tableCheckResult = await query(`
      SELECT to_regclass('public.ai_categorization_job') as table_exists
    `);

    if (tableCheckResult.rows[0].table_exists === null) {
      console.log('ℹ️  AI categorization job table does not exist yet');
      return [];
    }

    // Check for existing AI categorization jobs
    const jobsResult = await query(`
      SELECT
        job_id,
        job_type,
        status,
        total_products,
        processed_products,
        successful_categorizations,
        failed_categorizations,
        skipped_products,
        created_at,
        started_at,
        completed_at,
        error_message
      FROM ai_categorization_job
      ORDER BY created_at DESC
      LIMIT 20
    `);

    const jobs = jobsResult.rows;
    console.log(`📋 Found ${jobs.length} AI categorization jobs`);

    if (jobs.length > 0) {
      console.log('\n📊 Job status summary:');
      const statusCounts = {};
      jobs.forEach(job => {
        statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
      });

      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} jobs`);
      });

      // Show recent jobs
      console.log('\n📅 Recent jobs:');
      jobs.slice(0, 5).forEach(job => {
        const progress =
          job.total_products > 0
            ? Math.round((job.processed_products / job.total_products) * 100)
            : 0;
        console.log(`  Job ${job.job_id} (${job.job_type}): ${job.status}`);
        console.log(`    Progress: ${job.processed_products}/${job.total_products} (${progress}%)`);
        console.log(
          `    Success: ${job.successful_categorizations}, Failed: ${job.failed_categorizations}`
        );
        console.log(`    Created: ${job.created_at}`);
        if (job.error_message) {
          console.log(`    Error: ${job.error_message}`);
        }
        console.log('');
      });
    }

    return jobs;
  } catch (error) {
    console.error('❌ Error analyzing AI categorization jobs:', error);
    throw error;
  }
}

async function analyzeAICategorizationResults() {
  console.log('📈 Analyzing AI Categorization Results...');

  try {
    // Check if results table exists
    const tableCheckResult = await query(`
      SELECT to_regclass('public.ai_categorization_result') as table_exists
    `);

    if (tableCheckResult.rows[0].table_exists === null) {
      console.log('ℹ️  AI categorization result table does not exist yet');
      return [];
    }

    // Check categorization results
    const resultsResult = await query(`
      SELECT
        status,
        COUNT(*) as count,
        AVG(confidence) as avg_confidence,
        MIN(confidence) as min_confidence,
        MAX(confidence) as max_confidence
      FROM ai_categorization_result
      GROUP BY status
      ORDER BY count DESC
    `);

    const results = resultsResult.rows;
    console.log(`📊 Found categorization results summary:`);

    results.forEach(result => {
      console.log(`  ${result.status}:`);
      console.log(`    Count: ${result.count}`);
      console.log(`    Avg Confidence: ${(result.avg_confidence * 100).toFixed(1)}%`);
      console.log(`    Min Confidence: ${(result.min_confidence * 100).toFixed(1)}%`);
      console.log(`    Max Confidence: ${(result.max_confidence * 100).toFixed(1)}%`);
      console.log('');
    });

    return results;
  } catch (error) {
    console.error('❌ Error analyzing AI categorization results:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting MantisNXT Category Management Analysis\n');

  try {
    const categories = await analyzeCategories();
    const uncategorizedProducts = await analyzeUncategorizedProducts();
    const jobs = await analyzeAICategorizationJobs();
    const results = await analyzeAICategorizationResults();

    console.log('\n📋 ANALYSIS SUMMARY');
    console.log('===================');
    console.log(`📊 Total Categories: ${categories.length}`);
    console.log(`📦 Uncategorized Products: ${uncategorizedProducts.length}`);
    console.log(`🤖 AI Categorization Jobs: ${jobs.length}`);

    const totalResults = results.reduce((sum, r) => sum + parseInt(r.count), 0);
    if (totalResults > 0) {
      console.log(`📈 Categorization Results: ${totalResults}`);
    }

    if (uncategorizedProducts.length > 0) {
      console.log(
        '\n🎯 RECOMMENDATION: Ready to proceed with AI categorization of uncategorized products'
      );
      console.log(`   - ${uncategorizedProducts.length} products need categorization`);
      console.log(`   - Consider batch processing with 200-500 products per batch`);
      console.log(`   - Set confidence threshold at 0.7 or higher for auto-assignment`);
    } else {
      console.log('\n✅ No uncategorized products found - all products are already categorized');
    }
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
