const mongoose = require("mongoose");
const config = require("./index");

module.exports = () => {
  mongoose
    .connect(config.db.uri)
    .then(() => console.log("DB connected Successfully!"))
    .catch((err) => {
      console.log("Connection ERROR!: ", err.message);
      process.exit(1);
    });
};
