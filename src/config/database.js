const mongoose = require("mongoose");
const config = require("./index");

module.exports = async () => {
  mongoose
    .connect(config.db.uri)
    .then(() => console.log("DB connected Successfully!"))
    .catch((err) => console.log("Connection ERROR!: ", err));
};
