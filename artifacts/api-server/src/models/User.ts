import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  plan: "free" | "starter" | "pro" | "vip";
  credits: number;
  isAdmin: boolean;
  dailyWanClaimed: string | null;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  plan: { type: String, enum: ["free", "starter", "pro", "vip"], default: "free" },
  credits: { type: Number, default: 3 },
  isAdmin: { type: Boolean, default: false },
  dailyWanClaimed: { type: String, default: null },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: null },
  referralCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function () {
  if (this.isNew && !this.referralCode) {
    this.referralCode = Math.random().toString(36).substr(2, 8).toUpperCase();
  }
  if (this.isModified("password")) {
    this.password = await bcryptjs.hash(this.password, 12);
  }
});

userSchema.methods.comparePassword = async function (candidate: string) {
  return bcryptjs.compare(candidate, this.password);
};

export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
