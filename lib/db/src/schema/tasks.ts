import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes"),
  deadline: text("deadline"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  assignedTo: integer("assigned_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskChecklistItemsTable = pgTable("task_checklist_items", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  text: text("text").notNull(),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const taskAttachmentsTable = pgTable("task_attachments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: text("uploaded_by").notNull().default("admin"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});
