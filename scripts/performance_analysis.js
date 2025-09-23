#!/usr/bin/env node
/**
 * Database Performance Analysis
 * Identifies slow queries, missing indexes, and optimization opportunities
 */

const { Pool } = require('pg');

const dbConfig = {
    host: '62.169.20.53',
    port: 6600,
    user: 'nxtdb_admin',
    password: 'P@33w0rd-1',
    database: 'nxtprod-db_001',
    max: 10,
    ssl: false
};

async function analyzePerformance() {
    const pool = new Pool(dbConfig);

    try {
        console.log('⚡ Analyzing Database Performance...\n');

        // 1. Database Size Analysis
        console.log('1. Database Size Analysis:');
        const sizeQuery = `
            SELECT
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS table_size,
                pg_relation_size(schemaname||'.'||tablename) AS size_bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 10;
        `;

        const sizeResult = await pool.query(sizeQuery);
        console.log('   Top 10 largest tables:');
        sizeResult.rows.forEach(row => {
            console.log(`   - ${row.tablename}: ${row.table_size}`);
        });

        // 2. Index Usage Analysis
        console.log('\n2. Index Usage Analysis:');
        const indexUsageQuery = `
            SELECT
                schemaname,
                tablename,
                indexname,
                idx_scan as times_used,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
                idx_tup_read as tuples_read,
                idx_tup_fetch as tuples_fetched
            FROM pg_stat_user_indexes
            ORDER BY idx_scan DESC
            LIMIT 15;
        `;

        const indexUsage = await pool.query(indexUsageQuery);
        console.log('   Most used indexes:');
        indexUsage.rows.forEach(row => {
            console.log(`   - ${row.tablename}.${row.indexname}: used ${row.times_used} times (${row.index_size})`);
        });

        // 3. Unused Indexes (potential for removal)
        console.log('\n3. Unused Indexes (candidates for removal):');
        const unusedIndexQuery = `
            SELECT
                schemaname,
                tablename,
                indexname,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0
            AND indexname NOT LIKE '%_pkey'
            ORDER BY pg_relation_size(indexrelid) DESC;
        `;

        const unusedIndexes = await pool.query(unusedIndexQuery);
        if (unusedIndexes.rows.length > 0) {
            unusedIndexes.rows.forEach(row => {
                console.log(`   - ${row.tablename}.${row.indexname}: ${row.index_size} (never used)`);
            });
        } else {
            console.log('   ✅ No unused indexes found');
        }

        // 4. Table Statistics
        console.log('\n4. Table Access Patterns:');
        const tableStatsQuery = `
            SELECT
                schemaname,
                tablename,
                seq_scan as sequential_scans,
                seq_tup_read as seq_tuples_read,
                idx_scan as index_scans,
                idx_tup_fetch as idx_tuples_fetched,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes
            FROM pg_stat_user_tables
            WHERE seq_scan > 0 OR idx_scan > 0
            ORDER BY (seq_scan + idx_scan) DESC
            LIMIT 10;
        `;

        const tableStats = await pool.query(tableStatsQuery);
        console.log('   Most accessed tables:');
        tableStats.rows.forEach(row => {
            const totalScans = parseInt(row.sequential_scans) + parseInt(row.index_scans);
            const seqRatio = row.sequential_scans > 0 ? (row.sequential_scans / totalScans * 100).toFixed(1) : '0';
            console.log(`   - ${row.tablename}: ${totalScans} scans (${seqRatio}% sequential)`);
        });

        // 5. Connection and Activity Analysis
        console.log('\n5. Connection Analysis:');
        const connectionQuery = `
            SELECT
                state,
                COUNT(*) as connection_count,
                application_name
            FROM pg_stat_activity
            WHERE datname = current_database()
            GROUP BY state, application_name
            ORDER BY connection_count DESC;
        `;

        const connections = await pool.query(connectionQuery);
        console.log('   Connection states:');
        connections.rows.forEach(row => {
            console.log(`   - ${row.state || 'unknown'}: ${row.connection_count} (${row.application_name || 'no app'})`);
        });

        // 6. Check for Missing Indexes on Foreign Keys
        console.log('\n6. Missing Indexes on Foreign Keys:');
        const missingFKIndexQuery = `
            SELECT
                tc.table_name,
                kcu.column_name,
                tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
                AND NOT EXISTS (
                    SELECT 1
                    FROM pg_indexes pi
                    WHERE pi.tablename = tc.table_name
                    AND pi.indexdef ILIKE '%' || kcu.column_name || '%'
                )
            ORDER BY tc.table_name, kcu.column_name;
        `;

        const missingFKIndexes = await pool.query(missingFKIndexQuery);
        if (missingFKIndexes.rows.length > 0) {
            console.log('   Foreign keys without indexes:');
            missingFKIndexes.rows.forEach(row => {
                console.log(`   - ${row.table_name}.${row.column_name} (constraint: ${row.constraint_name})`);
            });
        } else {
            console.log('   ✅ All foreign keys have indexes');
        }

        // 7. Query Performance Recommendations
        console.log('\n7. Performance Recommendations:');

        // Check sequential scan ratios
        const seqScanCheck = await pool.query(`
            SELECT
                tablename,
                seq_scan,
                idx_scan,
                CASE
                    WHEN seq_scan + idx_scan > 0
                    THEN ROUND((seq_scan::float / (seq_scan + idx_scan)) * 100, 2)
                    ELSE 0
                END as seq_scan_ratio
            FROM pg_stat_user_tables
            WHERE seq_scan + idx_scan > 100
            ORDER BY seq_scan_ratio DESC;
        `);

        const highSeqScanTables = seqScanCheck.rows.filter(row => row.seq_scan_ratio > 50);
        if (highSeqScanTables.length > 0) {
            console.log('   Tables with high sequential scan ratios (consider adding indexes):');
            highSeqScanTables.forEach(row => {
                console.log(`   - ${row.tablename}: ${row.seq_scan_ratio}% sequential scans`);
            });
        } else {
            console.log('   ✅ Good index usage - low sequential scan ratios');
        }

        // 8. Vacuum and Analyze Status
        console.log('\n8. Maintenance Status:');
        const vacuumQuery = `
            SELECT
                schemaname,
                tablename,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze,
                vacuum_count,
                autovacuum_count
            FROM pg_stat_user_tables
            WHERE vacuum_count > 0 OR autovacuum_count > 0
            ORDER BY last_autovacuum DESC NULLS LAST
            LIMIT 5;
        `;

        const vacuumStats = await pool.query(vacuumQuery);
        if (vacuumStats.rows.length > 0) {
            console.log('   Recent maintenance activity:');
            vacuumStats.rows.forEach(row => {
                const lastMaintenance = row.last_autovacuum || row.last_vacuum || 'Never';
                console.log(`   - ${row.tablename}: last vacuum ${lastMaintenance}`);
            });
        } else {
            console.log('   ⚠️ No vacuum activity found - check autovacuum configuration');
        }

        // 9. Generate Optimization SQL
        console.log('\n9. Optimization Recommendations:');

        if (missingFKIndexes.rows.length > 0) {
            console.log('   SQL to create missing FK indexes:');
            missingFKIndexes.rows.forEach(row => {
                console.log(`   CREATE INDEX idx_${row.table_name}_${row.column_name} ON ${row.table_name}(${row.column_name});`);
            });
        }

        if (highSeqScanTables.length > 0) {
            console.log('   Consider analyzing these high-sequential-scan tables for additional indexes');
        }

        console.log('\n✅ Performance analysis completed!');

        return {
            tableCount: sizeResult.rows.length,
            indexCount: indexUsage.rows.length,
            unusedIndexes: unusedIndexes.rows.length,
            missingFKIndexes: missingFKIndexes.rows.length,
            highSeqScanTables: highSeqScanTables.length
        };

    } catch (error) {
        console.error('❌ Performance analysis failed:', error.message);
        return null;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    analyzePerformance();
}

module.exports = { analyzePerformance };