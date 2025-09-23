const { Pool } = require("pg");

// Database connection configuration
const dbConfig = {
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

async function testConnection() {
  const pool = new Pool(dbConfig);
  let client;

  try {
    console.log("🔄 Attempting to connect to PostgreSQL database...");
    console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`🗄️  Database: ${dbConfig.database}`);
    console.log(`👤 User: ${dbConfig.user}`);

    client = await pool.connect();
    console.log("✅ Successfully connected to database!");

    // Test basic query
    const result = await client.query(
      "SELECT NOW() as current_time, version() as postgres_version"
    );
    console.log("🕐 Current time:", result.rows[0].current_time);
    console.log("🐘 PostgreSQL version:", result.rows[0].postgres_version);

    // Test database info
    const dbInfo = await client.query(`
      SELECT 
        current_database() as database_name,
        current_user as current_user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port
    `);
    console.log("📊 Database info:", dbInfo.rows[0]);

    console.log("🎉 Database connection test completed successfully!");
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Full error:", error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testConnection();
