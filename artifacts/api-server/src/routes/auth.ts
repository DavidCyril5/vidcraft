import { Router } from "express";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { User } from "../models/User";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { isIpRegistrationBlocked, recordIpRegistration } from "../models/RegistrationAttempt";

const router = Router();

function signToken(id: string) {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback", { expiresIn: "30d" });
}

function setCookie(res: Response, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, referralCode } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "All fields are required." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }

    // MongoDB-backed IP check — persists across server restarts
    const clientIp = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const blocked = await isIpRegistrationBlocked(clientIp);
    if (blocked) {
      res.status(429).json({
        error: "Too many accounts have been created from your connection today. Please try again tomorrow or contact support if you think this is a mistake.",
      });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ error: "An account with this email already exists." });
      return;
    }
    const user = await User.create({ name, email, password, credits: 3 });
    await recordIpRegistration(clientIp);

    if (referralCode && typeof referralCode === "string") {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer && referrer._id.toString() !== user._id.toString()) {
        await User.findByIdAndUpdate(referrer._id, { $inc: { credits: 2, referralCount: 1 } });
        await User.findByIdAndUpdate(user._id, { referredBy: referrer._id.toString(), $inc: { credits: 1 } });
        user.credits = 4;
      }
    }

    const token = signToken(user._id.toString());
    setCookie(res, token);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan, credits: user.credits, isAdmin: user.isAdmin },
    });
  } catch {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }
    const user = await User.findOne({ email });
    if (!user || !(await (user as any).comparePassword(password))) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    const token = signToken(user._id.toString());
    setCookie(res, token);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan, credits: user.credits, isAdmin: user.isAdmin },
    });
  } catch {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token");
  res.json({ message: "Signed out successfully." });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const u = req.user;
  res.json({
    id: u._id, name: u.name, email: u.email, plan: u.plan, credits: u.credits,
    isAdmin: u.isAdmin, dailyWanClaimed: u.dailyWanClaimed, referralCode: u.referralCode, referralCount: u.referralCount,
  });
});

router.post("/claim-daily-wan", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const today = new Date().toISOString().slice(0, 10);
    if (user.dailyWanClaimed === today) {
      res.status(400).json({ error: "You have already claimed your free credit today. Come back tomorrow!" });
      return;
    }
    await User.findByIdAndUpdate(user._id, { dailyWanClaimed: today, $inc: { credits: 1 } });
    res.json({ message: "1 Wan 2.2 credit claimed!", credits: user.credits + 1 });
  } catch {
    res.status(500).json({ error: "Could not claim credit. Please try again." });
  }
});

router.patch("/profile", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "A valid name is required." });
      return;
    }
    const updated = await User.findByIdAndUpdate(req.user._id, { name: name.trim() }, { new: true });
    res.json({ message: "Profile updated.", name: updated?.name });
  } catch {
    res.status(500).json({ error: "Could not update profile. Please try again." });
  }
});

router.post("/change-password", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Both current and new passwords are required." });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters." });
      return;
    }
    const user = await User.findById(req.user._id);
    if (!user || !(await (user as any).comparePassword(currentPassword))) {
      res.status(401).json({ error: "Current password is incorrect." });
      return;
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully." });
  } catch {
    res.status(500).json({ error: "Could not change password. Please try again." });
  }
});

router.get("/referral-info", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      referralCode: user?.referralCode,
      referralCount: user?.referralCount || 0,
      creditsEarned: (user?.referralCount || 0) * 2,
    });
  } catch {
    res.status(500).json({ error: "Could not load referral info." });
  }
});

export default router;
