import { z } from "zod";
import { Client } from "pg";
import { MCPTool } from "../types";

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  // Support multiple connection string env vars
  const conn =
    process.env.DATABASE_URL ||
    process.env.ENTERPRISE_DATABASE_URL ||
    process.env.NEON_CONNECTION_STRING ||
    (process.env.DB_HOST &&
      process.env.DB_USER &&
      process.env.DB_PASSWORD &&
      process.env.DB_NAME
      ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=require`
      : null);

  if (!conn) {
    throw new Error(
      "Database connection string not found. Set DATABASE_URL, ENTERPRISE_DATABASE_URL, NEON_CONNECTION_STRING, or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME"
    );
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const sqlQuery: MCPTool = {
  description: "Execute a read-only SQL query against Neon",
  schema: z.object({
    sql: z.string().min(1),
    params: z.array(z.any()).optional()
  }),
  handler: async ({ sql, params = [] }) => {
    return await withClient(async (client) => {
      const res = await client.query(sql, params);
      return res.rows;
    });
  }
};

export default {
  sqlQuery
};

