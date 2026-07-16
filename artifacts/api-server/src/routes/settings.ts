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

const DEFAULT_PAYMENT_METHODS = {
  alipay: { enabled: false, accountName: "", accountId: "", qrCodeUrl: "", instructions: "" },
  card:   { enabled: false, paymentLink: "", instructions: "" },
};

router.get("/settings/payment-methods", async (_req, res) => {
  try {
    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "payment_methods")).limit(1);
    res.json(row ? row.value : DEFAULT_PAYMENT_METHODS);
  } catch { res.status(500).json({ error: "Failed to fetch payment methods" }); }
});

router.put("/admin/settings/payment-methods", async (req, res) => {
  try {
    const methods = req.body;
    await db.insert(appSettingsTable)
      .values({ key: "payment_methods", value: methods })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: methods, updatedAt: new Date() } });
    res.json(methods);
  } catch { res.status(500).json({ error: "Failed to update payment methods" }); }
});

// ── On-Arrival Visa page toggle ──
// Uses /admin/pages/* path so it's covered by requireAdminPanelAuth but NOT
// the stricter requireAdminOnly guard that sits on /admin/settings/*.
const DEFAULT_ON_ARRIVAL = { live: false, price: 1000 };

router.get("/settings/on-arrival", async (_req, res) => {
  try {
    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "on_arrival")).limit(1);
    const data = row ? row.value as Record<string, any> : {};
    res.json({ ...DEFAULT_ON_ARRIVAL, ...data });
  } catch { res.status(500).json({ error: "Failed to fetch on-arrival setting" }); }
});

router.put("/admin/pages/on-arrival", async (req, res) => {
  try {
    // Fetch current value so we merge rather than overwrite
    const [existing] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "on_arrival")).limit(1);
    const current = (existing?.value as Record<string, any>) ?? DEFAULT_ON_ARRIVAL;

    const patch: Record<string, any> = {};
    if ("live" in req.body) patch.live = !!req.body.live;
    if ("price" in req.body) {
      const p = Number(req.body.price);
      if (!isNaN(p) && p >= 0) patch.price = p;
    }
    const value = { ...current, ...patch };

    await db.insert(appSettingsTable)
      .values({ key: "on_arrival", value })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
    res.json(value);
  } catch { res.status(500).json({ error: "Failed to update on-arrival setting" }); }
});

export default router;
