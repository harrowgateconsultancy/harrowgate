import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { studentSubmissionsTable } from "./studentSubmissions";

export const studentOutboxTable = pgTable("student_outbox", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => studentSubmissionsTable.id, { onDelete: "cascade" }),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  // pending | sent | rejected
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  adminNote: text("admin_note"),
});

export type StudentOutbox = typeof studentOutboxTable.$inferSelect;
