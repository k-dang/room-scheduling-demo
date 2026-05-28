import "server-only";
import { cacheTag } from "next/cache";
import { sql } from "@/db";
import type { StrategyId } from "./strategies/types";

export interface Room {
  id: number;
  name: string;
  timezone: string;
}

export interface Doctor {
  id: number;
  name: string;
  color: string;
}

export interface BookingRow {
  id: string;
  roomId: number;
  doctorId: number;
  startsAt: string;
  endsAt: string;
  strategy: string;
}

export interface RunRow {
  id: number;
  strategy: StrategyId;
  roomId: number;
  startsAt: string;
  endsAt: string;
  concurrency: number;
  succeeded: number;
  conflicted: number;
  errored: number;
  totalMs: number;
  p50Ms: number;
  p99Ms: number;
  maxMs: number;
  totalRetries: number;
  persistedOnSlot: number;
  createdAt: string;
}

export interface ScheduleState {
  rooms: Room[];
  doctors: Doctor[];
  bookings: BookingRow[];
  bookingsExcl: BookingRow[];
  runs: RunRow[];
}

export const SCHEDULE_TAG = "schedule";

const toIso = (v: unknown): string =>
  v instanceof Date ? v.toISOString() : new Date(v as string).toISOString();

export async function getSchedule(): Promise<ScheduleState> {
  "use cache";
  cacheTag(SCHEDULE_TAG);

  const [rooms, doctors, bookings, bookingsExcl, runs] = await Promise.all([
    sql`SELECT id, name, timezone FROM room_scheduling.rooms ORDER BY id`,
    sql`SELECT id, name, color FROM room_scheduling.doctors ORDER BY id`,
    sql`SELECT id, room_id, doctor_id, starts_at, ends_at, strategy FROM room_scheduling.bookings ORDER BY id DESC LIMIT 1000`,
    sql`SELECT id, room_id, doctor_id, lower(during) AS starts_at, upper(during) AS ends_at, strategy FROM room_scheduling.bookings_excl ORDER BY id DESC LIMIT 1000`,
    sql`SELECT * FROM room_scheduling.runs ORDER BY id DESC LIMIT 30`,
  ]);

  return {
    rooms: rooms.map((r) => ({
      id: r.id as number,
      name: r.name as string,
      timezone: r.timezone as string,
    })),
    doctors: doctors.map((d) => ({
      id: d.id as number,
      name: d.name as string,
      color: d.color as string,
    })),
    bookings: bookings.map((b) => ({
      id: `b${b.id}`,
      roomId: b.room_id as number,
      doctorId: b.doctor_id as number,
      startsAt: toIso(b.starts_at),
      endsAt: toIso(b.ends_at),
      strategy: b.strategy as string,
    })),
    bookingsExcl: bookingsExcl.map((b) => ({
      id: `e${b.id}`,
      roomId: b.room_id as number,
      doctorId: b.doctor_id as number,
      startsAt: toIso(b.starts_at),
      endsAt: toIso(b.ends_at),
      strategy: b.strategy as string,
    })),
    runs: runs.map((r) => ({
      id: r.id as number,
      strategy: r.strategy as StrategyId,
      roomId: r.room_id as number,
      startsAt: toIso(r.starts_at),
      endsAt: toIso(r.ends_at),
      concurrency: r.concurrency as number,
      succeeded: r.succeeded as number,
      conflicted: r.conflicted as number,
      errored: r.errored as number,
      totalMs: r.total_ms as number,
      p50Ms: r.p50_ms as number,
      p99Ms: r.p99_ms as number,
      maxMs: r.max_ms as number,
      totalRetries: r.total_retries as number,
      persistedOnSlot: r.persisted_on_slot as number,
      createdAt: toIso(r.created_at),
    })),
  };
}
