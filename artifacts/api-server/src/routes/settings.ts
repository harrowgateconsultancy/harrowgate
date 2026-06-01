import { Router } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_PRICING = {
  mastersTotal: 140000,
  bachelorTotal: 130000,
  associateTotal: 90000,
  mastersLastPayment: 125000,
  bachelorLastPayment: 115000,
  associateLastPayment: 75000,
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

export default router;
