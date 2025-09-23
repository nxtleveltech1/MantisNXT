#!/usr/bin/env node
/**
 * Fixed Database Performance Analysis
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

        // 1. Database Size Analysis (Fixed query)
        console.log('1. Database Size Analysis:');
        const sizeQuery = `
            SELECT
                t.tablename,
                pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename))) AS table_size,
                pg_total_relation_size(quote_ident(t.tablename)) AS size_bytes
            FROM pg_tables t
            WHERE t.schemaname = 'public'
            ORDER BY pg_total_relation_size(quote_ident(t.tablename)) DESC
            LIMIT 10;
        `;

        const sizeResult = await pool.query(sizeQuery);
        console.log('   Top 10 largest tables:');
        sizeResult.rows.forEach(row => {
            console.log(`   - ${row.tablename}: ${row.table_size}`);
        });

        // 2. Index Analysis
        console.log('\n2. Index Analysis:');
        const indexCountQuery = `
            SELECT
                COUNT(*) as total_indexes,
                COUNT(CASE WHEN idx_scan = 0 THEN 1 END) as unused_indexes,
                COUNT(CASE WHEN idx_scan > 0 THEN 1 END) as used_indexes
            FROM pg_stat_user_indexes;
        `;

        const indexCount = await pool.query(indexCountQuery);
        console.log(`   Total indexes: ${indexCount.rows[0].total_indexes}`);
        console.log(`   Used indexes: ${indexCount.rows[0].used_indexes}`);
        console.log(`   Unused indexes: ${indexCount.rows[0].unused_indexes}`);

        // 3. Most Used Indexes
        const topIndexesQuery = `
            SELECT
                tablename,
                indexname,
                idx_scan as times_used,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size
            FROM pg_stat_user_indexes
            WHERE idx_scan > 0
            ORDER BY idx_scan DESC
            LIMIT 10;
        `;

        const topIndexes = await pool.query(topIndexesQuery);
        if (topIndexes.rows.length > 0) {
            console.log('\n   Most used indexes:');
            topIndexes.rows.forEach(row => {
                console.log(`   - ${row.tablename}.${row.indexname}: used ${row.times_used} times (${row.index_size})`);
            });
        }

        // 4. Table Statistics
        console.log('\n3. Table Access Patterns:');
        const tableStatsQuery = `
            SELECT
                tablename,
                seq_scan as sequential_scans,
                seq_tup_read as seq_tuples_read,
                idx_scan as index_scans,
                idx_tup_fetch as idx_tuples_fetched,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as live_tuples
            FROM pg_stat_user_tables
            ORDER BY (COALESCE(seq_scan,0) + COALESCE(idx_scan,0)) DESC
            LIMIT 10;
        `;

        const tableStats = await pool.query(tableStatsQuery);
        console.log('   Most accessed tables:');
        tableStats.rows.forEach(row => {
            const seqScans = parseInt(row.sequential_scans) || 0;
            const idxScans = parseInt(row.index_scans) || 0;
            const totalScans = seqScans + idxScans;
            const seqRatio = totalScans > 0 ? (seqScans / totalScans * 100).toFixed(1) : '0';
            console.log(`   - ${row.tablename}: ${totalScans} scans (${seqRatio}% sequential), ${row.live_tuples} rows`);
        });

        // 5. Connection Analysis
        console.log('\n4. Connection Analysis:');
        const connectionQuery = `
            SELECT
                state,
                COUNT(*) as connection_count,
                COALESCE(application_name, 'unknown') as app_name
            FROM pg_stat_activity
            WHERE datname = current_database()
            GROUP BY state, application_name
            ORDER BY connection_count DESC;
        `;

        const connections = await pool.query(connectionQuery);
        console.log('   Connection states:');
        connections.rows.forEach(row => {
            console.log(`   - ${row.state || 'unknown'}: ${row.connection_count} connections (${row.app_name})`);
        });

        // 6. Foreign Key Index Analysis
        console.log('\n5. Foreign Key Index Analysis:');
        const fkAnalysisQuery = `
            SELECT
                tc.table_name,
                kcu.column_name,
                CASE
                    WHEN EXISTS (
                        SELECT 1 FROM pg_indexes pi
                        WHERE pi.tablename = tc.table_name
                        AND pi.indexdef ILIKE '%' || kcu.column_name || '%'
                    ) THEN 'HAS_INDEX'
                    ELSE 'MISSING_INDEX'
                END as index_status
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
            ORDER BY tc.table_name, kcu.column_name;
        `;

        const fkAnalysis = await pool.query(fkAnalysisQuery);
        const missingIndexes = fkAnalysis.rows.filter(row => row.index_status === 'MISSING_INDEX');
        const hasIndexes = fkAnalysis.rows.filter(row => row.index_status === 'HAS_INDEX');

        console.log(`   Foreign keys with indexes: ${hasIndexes.length}`);
        console.log(`   Foreign keys missing indexes: ${missingIndexes.length}`);

        if (missingIndexes.length > 0) {
            console.log('\n   Foreign keys without indexes:');
            missingIndexes.slice(0, 10).forEach(row => {
                console.log(`   - ${row.table_name}.${row.column_name}`);
            });
        }

        // 7. Database Health Check
        console.log('\n6. Database Health Summary:');

        // Total database size
        const dbSizeQuery = `SELECT pg_size_pretty(pg_database_size(current_database())) as db_size`;
        const dbSize = await pool.query(dbSizeQuery);
        console.log(`   Database size: ${dbSize.rows[0].db_size}`);

        // Table count
        const tableCountQuery = `SELECT COUNT(*) as table_count FROM pg_tables WHERE schemaname = 'public'`;
        const tableCount = await pool.query(tableCountQuery);
        console.log(`   Total tables: ${tableCount.rows[0].table_count}`);

        // Calculate performance score
        const performanceScore = {
            totalTables: parseInt(tableCount.rows[0].table_count),
            totalIndexes: parseInt(indexCount.rows[0].total_indexes),
            usedIndexes: parseInt(indexCount.rows[0].used_indexes),
            unusedIndexes: parseInt(indexCount.rows[0].unused_indexes),
            fkWithIndexes: hasIndexes.length,
            fkMissingIndexes: missingIndexes.length,
            dbSizeMB: Math.round(sizeResult.rows.reduce((sum, row) => sum + parseInt(row.size_bytes), 0) / 1024 / 1024)
        };

        // 8. Optimization Recommendations
        console.log('\n7. Optimization Recommendations:');

        if (missingIndexes.length > 0) {
            console.log(`   ⚠️ ${missingIndexes.length} foreign keys missing indexes - performance impact on JOINs`);
            console.log('   SQL to create missing FK indexes:');
            missingIndexes.slice(0, 5).forEach(row => {
                console.log(`   CREATE INDEX idx_${row.table_name}_${row.column_name} ON ${row.table_name}(${row.column_name});`);
            });
        }

        if (performanceScore.unusedIndexes > 5) {
            console.log(`   ⚠️ ${performanceScore.unusedIndexes} unused indexes found - consider removal to save space`);
        }

        // High sequential scan tables
        const highSeqScanTables = tableStats.rows.filter(row => {
            const seqScans = parseInt(row.sequential_scans) || 0;
            const idxScans = parseInt(row.index_scans) || 0;
            const totalScans = seqScans + idxScans;
            return totalScans > 10 && (seqScans / totalScans) > 0.5;
        });

        if (highSeqScanTables.length > 0) {
            console.log(`   ⚠️ ${highSeqScanTables.length} tables with high sequential scan ratio - consider adding indexes`);
        }

        console.log('\n✅ Performance analysis completed!');

        return performanceScore;

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