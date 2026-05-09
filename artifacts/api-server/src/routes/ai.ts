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
// freeaivideos.org — used for grok-video generation
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

    if (model === "wan-2.2") {
      if (!EXSAL_API_KEY) {
        if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
        res.status(503).json({ error: "Wan 2.2 is temporarily offline. Your credits have been refunded. Please try again later." });
        return;
      }
      let url: string;
      if (imageUrl) {
        url = `https://exsalapi.my.id/api/ai/video/wan-2.2/img2vid?image_url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}&apikey=${EXSAL_API_KEY}`;
      } else {
        const mappedRatio = ratio === "16:9" ? "landscape" : "portrait";
        url = `https://exsalapi.my.id/api/ai/video/wan-2.2/txt2vid?prompt=${encodeURIComponent(prompt)}&ratio=${mappedRatio}&apikey=${EXSAL_API_KEY}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
        res.status(503).json({ error: "Wan 2.2 is currently unavailable. Your credits have been refunded." });
        return;
      }

      // The Exsal API now returns the video binary directly instead of JSON + pollUrl.
      // We detect by Content-Type: if it's video/* or octet-stream, handle as direct video.
      // Fall back to the old JSON polling path if the response is still JSON.
      const contentType = response.headers.get("content-type") || "";
      let videoUrl: string | null = null;

      if (contentType.includes("video/") || contentType.includes("application/octet-stream")) {
        // Direct binary video — upload it to tmpfiles to get a shareable URL
        const ts = Date.now();
        const videoBuf = Buffer.from(await response.arrayBuffer());
        const blob = new Blob([videoBuf], { type: "video/mp4" });
        const form = new FormData();
        form.append("file", blob, `vidcraft-wan-${ts}.mp4`);
        const upload = await fetch("https://tmpfiles.org/api/v1/upload", { method: "POST", body: form });
        if (!upload.ok) {
          if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
          res.status(502).json({ error: "Failed to process generated video. Your credits have been refunded." });
          return;
        }
        const uploadData = await upload.json() as any;
        if (uploadData.status === "success" && uploadData.data?.url) {
          videoUrl = uploadData.data.url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
        }
      } else {
        // Legacy JSON + polling path (kept as fallback in case the API reverts)
        let initialData: any;
        try {
          initialData = await response.json();
        } catch {
          if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
          res.status(502).json({ error: "Unexpected response from Wan 2.2. Your credits have been refunded." });
          return;
        }
        if (!initialData.status || !initialData.data?.pollUrl) {
          if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
          res.status(502).json({ error: "Failed to start video generation. Your credits have been refunded." });
          return;
        }
        const pollUrl = initialData.data.pollUrl;
        await sleep(initialWait);
        for (let i = 0; i < 24; i++) {
          const pollRes = await fetch(pollUrl);
          if (!pollRes.ok) { await sleep(15000); continue; }
          const pollData = await pollRes.json() as any;
          if (pollData.data?.status === "completed" && pollData.data?.url) {
            videoUrl = pollData.data.url;
            break;
          }
          if (pollData.data?.status === "failed") break;
          await sleep(15000);
        }
      }

      if (!videoUrl) {
        if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
        res.status(504).json({ error: "Generation is taking longer than expected. Your credits have been refunded. Please try again." });
        return;
      }
      await VideoHistory.create({ userId: user._id.toString(), prompt, model, ratio, videoUrl }).catch(() => {});
      res.json({ videoUrl });
      return;
    }

    // -----------------------------------------------------------------------
    // Grok Video — powered by freeaivideos.org (free, no API key needed)
    // -----------------------------------------------------------------------
    if (model === "grok-video") {
      const genResult = await freevideoGenerate(prompt, imageUrl);
      if (!genResult.ok) {
        if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
        res.status(502).json({ error: "Grok Video could not be started. Your credits have been refunded. Please try again." });
        return;
      }

      const pollResult = await freevideoPoll(genResult.requestId, 10 * 60 * 1000);
      if (!pollResult.ok) {
        if (!user.isAdmin) await User.findByIdAndUpdate(user._id, { $inc: { credits: creditCost } });
        res.status(504).json({ error: "Grok Video timed out. Your credits have been refunded. Please try again." });
        return;
      }

      await VideoHistory.create({ userId: user._id.toString(), prompt, model, ratio, videoUrl: pollResult.videoUrl }).catch(() => {});
      res.json({ videoUrl: pollResult.videoUrl });
      return;
    }
    // -----------------------------------------------------------------------

    // Remaining models (veo-3.1, seedance-2.0) use Paxsenix
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
      qp.append("imageUrl", imageUrl);
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

    await sleep(initialWait);

    let videoUrl: string | null = null;
    for (let i = 0; i < 24; i++) {
      const pollRes = await fetch(initData.task_url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!pollRes.ok) { await sleep(15000); continue; }
      const pollData = await pollRes.json() as any;
      if (pollData.status === "done" && pollData.ok) {
        videoUrl = pollData.video_url || pollData.url;
        break;
      }
      if (pollData.status === "failed") break;
      await sleep(15000);
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

export default router;
