import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { User } from "../models/User";

export interface AuthRequest extends Request {
  user?: any;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ error: "Please sign in to continue." });
      return;
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "fallback");
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      res.status(401).json({ error: "Account not found. Please sign in again." });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Please sign in again." });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "fallback");
      User.findById(decoded.id).select("-password").then(user => {
        req.user = user;
        next();
      }).catch(() => next());
    } else {
      next();
    }
  } catch {
    next();
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (!req.user?.isAdmin) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    next();
  });
}
