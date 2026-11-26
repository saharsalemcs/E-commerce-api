import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import config from "./config/index.js";
import notFound from "./common/middlewares/notFound.js";
import errorHandler from "./common/middlewares/errorHandler.js";
import { corsMiddleware } from "./common/middlewares/cors.js";

const app = express();

// 1) MIDDLEWARES

// trust proxy
// Number = how many proxy hops to trust (1 = one proxy, e.g. Render/Heroku/nginx).
app.set("trust proxy", config.trustProxy);

// Baseline HTTP security headers
app.use(helmet());

// Enable CORS (Cross-Origin Resource Sharing)
app.use(corsMiddleware);

// Morgan
if (config.env === "development") {
  app.use(morgan("dev"));
} else if (config.env === "production") {
  app.use(morgan("combined"));
}

// Limit incoming JSON payload size
app.use(express.json({ limit: config.bodyLimit }));

// 2) Mount Routes
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Service is up" });
});

// 404 handler
app.use(notFound);
// global error middleware
app.use(errorHandler);

export default app;
