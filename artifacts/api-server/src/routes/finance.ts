import { Router } from "express";
import { db } from "@workspace/db";
import { financialTransactionsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/admin/finance/transactions", async (_req, res) => {
  try {
    const rows = await db.select().from(financialTransactionsTable).orderBy(desc(financialTransactionsTable.date));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed to fetch transactions" }); }
});

router.post("/admin/finance/transactions", async (req, res) => {
  try {
    const { type, amount, description, category, date, notes } = req.body;
    if (!type || !amount || !description || !category || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [row] = await db.insert(financialTransactionsTable)
      .values({ type, amount: parseInt(amount), description, category, date, notes: notes ?? null })
      .returning();
    res.json(row);
  } catch { res.status(500).json({ error: "Failed to create transaction" }); }
});

router.delete("/admin/finance/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(financialTransactionsTable).where(eq(financialTransactionsTable.id, id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete transaction" }); }
});

router.get("/admin/finance/summary", async (_req, res) => {
  try {
    const rows = await db.select().from(financialTransactionsTable);
    const income = rows.filter(r => r.type === "income").reduce((s, r) => s + r.amount, 0);
    const expenses = rows.filter(r => r.type === "expense").reduce((s, r) => s + r.amount, 0);
    const profit = income - expenses;
    const zakat = profit > 0 ? Math.round(profit * 0.025) : 0;
    res.json({ income, expenses, profit, zakat });
  } catch { res.status(500).json({ error: "Failed to fetch summary" }); }
});

export default router;
