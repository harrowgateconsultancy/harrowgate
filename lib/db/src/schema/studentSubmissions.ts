import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentSubmissionsTable = pgTable("student_submissions", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  email: text("email"),
  name: text("name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  passportNumber: text("passport_number").notNull(),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  interviewZoomLink: text("interview_zoom_link"),
  interviewDateTime: text("interview_date_time"),
  uniInterviewLink: text("uni_interview_link"),
  uniInterviewDateTime: text("uni_interview_date_time"),
  uniInterviewPlatform: text("uni_interview_platform"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const studentDocumentsTable = pgTable("student_documents", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => studentSubmissionsTable.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStudentSubmissionSchema = createInsertSchema(studentSubmissionsTable).omit({
  id: true, createdAt: true, updatedAt: true, status: true, adminNotes: true,
});
export const insertStudentDocumentSchema = createInsertSchema(studentDocumentsTable).omit({
  id: true, uploadedAt: true,
});

export type InsertStudentSubmission = z.infer<typeof insertStudentSubmissionSchema>;
export type StudentSubmission = typeof studentSubmissionsTable.$inferSelect;
export type InsertStudentDocument = z.infer<typeof insertStudentDocumentSchema>;
export type StudentDocument = typeof studentDocumentsTable.$inferSelect;
