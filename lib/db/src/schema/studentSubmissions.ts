import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
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
  additionalDocsRequested: boolean("additional_docs_requested").default(false),
  additionalDocsRequestNote: text("additional_docs_request_note"),
  immigrationRefNumber: text("immigration_ref_number"),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  termsSignatureUrl: text("terms_signature_url"),
  preferredLevel: text("preferred_level"),
  preferredCourse: text("preferred_course"),
  preferredInstitution: text("preferred_institution"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
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

export const id995aFormsTable = pgTable("id995a_forms", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => studentSubmissionsTable.id, { onDelete: "cascade" }).unique(),
  formData: jsonb("form_data").notNull().$type<Record<string, string>>().default({}),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const studentMessagesTable = pgTable("student_messages", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => studentSubmissionsTable.id, { onDelete: "cascade" }),
  fromAdmin: boolean("from_admin").notNull().default(true),
  subject: text("subject"),
  body: text("body").notNull(),
  attachments: jsonb("attachments").$type<Array<{ fileName: string; fileUrl: string; mimeType?: string }>>().default([]),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const immigrationLettersTable = pgTable("immigration_letters", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => studentSubmissionsTable.id, { onDelete: "cascade" }).unique(),
  courseName: text("course_name"),
  universityName: text("university_name"),
  courseWebsite: text("course_website"),
  letter1: text("letter1"),
  letter2: text("letter2"),
  letter3: text("letter3"),
  letter4: text("letter4"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ImmigrationLetters = typeof immigrationLettersTable.$inferSelect;
export type Id995aForm = typeof id995aFormsTable.$inferSelect;
export type StudentMessage = typeof studentMessagesTable.$inferSelect;

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
