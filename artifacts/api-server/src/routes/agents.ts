import { Router } from "express";
import { scryptSync, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { agentsTable } from "@workspace/db/schema";

const router = Router();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Public: agent registration
router.post("/agents/register", async (req, res) => {
  try {
    const {
      username, password,
      companyName, businessRegUrl, businessRegName,
      contactName, officeAddress, contactNumber, whatsappAvailable,
      idDocUrl, idDocName,
    } = req.body || {};

    if (!username || !password || !companyName || !contactName || !officeAddress || !contactNumber) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const passwordHash = hashPassword(password);
    const [agent] = await db.insert(agentsTable).values({
      username,
      passwordHash,
      plainPassword: password,
      companyName,
      businessRegUrl: businessRegUrl || null,
      businessRegName: businessRegName || null,
      contactName,
      officeAddress,
      contactNumber,
      whatsappAvailable: whatsappAvailable === "yes" ? "yes" : "no",
      idDocUrl: idDocUrl || null,
      idDocName: idDocName || null,
      status: "pending",
    }).returning();

    res.status(201).json({ id: agent.id, status: agent.status });
  } catch (e: any) {
    if (e?.message?.includes("unique")) {
      return res.status(409).json({ error: "Username already taken" });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

// Admin: list all agents
router.get("/admin/agents", async (_req, res) => {
  try {
    const agents = await db.select().from(agentsTable).orderBy(agentsTable.createdAt);
    res.json(agents);
  } catch {
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

// Admin: update agent status
router.patch("/admin/agents/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: "Status required" });
    await db.update(agentsTable).set({ status }).where(
      (await import("drizzle-orm")).eq(agentsTable.id, id)
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
