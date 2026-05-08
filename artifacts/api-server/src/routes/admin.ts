import { Router } from "express";
import type { Response } from "express";
import { requireAdmin, type AuthRequest } from "../middleware/auth";
import { User } from "../models/User";
import { VideoHistory } from "../models/VideoHistory";
import { RegistrationAttempt } from "../models/RegistrationAttempt";

const router = Router();

router.get("/stats", requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [totalUsers, totalVideos, planBreakdown, recentUsers] = await Promise.all([
      User.countDocuments(),
      VideoHistory.countDocuments(),
      User.aggregate([{ $group: { _id: "$plan", count: { $sum: 1 } } }]),
      User.find().sort({ createdAt: -1 }).limit(5).select("-password").lean(),
    ]);
    res.json({ totalUsers, totalVideos, planBreakdown, recentUsers });
  } catch {
    res.status(500).json({ error: "Could not load admin stats." });
  }
});

router.get("/users", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;

    const query: Record<string, any> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-password").lean(),
      User.countDocuments(query),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: "Could not load users." });
  }
});

router.get("/videos", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      VideoHistory.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      VideoHistory.countDocuments(),
    ]);

    res.json({ videos, total, page, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: "Could not load videos." });
  }
});

router.patch("/users/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { credits, plan, isAdmin } = req.body;
    const update: Record<string, any> = {};
    if (credits !== undefined) update.credits = Number(credits);
    if (plan !== undefined) update.plan = plan;
    if (isAdmin !== undefined) update.isAdmin = Boolean(isAdmin);

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("-password");
    if (!user) { res.status(404).json({ error: "User not found." }); return; }
    res.json({ message: "User updated.", user });
  } catch {
    res.status(500).json({ error: "Could not update user." });
  }
});

router.delete("/users/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ error: "User not found." }); return; }
    if (user.email === process.env.ADMIN_EMAIL) {
      res.status(403).json({ error: "Cannot delete the primary admin account." });
      return;
    }
    await User.deleteOne({ _id: req.params.id });
    await VideoHistory.deleteMany({ userId: req.params.id });
    res.json({ message: "User deleted." });
  } catch {
    res.status(500).json({ error: "Could not delete user." });
  }
});

router.post("/users/:id/grant-credits", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { credits } = req.body;
    if (!credits || isNaN(Number(credits))) {
      res.status(400).json({ error: "Valid credit amount required." });
      return;
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: { credits: Number(credits) } },
      { new: true }
    ).select("-password");
    if (!user) { res.status(404).json({ error: "User not found." }); return; }
    res.json({ message: `Granted ${credits} credits.`, credits: user.credits });
  } catch {
    res.status(500).json({ error: "Could not grant credits." });
  }
});

// Transfer credits between two users
router.post("/transfer-credits", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { fromUserId, toUserId, amount } = req.body;
    const n = Number(amount);
    if (!fromUserId || !toUserId || !n || n <= 0 || isNaN(n)) {
      res.status(400).json({ error: "Valid fromUserId, toUserId, and positive amount are required." });
      return;
    }
    if (fromUserId === toUserId) {
      res.status(400).json({ error: "Cannot transfer credits to the same user." });
      return;
    }
    const [from, to] = await Promise.all([
      User.findById(fromUserId).select("-password"),
      User.findById(toUserId).select("-password"),
    ]);
    if (!from) { res.status(404).json({ error: "Source user not found." }); return; }
    if (!to) { res.status(404).json({ error: "Destination user not found." }); return; }
    if (from.credits < n) {
      res.status(400).json({ error: `Source user only has ${from.credits} credits.` });
      return;
    }
    await Promise.all([
      User.findByIdAndUpdate(fromUserId, { $inc: { credits: -n } }),
      User.findByIdAndUpdate(toUserId, { $inc: { credits: n } }),
    ]);
    res.json({
      message: `Transferred ${n} credits from ${from.name} to ${to.name}.`,
      from: { id: from._id, name: from.name, newCredits: from.credits - n },
      to: { id: to._id, name: to.name, newCredits: to.credits + n },
    });
  } catch {
    res.status(500).json({ error: "Could not transfer credits." });
  }
});

// IP abuse tracking — shows IPs that have hit the registration limit
router.get("/ip-abuse", requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const limit = Number(process.env.MAX_REGISTRATIONS_PER_IP ?? "3");
    const flagged = await RegistrationAttempt.find({ count: { $gte: limit } })
      .sort({ count: -1 })
      .limit(100)
      .lean();
    const all = await RegistrationAttempt.find()
      .sort({ count: -1 })
      .limit(200)
      .lean();
    res.json({ flagged, all, limit });
  } catch {
    res.status(500).json({ error: "Could not load IP data." });
  }
});

// Manually clear an IP from the abuse tracker (admin override)
router.delete("/ip-abuse/:ip", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const ip = decodeURIComponent(req.params.ip);
    await RegistrationAttempt.deleteOne({ ip });
    res.json({ message: `IP ${ip} cleared from tracker.` });
  } catch {
    res.status(500).json({ error: "Could not clear IP." });
  }
});

export default router;
