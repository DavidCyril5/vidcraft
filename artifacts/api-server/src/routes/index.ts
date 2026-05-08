import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import authRouter from "./auth";
import paymentsRouter from "./payments";
import videosRouter from "./videos";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/ai", aiRouter);
router.use("/payments", paymentsRouter);
router.use("/videos", videosRouter);
router.use("/admin", adminRouter);

export default router;
