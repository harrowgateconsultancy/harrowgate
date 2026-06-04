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
import settingsRouter from "./settings";
import financeRouter from "./finance";
import staffAuthRouter from "./staffAuth";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(clientsRouter);
router.use(applicationsRouter);
router.use(documentsRouter);
router.use(statsRouter);
router.use(studentRouter);

// Public settings (pricing)
router.use(settingsRouter);

// Admin login (public — no auth required)
router.use(adminAuthRouter);

// Staff login + staff task routes (staff auth handled per-route)
router.use(staffAuthRouter);
router.use(tasksRouter);

// All /admin/* routes below require a valid admin token
router.use("/admin", requireAdminAuth);
router.use(adminSubmissionsRouter);
router.use(id995aRouter);
router.use(immigrationLettersRouter);
router.use(studentExportRouter);
router.use(settingsRouter);
router.use(financeRouter);
router.use(staffAuthRouter);
router.use(tasksRouter);

export default router;
