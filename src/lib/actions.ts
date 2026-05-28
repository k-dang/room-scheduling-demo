"use server";

import { updateTag } from "next/cache";
import { sql } from "@/db";
import { SCHEDULE_TAG } from "./data";
import { strategies } from "./strategies";
import type { StrategyId } from "./strategies/types";
import { SLOTS_PER_DAY, slotEnd, slotStart, todayBase } from "./time";

export interface BookSlotInput {
  roomId: number;
  doctorId: number;
  slotIndex: number;
}

export type BookSlotResult =
  | {
      ok: true;
      booking: {
        id: string;
        roomId: number;
        doctorId: number;
        startsAt: string;
        endsAt: string;
        strategy: string;
      };
    }
  | { ok: false; error: string };

export async function bookSlot(input: BookSlotInput): Promise<BookSlotResult> {
  const { roomId, doctorId, slotIndex } = input;
  if (!roomId || !doctorId || slotIndex == null) {
    return { ok: false, error: "Missing required fields" };
  }
  if (slotIndex < 0 || slotIndex >= SLOTS_PER_DAY) {
    return { ok: false, error: "Invalid slot index" };
  }

  const [room] = (await sql`
    SELECT timezone FROM room_scheduling.rooms WHERE id = ${roomId}
  `) as { timezone: string }[];
  if (!room) return { ok: false, error: "Unknown room" };

  // The slot's wall-clock window is anchored to the room's timezone — never the
  // server's. Stored as UTC; only the venue's tz determines what "08:00" means.
  const base = todayBase(room.timezone);
  const startsAt = slotStart(slotIndex, base).toISOString();
  const endsAt = slotEnd(slotIndex, base).toISOString();

  try {
    const [row] = await sql`
      INSERT INTO room_scheduling.bookings_excl (room_id, doctor_id, during, strategy)
      VALUES (
        ${roomId},
        ${doctorId},
        tstzrange(${startsAt}::timestamptz, ${endsAt}::timestamptz, '[)'),
        'exclude'
      )
      RETURNING id, room_id, doctor_id, lower(during) AS starts_at, upper(during) AS ends_at, strategy
    `;

    updateTag(SCHEDULE_TAG);

    return {
      ok: true,
      booking: {
        id: `e${row.id}`,
        roomId: row.room_id as number,
        doctorId: row.doctor_id as number,
        startsAt: new Date(row.starts_at as string).toISOString(),
        endsAt: new Date(row.ends_at as string).toISOString(),
        strategy: row.strategy as string,
      },
    };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23P01") {
      return {
        ok: false,
        error: "This time slot is already booked for this room.",
      };
    }
    console.error("Booking error:", e);
    return { ok: false, error: "Failed to create booking" };
  }
}

export interface RunStressInput {
  strategy: StrategyId;
  roomId: number;
  startsAt: string;
  endsAt: string;
  concurrency: number;
}

export interface StressResult {
  strategy: StrategyId;
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
  results: {
    status: string;
    reason?: string;
    retries: number;
    latencyMs: number;
    doctorId: number;
  }[];
}

export async function runStress(
  input: RunStressInput,
): Promise<StressResult | { error: string }> {
  const strategyFn = strategies[input.strategy];
  if (!strategyFn) return { error: `unknown strategy: ${input.strategy}` };

  const concurrency = Math.min(Math.max(1, input.concurrency | 0), 100);

  const doctors = (await sql`SELECT id FROM room_scheduling.doctors ORDER BY id`) as {
    id: number;
  }[];
  if (doctors.length === 0) {
    return { error: "no doctors seeded — run bun db:init" };
  }

  const startsAt = new Date(input.startsAt).toISOString();
  const endsAt = new Date(input.endsAt).toISOString();

  // Pre-warm `concurrency` connections so every parallel caller starts the race
  // at the same starting line, instead of finishing staggered as the pool spins up.
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      const cx = await sql.reserve();
      try {
        await cx`SELECT 1`;
      } finally {
        cx.release();
      }
    }),
  );

  const t0 = Date.now();
  const results = await Promise.all(
    Array.from({ length: concurrency }, (_, i) =>
      strategyFn({
        roomId: input.roomId,
        doctorId: doctors[i % doctors.length].id,
        startsAt,
        endsAt,
      }),
    ),
  );
  const totalMs = Date.now() - t0;

  const succeeded = results.filter((r) => r.status === "booked").length;
  const conflicted = results.filter((r) => r.status === "conflict").length;
  const errored = results.filter((r) => r.status === "error").length;
  const totalRetries = results.reduce((acc, r) => acc + r.retries, 0);

  const sortedLatencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const pick = (p: number) =>
    sortedLatencies[
      Math.min(
        sortedLatencies.length - 1,
        Math.floor((sortedLatencies.length - 1) * p),
      )
    ] ?? 0;
  const p50 = pick(0.5);
  const p99 = pick(0.99);
  const maxMs = sortedLatencies[sortedLatencies.length - 1] ?? 0;

  let persistedOnSlot: number;
  if (input.strategy === "exclude") {
    const row = (await sql`
      SELECT count(*)::int AS c FROM room_scheduling.bookings_excl
      WHERE room_id = ${input.roomId}
        AND during && tstzrange(${startsAt}::timestamptz, ${endsAt}::timestamptz, '[)')
    `) as { c: number }[];
    persistedOnSlot = row[0].c;
  } else {
    const row = (await sql`
      SELECT count(*)::int AS c FROM room_scheduling.bookings
      WHERE room_id = ${input.roomId}
        AND strategy = ${input.strategy}
        AND starts_at < ${endsAt}::timestamptz
        AND ends_at > ${startsAt}::timestamptz
    `) as { c: number }[];
    persistedOnSlot = row[0].c;
  }

  await sql`
    INSERT INTO room_scheduling.runs (strategy, room_id, starts_at, ends_at, concurrency, succeeded, conflicted, errored, total_ms, p50_ms, p99_ms, max_ms, total_retries, persisted_on_slot)
    VALUES (${input.strategy}, ${input.roomId}, ${startsAt}::timestamptz, ${endsAt}::timestamptz, ${concurrency}, ${succeeded}, ${conflicted}, ${errored}, ${totalMs}, ${p50}, ${p99}, ${maxMs}, ${totalRetries}, ${persistedOnSlot})
  `;

  updateTag(SCHEDULE_TAG);

  return {
    strategy: input.strategy,
    concurrency,
    succeeded,
    conflicted,
    errored,
    totalMs,
    p50Ms: p50,
    p99Ms: p99,
    maxMs,
    totalRetries,
    persistedOnSlot,
    results: results.map((r, i) => ({
      ...r,
      doctorId: doctors[i % doctors.length].id,
    })),
  };
}

export async function resetAll(): Promise<{ ok: true }> {
  await sql`TRUNCATE room_scheduling.bookings, room_scheduling.bookings_excl, room_scheduling.runs RESTART IDENTITY`;
  updateTag(SCHEDULE_TAG);
  return { ok: true };
}
