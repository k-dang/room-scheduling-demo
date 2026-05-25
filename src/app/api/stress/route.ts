import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/db";
import { strategies } from "@/lib/strategies";
import type { StrategyId } from "@/lib/strategies/types";

interface StressBody {
  strategy: StrategyId;
  roomId: number;
  startsAt: string;
  endsAt: string;
  concurrency: number;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as StressBody;
  const strategyFn = strategies[body.strategy];
  if (!strategyFn) {
    return NextResponse.json(
      { error: `unknown strategy: ${body.strategy}` },
      { status: 400 },
    );
  }
  const concurrency = Math.min(Math.max(1, body.concurrency | 0), 100);

  const doctors = (await sql`SELECT id FROM room_scheduling.doctors ORDER BY id`) as {
    id: number;
  }[];
  if (doctors.length === 0) {
    return NextResponse.json(
      { error: "no doctors seeded — run bun db:init" },
      { status: 500 },
    );
  }

  const startsAt = new Date(body.startsAt).toISOString();
  const endsAt = new Date(body.endsAt).toISOString();

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
        roomId: body.roomId,
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
  if (body.strategy === "exclude") {
    const row = (await sql`
      SELECT count(*)::int AS c FROM room_scheduling.bookings_excl
      WHERE room_id = ${body.roomId}
        AND during && tstzrange(${startsAt}::timestamptz, ${endsAt}::timestamptz, '[)')
    `) as { c: number }[];
    persistedOnSlot = row[0].c;
  } else {
    const row = (await sql`
      SELECT count(*)::int AS c FROM room_scheduling.bookings
      WHERE room_id = ${body.roomId}
        AND strategy = ${body.strategy}
        AND starts_at < ${endsAt}::timestamptz
        AND ends_at > ${startsAt}::timestamptz
    `) as { c: number }[];
    persistedOnSlot = row[0].c;
  }

  await sql`
    INSERT INTO room_scheduling.runs (strategy, room_id, starts_at, ends_at, concurrency, succeeded, conflicted, errored, total_ms, p50_ms, p99_ms, max_ms, total_retries, persisted_on_slot)
    VALUES (${body.strategy}, ${body.roomId}, ${startsAt}::timestamptz, ${endsAt}::timestamptz, ${concurrency}, ${succeeded}, ${conflicted}, ${errored}, ${totalMs}, ${p50}, ${p99}, ${maxMs}, ${totalRetries}, ${persistedOnSlot})
  `;

  return NextResponse.json({
    strategy: body.strategy,
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
  });
}
