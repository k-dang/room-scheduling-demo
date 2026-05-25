import {
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const roomScheduling = pgSchema("room_scheduling");

export const rooms = roomScheduling.table("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const doctors = roomScheduling.table("doctors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
});

export const bookings = roomScheduling.table("bookings", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  strategy: text("strategy").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
