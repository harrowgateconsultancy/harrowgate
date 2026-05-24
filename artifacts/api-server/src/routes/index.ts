import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import clientsRouter from "./clients";
import applicationsRouter from "./applications";
import documentsRouter from "./documents";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(clientsRouter);
router.use(applicationsRouter);
router.use(documentsRouter);
router.use(statsRouter);

export default router;
