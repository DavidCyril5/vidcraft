import mongoose from "mongoose";

/**
 * Tracks registration attempts per IP address.
 * Documents auto-expire after 24 hours via the TTL index on `createdAt`.
 * This persists across server restarts, so rebooting cannot reset the counter.
 */
const registrationAttemptSchema = new mongoose.Schema({
  ip: { type: String, required: true, index: true },
  count: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete documents 24 hours after they were created
registrationAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const RegistrationAttempt =
  mongoose.models.RegistrationAttempt ||
  mongoose.model("RegistrationAttempt", registrationAttemptSchema);

const MAX_REGISTRATIONS_PER_IP_PER_DAY = Number(process.env.MAX_REGISTRATIONS_PER_IP ?? "3");

/**
 * Returns true if this IP has exceeded the daily registration limit.
 * Increments the counter on every call (call only after deciding to proceed).
 */
export async function isIpRegistrationBlocked(ip: string): Promise<boolean> {
  try {
    const record = await RegistrationAttempt.findOne({ ip });
    if (record && record.count >= MAX_REGISTRATIONS_PER_IP_PER_DAY) return true;
    return false;
  } catch {
    return false; // fail open — don't block users if DB is down
  }
}

export async function recordIpRegistration(ip: string): Promise<void> {
  try {
    await RegistrationAttempt.findOneAndUpdate(
      { ip },
      { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    );
  } catch {
    // non-fatal
  }
}
