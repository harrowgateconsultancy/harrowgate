import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const staffAccountsTable = pgTable("staff_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  email: text("email"),
  role: text("role").notNull().default("staff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
