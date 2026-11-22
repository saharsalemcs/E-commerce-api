const express = require("express");

const app = express();

app.use(express.json());

// Mount Routes
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Service is up" });
});

module.exports = app;
