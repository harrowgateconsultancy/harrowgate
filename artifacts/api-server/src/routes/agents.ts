import { Router } from "express";
import { scryptSync, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { agentsTable } from "@workspace/db/schema";
import { eq, inArray, isNotNull } from "drizzle-orm";
import { sendAgentEmail } from "../email";

const router = Router();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function generateAgentCode(): Promise<string> {
  const rows = await db.select({ agentCode: agentsTable.agentCode })
    .from(agentsTable)
    .where(isNotNull(agentsTable.agentCode));
  let maxSeq = 0;
  for (const row of rows) {
    const m = row.agentCode?.match(/HGT-(\d+)/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  return `HGT-${String(maxSeq + 1).padStart(3, "0")}`;
}

// Public: agent registration
router.post("/agents/register", async (req, res) => {
  try {
    const {
      username, password,
      companyName, businessRegUrl, businessRegName,
      contactName, officeAddress, email, contactNumber, whatsappAvailable,
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
      email: email || null,
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

// Public: list approved agents (for student application dropdown)
router.get("/agents/approved", async (_req, res) => {
  try {
    const agents = await db.select({
      agentCode: agentsTable.agentCode,
      companyName: agentsTable.companyName,
      contactName: agentsTable.contactName,
    }).from(agentsTable).where(eq(agentsTable.status, "approved"));
    res.json(agents.filter(a => a.agentCode));
  } catch {
    res.status(500).json({ error: "Failed to fetch approved agents" });
  }
});

// Admin: create an agent directly
router.post("/admin/agents", async (req, res) => {
  try {
    const {
      username, password,
      companyName, contactName, officeAddress, email, contactNumber,
      whatsappAvailable, autoApprove,
    } = req.body || {};

    if (!username || !password || !companyName || !contactName || !officeAddress || !contactNumber) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const passwordHash = hashPassword(password);
    const status = autoApprove ? "approved" : "pending";
    const agentCode = autoApprove ? await generateAgentCode() : null;

    const [agent] = await db.insert(agentsTable).values({
      username,
      passwordHash,
      plainPassword: password,
      companyName,
      contactName,
      officeAddress,
      email: email || null,
      contactNumber,
      whatsappAvailable: whatsappAvailable === "yes" ? "yes" : "no",
      status,
      agentCode,
    }).returning();

    res.status(201).json(agent);
  } catch (e: any) {
    if (e?.message?.includes("unique")) {
      return res.status(409).json({ error: "Username already taken" });
    }
    res.status(500).json({ error: "Failed to create agent" });
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

// Admin: update agent status — auto-assigns code on approval
router.patch("/admin/agents/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: "Status required" });

    const updateValues: Record<string, any> = { status };

    if (status === "approved") {
      const [current] = await db.select().from(agentsTable).where(eq(agentsTable.id, id));
      if (current && !current.agentCode) {
        updateValues.agentCode = await generateAgentCode();
      }
    }

    const [updated] = await db.update(agentsTable)
      .set(updateValues)
      .where(eq(agentsTable.id, id))
      .returning();

    res.json({ ok: true, agentCode: updated.agentCode ?? null });
  } catch {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Admin: delete a single agent
router.delete("/admin/agents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(agentsTable).where(eq(agentsTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete agent" });
  }
});

// Admin: bulk delete agents
router.delete("/admin/agents", async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }
    await db.delete(agentsTable).where(inArray(agentsTable.id, ids.map(Number)));
    res.json({ ok: true, deleted: ids.length });
  } catch {
    res.status(500).json({ error: "Failed to delete agents" });
  }
});

// Admin: send email to an agent
router.post("/admin/agents/:id/email", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { subject, body } = req.body || {};
    if (!subject || !body) return res.status(400).json({ error: "Subject and body required" });

    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, id));
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    if (!agent.email) return res.status(400).json({ error: "Agent has no email address" });

    await sendAgentEmail({ to: agent.email, subject, body });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to send email" });
  }
});

export default router;
