import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const agentsTable = pgTable("agents", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  plainPassword: text("plain_password"),
  companyName: text("company_name").notNull(),
  businessRegUrl: text("business_reg_url"),
  businessRegName: text("business_reg_name"),
  contactName: text("contact_name").notNull(),
  officeAddress: text("office_address").notNull(),
  contactNumber: text("contact_number").notNull(),
  whatsappAvailable: text("whatsapp_available").notNull().default("no"),
  idDocUrl: text("id_doc_url"),
  idDocName: text("id_doc_name"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
