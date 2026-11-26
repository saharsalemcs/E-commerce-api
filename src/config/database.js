import mongoose from "mongoose";
import config from "./index.js";

export async function connectDB() {
  try {
    await mongoose.connect(config.db.uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("DB connected successfully!");
  } catch (err) {
    console.error("Connection ERROR!: ", err.message);
    process.exit(1);
  }
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
