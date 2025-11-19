#!/usr/bin/env node
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function main() {
  const fileArg = process.argv[2]
  if (!fileArg) {
    console.error('Usage: node scripts/run-sql.js <sql-file>')
    process.exit(1)
  }

  const filePath = path.resolve(process.cwd(), fileArg)
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath)
    process.exit(1)
  }

  const sql = fs.readFileSync(filePath, 'utf8')

  const connectionString = 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?channel_binding=require&sslmode=require'

  const client = new Client({ connectionString })
  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('Executing SQL from', fileArg)
    await client.query(sql)
    console.log('✓ SQL executed successfully')

    const verify = await client.query(
      "SELECT conname, pg_get_constraintdef(con.oid) AS def FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace WHERE nsp.nspname='spp' AND rel.relname='extraction_jobs' AND con.conname='extraction_jobs_upload_id_fkey'"
    )
    console.log('Constraint:', verify.rows)
  } catch (err) {
    console.error('SQL error:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
