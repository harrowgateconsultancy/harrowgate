import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import clientsRouter from "./clients";
import applicationsRouter from "./applications";
import documentsRouter from "./documents";
import statsRouter from "./stats";
import studentRouter from "./student";
import adminSubmissionsRouter from "./adminSubmissions";
import id995aRouter from "./id995a";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(clientsRouter);
router.use(applicationsRouter);
router.use(documentsRouter);
router.use(statsRouter);
router.use(studentRouter);
router.use(adminSubmissionsRouter);
router.use(id995aRouter);

export default router;
