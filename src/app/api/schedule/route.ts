import { NextResponse } from "next/server";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [rooms, doctors, bookings, bookingsExcl, runs] = await Promise.all([
    sql`SELECT id, name FROM room_scheduling.rooms ORDER BY id`,
    sql`SELECT id, name, color FROM room_scheduling.doctors ORDER BY id`,
    sql`SELECT id, room_id, doctor_id, starts_at, ends_at, strategy FROM room_scheduling.bookings ORDER BY id DESC LIMIT 1000`,
    sql`SELECT id, room_id, doctor_id, lower(during) AS starts_at, upper(during) AS ends_at, strategy FROM room_scheduling.bookings_excl ORDER BY id DESC LIMIT 1000`,
    sql`SELECT * FROM room_scheduling.runs ORDER BY id DESC LIMIT 30`,
  ]);

  const toIso = (v: unknown): string =>
    v instanceof Date ? v.toISOString() : new Date(v as string).toISOString();

  return NextResponse.json({
    rooms,
    doctors,
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
      id: r.id,
      strategy: r.strategy,
      roomId: r.room_id,
      startsAt: toIso(r.starts_at),
      endsAt: toIso(r.ends_at),
      concurrency: r.concurrency,
      succeeded: r.succeeded,
      conflicted: r.conflicted,
      errored: r.errored,
      totalMs: r.total_ms,
      p50Ms: r.p50_ms,
      p99Ms: r.p99_ms,
      maxMs: r.max_ms,
      totalRetries: r.total_retries,
      persistedOnSlot: r.persisted_on_slot,
      createdAt: toIso(r.created_at),
    })),
  });
}
