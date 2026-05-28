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
  timezone: text("timezone").notNull(),
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

export const runs = roomScheduling.table("runs", {
  id: serial("id").primaryKey(),
  strategy: text("strategy").notNull(),
  roomId: integer("room_id").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  concurrency: integer("concurrency").notNull(),
  succeeded: integer("succeeded").notNull(),
  conflicted: integer("conflicted").notNull(),
  errored: integer("errored").notNull(),
  totalMs: integer("total_ms").notNull(),
  p50Ms: integer("p50_ms").notNull(),
  p99Ms: integer("p99_ms").notNull(),
  maxMs: integer("max_ms").notNull(),
  totalRetries: integer("total_retries").notNull(),
  persistedOnSlot: integer("persisted_on_slot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Note: `bookings_excl` is intentionally NOT defined here. It uses TSTZRANGE
// and an EXCLUDE constraint, neither of which Drizzle expresses cleanly. It
// lives in a hand-written migration (drizzle/0001_excl.sql).
