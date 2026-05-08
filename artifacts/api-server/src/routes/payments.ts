import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { User } from "../models/User";
import crypto from "crypto";

const router = Router();

const PLANS: Record<string, { name: string; credits: number; plan: string; amount: number }> = {
  starter: { name: "Starter", credits: 20, plan: "starter", amount: 100000 },
  pro: { name: "Pro", credits: 60, plan: "pro", amount: 300000 },
  vip: { name: "VIP", credits: 9999, plan: "vip", amount: 700000 },
};

router.post("/initialize", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];
    if (!plan) {
      res.status(400).json({ error: "Invalid plan selected." });
      return;
    }
    const user = req.user;
    const ref = `vc-${Date.now()}-${user._id}`;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: plan.amount,
        reference: ref,
        currency: "NGN",
        metadata: { planId, userId: user._id.toString(), credits: plan.credits },
        callback_url: `${process.env.FRONTEND_URL || ""}/payment/verify`,
      }),
    });

    if (!response.ok) {
      res.status(502).json({ error: "Payment gateway is currently unavailable. Please try again." });
      return;
    }
    const data = await response.json() as any;
    if (!data.status) {
      res.status(502).json({ error: "Could not initialize payment. Please try again." });
      return;
    }
    res.json({ authorizationUrl: data.data.authorization_url, reference: ref });
  } catch {
    res.status(500).json({ error: "Payment service error. Please try again." });
  }
});

router.post("/verify", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      res.status(400).json({ error: "Payment reference is required." });
      return;
    }
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    if (!response.ok) {
      res.status(502).json({ error: "Could not verify payment. Please contact support." });
      return;
    }
    const data = await response.json() as any;
    if (!data.status || data.data?.status !== "success") {
      res.status(400).json({ error: "Payment was not successful." });
      return;
    }
    const { planId, userId, credits } = data.data.metadata;
    const plan = PLANS[planId];
    if (!plan || userId !== req.user._id.toString()) {
      res.status(400).json({ error: "Invalid payment details." });
      return;
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { plan: plan.plan, credits: plan.credits },
      { new: true }
    );
    res.json({
      message: `Welcome to ${plan.name}! Your account has been upgraded.`,
      user: { plan: updatedUser?.plan, credits: updatedUser?.credits },
    });
  } catch {
    res.status(500).json({ error: "Verification failed. Please contact support." });
  }
});

router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
      .update(JSON.stringify(req.body))
      .digest("hex");
    if (hash !== req.headers["x-paystack-signature"]) {
      res.status(400).send("Invalid signature");
      return;
    }
    const { event, data } = req.body;
    if (event === "charge.success") {
      const { planId, userId, credits } = data.metadata;
      const plan = PLANS[planId];
      if (plan && userId) {
        await User.findByIdAndUpdate(userId, { plan: plan.plan, credits: plan.credits });
      }
    }
    res.sendStatus(200);
  } catch {
    res.sendStatus(200);
  }
});

export default router;
