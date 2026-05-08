import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import authRouter from "./auth";
import paymentsRouter from "./payments";
import videosRouter from "./videos";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/ai", aiRouter);
router.use("/payments", paymentsRouter);
router.use("/videos", videosRouter);

export default router;
