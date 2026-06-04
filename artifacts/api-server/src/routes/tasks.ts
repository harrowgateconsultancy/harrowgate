import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, taskChecklistItemsTable, taskAttachmentsTable, staffAccountsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireStaffAuth } from "./staffAuth";

const router = Router();

async function buildTask(task: typeof tasksTable.$inferSelect) {
  const checklist = await db.select().from(taskChecklistItemsTable)
    .where(eq(taskChecklistItemsTable.taskId, task.id))
    .orderBy(taskChecklistItemsTable.sortOrder);
  const attachments = await db.select().from(taskAttachmentsTable)
    .where(eq(taskAttachmentsTable.taskId, task.id));
  let assignedStaff = null;
  if (task.assignedTo) {
    const [s] = await db.select({ id: staffAccountsTable.id, name: staffAccountsTable.name, username: staffAccountsTable.username })
      .from(staffAccountsTable).where(eq(staffAccountsTable.id, task.assignedTo)).limit(1);
    assignedStaff = s || null;
  }
  return { ...task, checklist, attachments, assignedStaff };
}

// ── Admin routes (protected by requireAdminAuth in index.ts) ──────────────────

// Create task
router.post("/admin/tasks", async (req, res) => {
  try {
    const { title, notes, deadline, priority, assignedTo, checklist, attachments } = req.body || {};
    if (!title) return res.status(400).json({ error: "Title is required" });
    const [task] = await db.insert(tasksTable)
      .values({ title, notes: notes || null, deadline: deadline || null, priority: priority || "medium", assignedTo: assignedTo || null, status: "pending" })
      .returning();
    if (Array.isArray(checklist)) {
      for (let i = 0; i < checklist.length; i++) {
        const item = checklist[i];
        if (item.text?.trim()) {
          await db.insert(taskChecklistItemsTable).values({ taskId: task.id, text: item.text.trim(), completed: false, sortOrder: i });
        }
      }
    }
    if (Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.fileUrl && att.fileName) {
          await db.insert(taskAttachmentsTable).values({ taskId: task.id, fileName: att.fileName, fileUrl: att.fileUrl, fileSize: att.fileSize || null, mimeType: att.mimeType || null });
        }
      }
    }
    res.status(201).json(await buildTask(task));
  } catch { res.status(500).json({ error: "Failed to create task" }); }
});

// List all tasks (admin)
router.get("/admin/tasks", async (_req, res) => {
  try {
    const tasks = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
    const full = await Promise.all(tasks.map(buildTask));
    res.json(full);
  } catch { res.status(500).json({ error: "Failed to fetch tasks" }); }
});

// Update task (admin)
router.put("/admin/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, notes, deadline, priority, assignedTo, status, checklist, attachments } = req.body || {};
    const [task] = await db.update(tasksTable)
      .set({ title, notes: notes ?? null, deadline: deadline ?? null, priority, assignedTo: assignedTo ?? null, status, updatedAt: new Date() })
      .where(eq(tasksTable.id, id)).returning();
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (Array.isArray(checklist)) {
      await db.delete(taskChecklistItemsTable).where(eq(taskChecklistItemsTable.taskId, id));
      for (let i = 0; i < checklist.length; i++) {
        const item = checklist[i];
        if (item.text?.trim()) {
          await db.insert(taskChecklistItemsTable).values({ taskId: id, text: item.text.trim(), completed: !!item.completed, sortOrder: i });
        }
      }
    }
    if (Array.isArray(attachments)) {
      await db.delete(taskAttachmentsTable).where(eq(taskAttachmentsTable.taskId, id));
      for (const att of attachments) {
        if (att.fileUrl && att.fileName) {
          await db.insert(taskAttachmentsTable).values({ taskId: id, fileName: att.fileName, fileUrl: att.fileUrl, fileSize: att.fileSize || null, mimeType: att.mimeType || null });
        }
      }
    }
    res.json(await buildTask(task));
  } catch { res.status(500).json({ error: "Failed to update task" }); }
});

// Delete task (admin)
router.delete("/admin/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(taskChecklistItemsTable).where(eq(taskChecklistItemsTable.taskId, id));
    await db.delete(taskAttachmentsTable).where(eq(taskAttachmentsTable.taskId, id));
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete task" }); }
});

// ── Staff routes ──────────────────────────────────────────────────────────────

// Staff: get own tasks
router.get("/staff/tasks", requireStaffAuth, async (req: any, res) => {
  try {
    const tasks = await db.select().from(tasksTable)
      .where(eq(tasksTable.assignedTo, req.staffId))
      .orderBy(desc(tasksTable.createdAt));
    const full = await Promise.all(tasks.map(buildTask));
    res.json(full);
  } catch { res.status(500).json({ error: "Failed to fetch tasks" }); }
});

// Staff: toggle a checklist item
router.patch("/staff/tasks/:taskId/checklist/:itemId", requireStaffAuth, async (req: any, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { completed } = req.body;
    const [item] = await db.update(taskChecklistItemsTable)
      .set({ completed: !!completed })
      .where(eq(taskChecklistItemsTable.id, itemId))
      .returning();
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch { res.status(500).json({ error: "Failed to update item" }); }
});

// Staff: update task status
router.patch("/staff/tasks/:taskId/status", requireStaffAuth, async (req: any, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { status } = req.body;
    const [task] = await db.update(tasksTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId))
      .returning();
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch { res.status(500).json({ error: "Failed to update status" }); }
});

// Staff: get self info
router.get("/staff/me", requireStaffAuth, async (req: any, res) => {
  try {
    const [staff] = await db.select({ id: staffAccountsTable.id, name: staffAccountsTable.name, username: staffAccountsTable.username, role: staffAccountsTable.role })
      .from(staffAccountsTable).where(eq(staffAccountsTable.id, req.staffId)).limit(1);
    if (!staff) return res.status(404).json({ error: "Staff not found" });
    res.json(staff);
  } catch { res.status(500).json({ error: "Failed to fetch staff info" }); }
});

export default router;
