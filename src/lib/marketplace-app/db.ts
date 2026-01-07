import * as schema from "@/db/marketplace";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const DATABASE_URL = process.env.MARKETPLACE_DATABASE_URL;

// During build time on Vercel, DATABASE_URL might not be available
// Use a valid placeholder URL that neon() will accept for type checking
// but won't actually be used for queries during build
const getDatabaseUrl = () => {
  if (DATABASE_URL) {
    return DATABASE_URL;
  }
  // During build phase, use a valid URL format for type checking only
  // This will be replaced at runtime with the actual DATABASE_URL
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.VERCEL) {
    return "postgresql://user:password@localhost:5432/database";
  }
  throw new Error("MARKETPLACE_DATABASE_URL environment variable is not set");
};

const sql = neon(getDatabaseUrl());
const db = drizzle(sql, { schema });

export { db, sql };

