import app from "./app.js";
import config from "./config/index.js";
import { connectDB, disconnectDB } from "./config/database.js";

// Connect to DB
await connectDB();

const server = app.listen(config.port, () => {
  console.log(`App running on port ${config.port} (${config.env})...`);
});

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  // stop receiving requests
  server.close(async (err) => {
    if (err) {
      console.error("Error closing server:", err.message);
      process.exit(1);
    }
    // 2) disconnect DB
    await disconnectDB();
    console.log("Shutdown complete");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error(
    "Unhandled rejection:",
    reason instanceof Error ? reason.message : reason,
  );
  shutdown("unhandledRejection");
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
  shutdown("uncaughtException");
});
