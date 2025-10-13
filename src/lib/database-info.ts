type DatabaseMetadata = {
  host: string;
  port: string;
  database: string;
  user?: string;
};

/**
 * Extracts connection details from environment variables so that
 * health checks and diagnostics report the active Neon database
 * rather than legacy hard-coded hosts.
 */
export function getDatabaseMetadata(): DatabaseMetadata {
  const connectionString =
    process.env.ENTERPRISE_DATABASE_URL || process.env.DATABASE_URL;

  if (connectionString) {
    try {
      const url = new URL(connectionString);
      return {
        host: url.hostname,
        port: url.port || "5432",
        database: url.pathname.replace(/^\//, "") || process.env.DB_NAME || "",
        user: url.username || process.env.DB_USER || undefined,
      };
    } catch (error) {
      // fall through to env-based fields
      console.warn(
        "⚠️ Unable to parse database connection string. Falling back to discrete env vars.",
        error
      );
    }
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || "5432",
    database: process.env.DB_NAME || "neondb",
    user: process.env.DB_USER || undefined,
  };
}

export default getDatabaseMetadata;
