import { drizzle } from "drizzle-orm/node-postgres";
import { migrate as migrateNodePostgres } from "drizzle-orm/node-postgres/migrator";
import {
  Pool as NeonPool,
  type Pool as NeonPoolInstance,
} from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import pg from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const { Pool } = pg;
const databaseDriver = process.env.DATABASE_DRIVER || "pg";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

if (databaseDriver !== "pg" && databaseDriver !== "neon") {
  throw new Error(`Unsupported DATABASE_DRIVER: ${databaseDriver}`);
}

const nodePostgresPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

const neonPool =
  databaseDriver === "neon"
    ? new NeonPool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      })
    : null;

const nodePostgresDb = drizzle(nodePostgresPool, { schema });
const neonDb = neonPool ? drizzleNeon(neonPool, { schema }) : null;

// NeonPool intentionally implements the node-postgres Pool/Client API. Keeping
// these exports on the node-postgres-compatible surface lets existing raw SQL
// callers run unchanged when GoDaddy selects the Neon WebSocket driver.
export const pool = (neonPool ?? nodePostgresPool) as unknown as InstanceType<
  typeof Pool
>;
export const db = (neonDb ?? nodePostgresDb) as unknown as NodePgDatabase<
  typeof schema
>;

export async function runDatabaseMigrations(migrationsFolder: string) {
  if (databaseDriver === "neon") {
    if (!neonDb) {
      throw new Error("Neon database client was not initialized");
    }
    await migrateNeon(neonDb as NeonDatabase<typeof schema>, {
      migrationsFolder,
    });
    return;
  }

  await migrateNodePostgres(nodePostgresDb, { migrationsFolder });
}

export * from "./schema";
