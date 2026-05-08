import mongoose from "mongoose";
import { logger } from "./logger";

let connected = false;

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  try {
    const { User } = await import("../models/User");
    await User.findOneAndUpdate(
      { email: adminEmail.toLowerCase().trim() },
      { isAdmin: true, plan: "vip", credits: 1000000 },
      { upsert: false }
    );
    logger.info({ adminEmail }, "Admin seed applied");
  } catch (err) {
    logger.warn({ err }, "Admin seed skipped — user may not exist yet (will apply on next restart after signup)");
  }
}

export async function connectDB() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error("MONGODB_URI is not set — database features will be unavailable");
    return;
  }
  try {
    await mongoose.connect(uri);
    connected = true;
    logger.info("MongoDB connected");
    await seedAdmin();
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
  }
}
