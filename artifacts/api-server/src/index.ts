import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupScreenMirror } from "./lib/screenMirror";
import { initAdminCredentialsTables } from "./routes/adminAuth";

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

const httpServer = createServer(app);
setupScreenMirror(httpServer);

// Ensure admin credential override tables exist
initAdminCredentialsTables().catch(err =>
  logger.warn({ err }, "Could not init admin credentials tables")
);

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
