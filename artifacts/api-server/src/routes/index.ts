import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import postsRouter from "./posts";
import storiesRouter from "./stories";
import reelsRouter from "./reels";
import messagesRouter from "./messages";
import notificationsRouter from "./notifications";
import groupsRouter from "./groups";
import marketplaceRouter from "./marketplace";
import searchRouter from "./search";
import statsRouter from "./stats";
import adminRouter from "./admin";
import signalsRouter from "./signals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(postsRouter);
router.use(storiesRouter);
router.use(reelsRouter);
router.use(messagesRouter);
router.use(notificationsRouter);
router.use(groupsRouter);
router.use(marketplaceRouter);
router.use(searchRouter);
router.use(statsRouter);
router.use(adminRouter);
router.use("/signals", signalsRouter);

export default router;
