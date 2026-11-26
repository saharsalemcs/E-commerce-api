import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import notFound from "./common/middlewares/notFound.js";
import errorHandler from "./common/middlewares/errorHandler.js";

const app = express();

// 1) MIDDLEWARES
// Baseline HTTP security headers
app.use(helmet());

if (config.env === "development") {
  app.use(morgan("dev"));
} else if (config.env === "production") {
  app.use(morgan("combined"));
}

// 1. Enable CORS (Cross-Origin Resource Sharing)

// Limit incoming JSON payload size
app.use(express.json({ limit: "10kb" }));

// Mount Routes
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Service is up" });
});

// 404 handler
app.use(notFound);
// global error middleware
app.use(errorHandler);

export default app;
