import { Router } from "express";
import type { Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { optionalAuth, requireAuth, type AuthRequest } from "../middleware/auth";
import { User } from "../models/User";
import { VideoHistory } from "../models/VideoHistory";

const router = Router();
const execAsync = promisify(exec);

const PAXSENIX_API_KEYS = (process.env.PAXSENIX_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);
const EXSAL_API_KEY = process.env.EXSAL_API_KEY || "";

function getRandomPaxsenixKey(): string {
  if (PAXSENIX_API_KEYS.length === 0) throw new Error("QUOTA_EXHAUSTED");
  return PAXSENIX_API_KEYS[Math.floor(Math.random() * PAXSENIX_API_KEYS.length)];
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function removeWatermark(videoUrl: string): Promise<string> {
  const ts = Date.now();
  const tmpIn  = join(tmpdir(), `vc_in_${ts}.mp4`);
  const tmpOut = join(tmpdir(), `vc_out_${ts}.mp4`);
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) return videoUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(tmpIn, buf);
    // Crop bottom 7% to remove the watermark strip; keep height divisible by 2
    await execAsync(`ffmpeg -i "${tmpIn}" -vf "crop=iw:trunc(ih*0.93/2)*2:0:0" -c:a copy -y "${tmpOut}"`);
    const outBuf = await readFile(tmpOut);
    const blob = new Blob([outBuf], { type: "video/mp4" });
    const form = new FormData();
    form.append("file", blob, `vidcraft-${ts}.mp4`);
    const upload = await fetch("https://tmpfiles.org/api/v1/upload", { method: "POST", body: form });
    if (!upload.ok) return videoUrl;
    const uploadData = await upload.json() as any;
    if (uploadData.status === "success" && uploadData.data?.url) {
      return uploadData.data.url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
    }
    return videoUrl;
  } catch {
    return videoUrl;
  } finally {
    unlink(tmpIn).catch(() => {});
    unlink(tmpOut).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// freeaivideos.org — used for Wan 2.2 generation
// ---------------------------------------------------------------------------
const FREEVIDEO_BASE = "https://www.freeaivideos.org";
const FREEVIDEO_HEADERS = {
  "user-agent": "NB Android/1.0.0",
  "origin":     FREEVIDEO_BASE,
  "referer":    FREEVIDEO_BASE + "/",
  "accept":     "*/*",
};

async function freevideoGenerate(prompt: string, imageUrl?: string): Promise<{ ok: true; requestId: string } | { ok: false; error: string }> {
  try {
    const form = new FormData();
    form.append("prompt", prompt || "");

    if (imageUrl) {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) return { ok: false, error: "Could not fetch reference image." };
      const imgBuf = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      const blob = new Blob([imgBuf], { type: contentType });
      // FormData.append with Blob + filename
      form.append("initialFrame", blob, "image.jpg");
    }

    const res = await fetch(`${FREEVIDEO_BASE}/api/video_generation`, {
      method: "POST",
      headers: FREEVIDEO_HEADERS,
      body: form,
    });

    const data = await res.json() as any;
    if (!data?.request_id) return { ok: false, error: "Failed to get request ID from generator." };
    return { ok: true, requestId: data.request_id };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Unknown error starting generation." };
  }
}

async function freevideoPoll(requestId: string, timeoutMs = 10 * 60 * 1000): Promise<{ ok: true; videoUrl: string } | { ok: false; error: string }> {
  const url = `${FREEVIDEO_BASE}/api/video_generation?request_id=${encodeURIComponent(requestId)}&prompt=`;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { headers: FREEVIDEO_HEADERS });
      if (res.ok) {
        const data = await res.json() as any;
        if (data?.video_url) return { ok: true, videoUrl: data.video_url };
      }
    } catch { /* ignore transient errors, keep polling */ }
    await sleep(5000);
  }
  return { ok: false, error: "Generation timed out." };
}
// ---------------------------------------------------------------------------

function isQuotaError(status: number, body: any): boolean {
  if (status === 429 || status === 402) return true;
  const msg = (body?.message || "").toLowerCase();
  return msg.includes("quota") || msg.includes("limit") || msg.includes("exceeded") || msg.includes("exhausted");
}

router.post("/enhance-prompt", optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (PAXSENIX_API_KEYS.length === 0) {
      res.status(503).json({ error: "Our AI service is currently at capacity. Please try again later." });
      return;
    }
    const { briefIdea } = req.body;
    if (!briefIdea || typeof briefIdea !== "string") {
      res.status(400).json({ error: "Please provide a prompt to enhance." });
      return;
    }
    const apiKey = getRandomPaxsenixKey();
    const url = `https://api.paxsenix.org/ai-tools/prompt-enhancer?${new URLSearchParams({ prompt: briefIdea })}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    });
    const data = await response.json() as any;
    if (!response.ok) {
      if (isQuotaError(response.status, data)) {
        const isPaid = req.user && req.user.plan !== "free";
        res.status(503).json({ error: isPaid ? "Our AI servers are experiencing high demand. Please try again in a few minutes." : "Server is busy right now. Upgrade to Pro for priority access." });
        return;
      }
      res.status(502).json({ error: "Enhancement service is temporarily unavailable. Please try again." });
      return;
    }
    if (data.ok && data.enhanced_prompt) {
      res.json({ enhancedPrompt: data.enhanced_prompt });
    } else {
      res.status(502).json({ error: "Could not enhance your prompt right now. Try again shortly." });
    }
  } catch {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.post("/generate-video", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, model, ratio, imageUrl, endImageUrl } = req.body;
    if (!prompt || !model || !ratio) {
      res.status(400).json({ error: "Prompt, model, and aspect ratio are required." });
      return;
    }

    const user = req.user;
    const isVip = user.plan === "vip";
    const isPaid = user.plan !== "free";

    if (user.credits <= 0) {
      res.status(402).json({ error: isPaid ? "You've used all your credits. Purchase more to continue." : "You have no credits left. Upgrade to a plan to keep generating amazing videos!" });
      return;
    }

    if (model !== "wan-2.2" && !isPaid) {
      res.status(402).json({ error: "This AI model is available for Pro members only. Upgrade to unlock Veo 3.1, Grok Video, and Seedance 2.0." });
      return;
    }

    const MODEL_COSTS: Record<string, number> = {
      "wan-2.2":      4,
      "grok-video":   6,
      "seedance-2.0": 8,
      "veo-3.1":      10,
    };
    const MODEL_INITIAL_WAIT: Record<string, number> = {
      "wan-2.2":      4 * 60 * 1000,
      "grok-video":   5 * 60 * 1000,
      "veo-3.1":      7 * 60 * 1000,
      "seedance-2.0": 10 * 60 * 1000,
    };

    const creditCost = MODEL_COSTS[model] ?? 4;
    const initialWait = MODEL_INITIAL_WAIT[model] ?? 5 * 60 * 1000;

    if (user.credits < creditCost) {
      res.status(402).json({ error: isPaid ? `You need ${creditCost} credits for this model. Purchase more to continue.` : `You need ${creditCost} credits for this model. Upgrade a plan to keep generating amazing videos!` });
      return;
    }

    if (!user.isAdmin) {
      await User.findByIdAndUpdate(user._id, { $inc: { credits: -creditCost } });
    }

    // -----------------------------------------------------------------------
    // Wan 2.2 — powered by freeaivideos.org (free, no API key needed)
    // -----------------------------------------------------------------------
    if (model === "wan-2.2") {
      const genResult = await freevideoGenerate(prompt, imageUrl);
      if (!genResult.ok) {
        if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
        res.status(502).json({ error: "Wan 2.2 could not be started. Your credits have been refunded. Please try again." });
        return;
      }

      const pollResult = await freevideoPoll(genResult.requestId, 10 * 60 * 1000);
      if (!pollResult.ok) {
        if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
        res.status(504).json({ error: "Wan 2.2 timed out. Your credits have been refunded. Please try again." });
        return;
      }

      // Proxy through tmpfiles so the browser can preview without CORS issues
      const ts = Date.now();
      let finalVideoUrl = pollResult.videoUrl;
      try {
        const vidRes = await fetch(pollResult.videoUrl, {
          headers: { referer: "https://www.freeaivideos.org/", "user-agent": "NB Android/1.0.0" },
        });
        if (vidRes.ok) {
          const vidBuf = Buffer.from(await vidRes.arrayBuffer());
          const blob = new Blob([vidBuf], { type: "video/mp4" });
          const form = new FormData();
          form.append("file", blob, `vidcraft-wan-${ts}.mp4`);
          const upload = await fetch("https://tmpfiles.org/api/v1/upload", { method: "POST", body: form });
          if (upload.ok) {
            const uploadData = await upload.json() as any;
            if (uploadData.status === "success" && uploadData.data?.url) {
              finalVideoUrl = uploadData.data.url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
            }
          }
        }
      } catch { /* fall back to original URL if re-hosting fails */ }

      await VideoHistory.create({ userId: user._id.toString(), prompt, model, ratio, videoUrl: finalVideoUrl }).catch(() => {});
      res.json({ videoUrl: finalVideoUrl });
      return;
    }
    // -----------------------------------------------------------------------

    // Remaining models (grok-video, veo-3.1, seedance-2.0) use Paxsenix
    if (PAXSENIX_API_KEYS.length === 0) {
      if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
      const msg = isVip
        ? "Our AI servers are experiencing exceptionally high demand. Your credits have been refunded — please try again in a few minutes."
        : "Server is at capacity. Upgrade to VIP for guaranteed priority access. Your credits have been refunded.";
      res.status(503).json({ error: msg });
      return;
    }

    const apiKey = getRandomPaxsenixKey();
    const qp = new URLSearchParams({ prompt, ratio, model });
    qp.append("type", imageUrl ? "image-to-video" : "text-to-video");
    if (imageUrl) {
      if (model === "grok-video") qp.append("imageUrls", imageUrl);
      else qp.append("imageUrl", imageUrl);
      if (model === "veo-3.1" && endImageUrl) qp.append("endImageUrl", endImageUrl);
    }
    const initRes = await fetch(`https://api.paxsenix.org/ai-video/${model}?${qp}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const initData = await initRes.json() as any;

    if (!initRes.ok) {
      if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
      if (isQuotaError(initRes.status, initData)) {
        const msg = isVip
          ? "Our AI servers are experiencing exceptionally high demand. Your credits have been refunded — please try again shortly."
          : "Server is busy right now. Upgrade to VIP for priority queue access. Your credits have been refunded.";
        res.status(503).json({ error: msg });
        return;
      }
      res.status(502).json({ error: "Video generation could not be started. Your credits have been refunded." });
      return;
    }

    if (!initData.ok || !initData.task_url) {
      if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
      res.status(502).json({ error: "Generation request failed. Your credits have been refunded." });
      return;
    }

    // Wait the model's initial processing time before polling starts
    await sleep(initialWait);

    // Poll for up to 10 minutes total from request start.
    // Paxsenix sometimes returns an HTML error page (DOCTYPE) while still
    // processing — treat any non-JSON / non-done response as "still working"
    // and keep polling rather than crashing or bailing out early.
    const POLL_INTERVAL = 20000; // 20s between polls
    const MAX_POLL_MS   = 10 * 60 * 1000; // hard cap: 10 minutes
    const pollDeadline  = Date.now() + MAX_POLL_MS;

    let videoUrl: string | null = null;
    let consecutiveFails = 0;

    while (Date.now() < pollDeadline) {
      try {
        const pollRes = await fetch(initData.task_url, { headers: { Authorization: `Bearer ${apiKey}` } });
        const text = await pollRes.text();

        // HTML error page = Paxsenix still processing, keep waiting
        if (text.trimStart().startsWith("<!")) {
          await sleep(POLL_INTERVAL);
          continue;
        }

        let pollData: any;
        try { pollData = JSON.parse(text); } catch {
          await sleep(POLL_INTERVAL);
          continue;
        }

        if (pollData.ok && (pollData.status === "done" || pollData.status === "completed")) {
          videoUrl = pollData.video_url || pollData.url || pollData.videoUrl;
          break;
        }

        // "failed" can be transient on Paxsenix — only give up after 3 in a row
        if (pollData.status === "failed") {
          consecutiveFails++;
          if (consecutiveFails >= 3) break;
        } else {
          consecutiveFails = 0;
        }

      } catch {
        // Network hiccup — keep going
      }

      await sleep(POLL_INTERVAL);
    }

    if (!videoUrl) {
      if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
      res.status(504).json({ error: "Generation timed out. Your credits have been refunded — please try again." });
      return;
    }

    const cleanUrl = await removeWatermark(videoUrl);
    await VideoHistory.create({ userId: user._id.toString(), prompt, model, ratio, videoUrl: cleanUrl }).catch(() => {});
    res.json({ videoUrl: cleanUrl });
  } catch {
    res.status(500).json({ error: "An unexpected error occurred. Please try again." });
  }
});

router.post("/upload", requireAuth, async (req: Request, res: Response) => {
  try {
    const { file, filename, mimetype } = req.body;
    if (!file || !filename || !mimetype) {
      res.status(400).json({ error: "File data is required." });
      return;
    }
    const buffer = Buffer.from(file, "base64");
    const blob = new Blob([buffer], { type: mimetype });
    const form = new FormData();
    form.append("file", blob, filename);
    const response = await fetch("https://tmpfiles.org/api/v1/upload", { method: "POST", body: form });
    if (!response.ok) {
      res.status(502).json({ error: "Upload service is temporarily unavailable." });
      return;
    }
    const result = await response.json() as any;
    if (result.status === "success" && result.data?.url) {
      res.json({ url: result.data.url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/") });
    } else {
      res.status(502).json({ error: "Upload failed. Please try again." });
    }
  } catch {
    res.status(500).json({ error: "Upload failed. Please try again." });
  }
});

router.post("/download-video", requireAuth, async (req: Request, res: Response) => {
  try {
    const { videoUrl, filename } = req.body;
    if (!videoUrl) {
      res.status(400).json({ error: "Video URL is required." });
      return;
    }
    const response = await fetch(videoUrl);
    if (!response.ok) {
      res.status(502).json({ error: "Could not fetch video for download." });
      return;
    }
    const buffer = await response.arrayBuffer();
    const safeFilename = (filename || `VidCraft-AI-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "-");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.mp4"`);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", buffer.byteLength);
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).json({ error: "Download failed. Please try again." });
  }
});

// Proxies a video URL through the server so the browser can embed it without
// CORS issues (e.g. freeaivideos.org blocks direct cross-origin <video> embeds).
router.get("/proxy-video", requireAuth, async (req: Request, res: Response) => {
  try {
    const videoUrl = req.query.url as string;
    if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
      res.status(400).json({ error: "Invalid video URL." });
      return;
    }
    const upstream = await fetch(videoUrl, {
      headers: {
        "user-agent": "NB Android/1.0.0",
        "referer":    "https://www.freeaivideos.org/",
      },
    });
    if (!upstream.ok) {
      res.status(502).json({ error: "Could not fetch video for preview." });
      return;
    }
    const contentType = upstream.headers.get("content-type") || "video/mp4";
    const contentLength = upstream.headers.get("content-length");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    // Stream the response directly — no buffering the whole file in memory
    const reader = upstream.body?.getReader();
    if (!reader) { res.status(502).end(); return; }
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        const ok = res.write(value);
        if (!ok) await new Promise(r => res.once("drain", r));
      }
    };
    pump().catch(() => res.end());
  } catch {
    res.status(500).json({ error: "Proxy failed. Please try again." });
  }
});

export default router;
