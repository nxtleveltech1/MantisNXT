#!/usr/bin/env tsx
/**
 * Database Connection Tester
 *
 * Quick test for Neon PostgreSQL connectivity
 *
 * @module scripts/test-database-connection
 * @author AS Team - Database Admin
 */

import { Client } from 'pg'

async function main() {
  console.log('\n🚀 Database Connection Test')
  console.log('===========================\n')

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set')
    console.error('   Please set DATABASE_URL in your environment\n')
    process.exit(1)
  }

  console.log(`📡 Connecting to database...`)
  console.log(`   URL: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`)

  const client = new Client({ connectionString: databaseUrl })

  try {
    // Connect
    const connectStart = Date.now()
    await client.connect()
    const connectDuration = Date.now() - connectStart

    console.log(`✅ Connection established (${connectDuration}ms)\n`)

    // Test query
    const queryStart = Date.now()
    const result = await client.query('SELECT version()')
    const queryDuration = Date.now() - queryStart

    const version = result.rows[0].version
    console.log(`✅ Query successful (${queryDuration}ms)`)
    console.log(`   ${version}\n`)

    // Get database info
    const dbInfo = await client.query(`
      SELECT
        current_database() as database,
        current_user as user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port
    `)

    console.log('📊 Database Information:')
    console.log(`   Database: ${dbInfo.rows[0].database}`)
    console.log(`   User: ${dbInfo.rows[0].user}`)
    console.log(`   Server: ${dbInfo.rows[0].server_ip || 'unix socket'}:${dbInfo.rows[0].server_port || 'N/A'}\n`)

    // Check SSL
    const sslInfo = await client.query('SHOW ssl')
    console.log(`🔒 SSL: ${sslInfo.rows[0].ssl === 'on' ? 'Enabled ✅' : 'Disabled ⚠️'}\n`)

    console.log('✅ DATABASE CONNECTION: SUCCESSFUL\n')
    console.log('Next steps:')
    console.log('1. Run migrations: npm run db:migrate:production')
    console.log('2. Validate environment: npm run env:validate\n')

  } catch (error) {
    console.error('\n❌ Database connection failed')
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}\n`)
    console.error('Common issues:')
    console.error('1. Invalid DATABASE_URL format')
    console.error('2. Incorrect credentials')
    console.error('3. Network connectivity issues')
    console.error('4. SSL configuration mismatch\n')
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
}

export { main as testDatabaseConnection }
