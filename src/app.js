const express = require("express");
const morgan = require("morgan");
const config = require("./config");
const notFound = require("./common/middlewares/notFound");
const errorHandler = require("./common/middlewares/errorHandler");

const app = express();

// 1) MIDDLEWARES
if (config.env === "development") {
  app.use(morgan("dev"));
}

app.use(express.json());

// Mount Routes
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Service is up" });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
