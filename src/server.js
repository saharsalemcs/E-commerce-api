const app = require("./app");
const config = require("./config");
const connectDB = require("./config/database");

// Connect to DB
connectDB();

app.listen(config.port, () => {
  console.log(`App running on port ${config.port} (${config.env})...`);
});
