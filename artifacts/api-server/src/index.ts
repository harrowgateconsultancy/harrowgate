import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@workspace/db";
import app from "./app";
import { logger } from "./lib/logger";
import { setupScreenMirror } from "./lib/screenMirror";
import { initAdminCredentialsTables } from "./routes/adminAuth";
import { initStudentTables } from "./routes/studentAuth";
import { initOnArrivalTable } from "./routes/onArrival";

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — keeping server alive");
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection — keeping server alive");
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "drizzle");

const httpServer = createServer(app);
setupScreenMirror(httpServer);

// Run database migrations (creates all tables on first run, safe to run every time)
try {
  await migrate(db, { migrationsFolder });
  logger.info("Database migrations applied");
} catch (err) {
  logger.error({ err }, "Database migration failed — continuing anyway");
}

// Ensure admin credential override tables exist
initAdminCredentialsTables().catch(err =>
  logger.warn({ err }, "Could not init admin credentials tables")
);

// Ensure student auth tables exist
initStudentTables().catch(err =>
  logger.warn({ err }, "Could not init student auth tables")
);

// Ensure on-arrival applications table exists
initOnArrivalTable().catch(err =>
  logger.warn({ err }, "Could not init on-arrival table")
);

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
