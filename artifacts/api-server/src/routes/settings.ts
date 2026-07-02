import { Router } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_FEATURES = [
  { text: "1st semester tuition fee inclusive (paid by students)", bold: true },
  { text: "Application documents review" },
  { text: "University enrollment guidance" },
  { text: "Visa document checklist" },
  { text: "Full application & form filling guide" },
  { text: "Immigration letter assistance" },
  { text: "Visa form review & Guidance" },
  { text: "Pre-departure briefing session" },
  { text: "Phone plan setup guide" },
  { text: "Emergency contact protocols" },
  { text: "Priority WhatsApp support" },
  { text: "Service ends upon arrival at university", bold: true },
];

const DEFAULT_PRICING = {
  mastersTotal: 130000,
  bachelorTotal: 120000,
  associateTotal: 90000,
  diplomaTotal: 70000,
  mastersStage2: 45000,
  bachelorStage2: 40000,
  associateStage2: 30000,
  diplomaStage2: 25000,
  mastersLastPayment: 82000,
  bachelorLastPayment: 57000,
  associateLastPayment: 47000,
  diplomaLastPayment: 42000,
  features: DEFAULT_FEATURES,
};

const DEFAULT_BANK_DETAILS = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  fps: "",
  additionalInfo: "",
};

router.get("/settings/pricing", async (_req, res) => {
  try {
    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "pricing")).limit(1);
    res.json(row ? row.value : DEFAULT_PRICING);
  } catch { res.status(500).json({ error: "Failed to fetch pricing" }); }
});

router.put("/admin/settings/pricing", async (req, res) => {
  try {
    const pricing = req.body;
    await db.insert(appSettingsTable)
      .values({ key: "pricing", value: pricing })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: pricing, updatedAt: new Date() } });
    res.json(pricing);
  } catch { res.status(500).json({ error: "Failed to update pricing" }); }
});

router.get("/settings/bank-details", async (_req, res) => {
  try {
    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "bank_details")).limit(1);
    res.json(row ? row.value : DEFAULT_BANK_DETAILS);
  } catch { res.status(500).json({ error: "Failed to fetch bank details" }); }
});

router.put("/admin/settings/bank-details", async (req, res) => {
  try {
    const details = req.body;
    await db.insert(appSettingsTable)
      .values({ key: "bank_details", value: details })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: details, updatedAt: new Date() } });
    res.json(details);
  } catch { res.status(500).json({ error: "Failed to update bank details" }); }
});

export default router;
