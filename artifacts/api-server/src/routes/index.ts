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
import immigrationLettersRouter from "./immigrationLetters";
import studentExportRouter from "./studentExport";
import adminAuthRouter, { requireAdminAuth } from "./adminAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(clientsRouter);
router.use(applicationsRouter);
router.use(documentsRouter);
router.use(statsRouter);
router.use(studentRouter);

// Admin login (public — no auth required)
router.use(adminAuthRouter);

// All /admin/* routes below require a valid admin token
router.use("/admin", requireAdminAuth);
router.use(adminSubmissionsRouter);
router.use(id995aRouter);
router.use(immigrationLettersRouter);
router.use(studentExportRouter);

export default router;
