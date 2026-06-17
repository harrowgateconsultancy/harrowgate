import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import clientsRouter from "./clients";
import applicationsRouter from "./applications";
import documentsRouter from "./documents";
import statsRouter from "./stats";
import studentRouter from "./student";
import studentAuthRouter from "./studentAuth";
import studentOAuthRouter from "./studentOAuth";
import adminSubmissionsRouter from "./adminSubmissions";
import id995aRouter from "./id995a";
import immigrationLettersRouter from "./immigrationLetters";
import studentExportRouter from "./studentExport";
import adminAuthRouter, { requireAdminPanelAuth, requireAdminOnly } from "./adminAuth";
import settingsRouter from "./settings";
import financeRouter from "./finance";
import staffAuthRouter from "./staffAuth";
import tasksRouter from "./tasks";
import agentsRouter from "./agents";
import invoiceReceiptRouter from "./invoiceReceipt";

const router: IRouter = Router();

// ── Non-admin / public routes ────────────────────────────────────────────────
router.use(healthRouter);
router.use(storageRouter);
router.use(clientsRouter);
router.use(applicationsRouter);
router.use(documentsRouter);
router.use(statsRouter);
router.use(studentAuthRouter);
router.use(studentOAuthRouter);
router.use(studentRouter);

// Admin login + /admin/me (no auth required — must come before the auth wall)
router.use(adminAuthRouter);

// ── Admin auth wall + role restrictions ─────────────────────────────────────
// All /admin/* requests must carry a valid admin or staff/manager panel token
router.use("/admin", requireAdminPanelAuth);

// Finance pages — admin token only
router.use("/admin/finance", requireAdminOnly);

// Pricing / bank-details settings — admin token only
router.use("/admin/settings", requireAdminOnly);

// Staff account management:
//   GET  /admin/staff   → managers/staff may view
//   POST / DELETE       → admin only
router.use("/admin/staff", (req: any, res: any, next: any) => {
  if (req.method === "GET") return next();
  return requireAdminOnly(req, res, next);
});

// ── Route handlers (mounted once each) ──────────────────────────────────────
router.use(agentsRouter);
router.use(settingsRouter);
router.use(adminSubmissionsRouter);
router.use(id995aRouter);
router.use(immigrationLettersRouter);
router.use(studentExportRouter);
router.use(financeRouter);
router.use(staffAuthRouter);   // covers both /staff/login (public) and /admin/staff (protected above)
router.use(tasksRouter);
router.use(invoiceReceiptRouter);

export default router;
