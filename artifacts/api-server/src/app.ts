import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { connectDB } from "./lib/mongodb";

connectDB();

const app: Express = express();

app.set("trust proxy", 1);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  frameguard: { action: "deny" },
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again in a few minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please wait a few minutes before trying again." },
});

const genLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Generation limit reached for this hour. Upgrade to VIP for unlimited access." },
});

// Hard cap: max 3 new accounts per IP address per 24 hours (in-memory layer)
const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: Number(process.env.MAX_REGISTRATIONS_PER_IP ?? "3"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many accounts created from this connection. Please try again tomorrow or contact support." },
  skipSuccessfulRequests: false,
});

app.use(generalLimiter);
app.use("/api/auth/register", registerLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/ai/generate-video", genLimiter);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(cookieParser());

app.use("/api", router);

// In production, serve the built React frontend and handle client-side routing
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.resolve(__dirname, "../../vidcraft-ai/dist/public");
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  } else {
    logger.warn("Frontend dist not found at: " + frontendDist);
    app.use((_req, res) => res.status(404).json({ error: "Route not found." }));
  }
} else {
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found." });
  });
}

export default app;
