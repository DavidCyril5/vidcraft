import mongoose from "mongoose";
import { logger } from "./logger";

let connected = false;

export async function connectDB() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error("MONGODB_URI is not set");
    return;
  }
  try {
    await mongoose.connect(uri);
    connected = true;
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
  }
}
