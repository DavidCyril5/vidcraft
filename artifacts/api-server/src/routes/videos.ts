import { Router } from "express";
import type { Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { VideoHistory } from "../models/VideoHistory";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const model = req.query.model as string | undefined;
    const favoritesOnly = req.query.favorites === "true";
    const search = req.query.search as string | undefined;

    const query: Record<string, any> = { userId: req.user._id.toString() };
    if (model && model !== "all") query.model = model;
    if (favoritesOnly) query.isFavorited = true;
    if (search) query.prompt = { $regex: search, $options: "i" };

    const [videos, total] = await Promise.all([
      VideoHistory.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      VideoHistory.countDocuments(query),
    ]);

    res.json({ videos, total, page, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: "Could not load your video history." });
  }
});

router.patch("/:id/favorite", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const video = await VideoHistory.findOne({ _id: req.params.id, userId: req.user._id.toString() });
    if (!video) { res.status(404).json({ error: "Video not found." }); return; }
    video.isFavorited = !video.isFavorited;
    await video.save();
    res.json({ isFavorited: video.isFavorited });
  } catch {
    res.status(500).json({ error: "Could not update favourite." });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const video = await VideoHistory.findOne({ _id: req.params.id, userId: req.user._id.toString() });
    if (!video) { res.status(404).json({ error: "Video not found." }); return; }
    await VideoHistory.deleteOne({ _id: req.params.id });
    res.json({ message: "Video removed from history." });
  } catch {
    res.status(500).json({ error: "Could not delete video." });
  }
});

router.get("/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id.toString();
    const [total, byModel, favorites] = await Promise.all([
      VideoHistory.countDocuments({ userId }),
      VideoHistory.aggregate([
        { $match: { userId } },
        { $group: { _id: "$model", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      VideoHistory.countDocuments({ userId, isFavorited: true }),
    ]);
    res.json({ totalVideos: total, byModel, favorites });
  } catch {
    res.status(500).json({ error: "Could not load stats." });
  }
});

export default router;
