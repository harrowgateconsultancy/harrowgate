import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const onArrivalApplicationsTable = pgTable("on_arrival_applications", {
  id: serial("id").primaryKey(),
  formData: jsonb("form_data").notNull(),
  passportPath: text("passport_path"),
  photoPath: text("photo_path"),
  hotelPath: text("hotel_path"),
  businessPath: text("business_path"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type OnArrivalApplication = typeof onArrivalApplicationsTable.$inferSelect;
