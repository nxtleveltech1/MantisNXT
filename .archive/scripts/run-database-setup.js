/**
 * Database Setup Script
 * Executes the complete database schema setup for live operations
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600'),
  database: process.env.DB_NAME || 'nxtprod-db_001',
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  ssl: false
};

async function setupDatabase() {
  const pool = new Pool(dbConfig);

  try {
    console.log('🚀 Starting database setup...');
    console.log(`📡 Connecting to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection established');

    // Read setup SQL file
    const sqlFilePath = path.join(__dirname, 'setup-database.sql');
    const setupSQL = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 Executing database setup script...');

    // Execute setup script
    const result = await client.query(setupSQL);
    console.log('✅ Database setup completed successfully');

    // Verify setup by checking tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Test functionality with a sample query
    console.log('🧪 Testing functionality...');

    const orgResult = await client.query('SELECT COUNT(*) as count FROM organizations');
    console.log(`   Organizations: ${orgResult.rows[0].count}`);

    const userResult = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`   Users: ${userResult.rows[0].count}`);

    const roleResult = await client.query('SELECT COUNT(*) as count FROM roles');
    console.log(`   Roles: ${roleResult.rows[0].count}`);

    const permResult = await client.query('SELECT COUNT(*) as count FROM permissions');
    console.log(`   Permissions: ${permResult.rows[0].count}`);

    // Test authentication functionality
    const adminUser = await client.query(`
      SELECT u.email, u.first_name, u.last_name, array_agg(r.name) as roles
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.email = 'admin@mantisnxt.com'
      GROUP BY u.id, u.email, u.first_name, u.last_name
    `);

    if (adminUser.rows.length > 0) {
      const admin = adminUser.rows[0];
      console.log(`👤 Default admin user: ${admin.first_name} ${admin.last_name} (${admin.email})`);
      console.log(`   Roles: ${admin.roles.join(', ')}`);
    }

    console.log('');
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Start the application server: npm run dev');
    console.log('   2. Test the API endpoints');
    console.log('   3. Login with: admin@mantisnxt.com / admin123');
    console.log('');

    client.release();

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('   1. Check database server is running');
    console.error('   2. Verify connection credentials');
    console.error('   3. Ensure database exists');
    console.error('   4. Check network connectivity');
    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };