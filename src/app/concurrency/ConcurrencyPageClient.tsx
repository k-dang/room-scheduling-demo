"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { RaceControl } from "@/components/RaceControl";
import { RunHistory } from "@/components/RunHistory";
import { Schedule } from "@/components/Schedule";
import { resetAll, runStress, type StressResult } from "@/lib/actions";
import type { ScheduleState } from "@/lib/data";
import type { StrategyId } from "@/lib/strategies/types";
import { slotEnd, slotStart, todayBase } from "@/lib/time";

export function ConcurrencyPageClient({ state }: { state: ScheduleState }) {
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    roomId: number;
    slotIndex: number;
  } | null>(null);
  const [strategy, setStrategy] = useState<StrategyId>("naive");
  const [concurrency, setConcurrency] = useState(10);
  const [running, startRunning] = useTransition();
  const [resetting, startResetting] = useTransition();
  const [lastResult, setLastResult] = useState<StressResult | null>(null);

  const roomById = useMemo(
    () => new Map(state.rooms.map((r) => [r.id, r] as const)),
    [state.rooms],
  );

  const onRun = () => {
    if (!selected) return;
    const room = roomById.get(selected.roomId);
    if (!room) return;
    setError(null);
    // Stress race targets the selected slot in the room's own timezone — the
    // same wall-clock window that real bookings would land on.
    const base = todayBase(room.timezone);
    const input = {
      strategy,
      roomId: selected.roomId,
      startsAt: slotStart(selected.slotIndex, base).toISOString(),
      endsAt: slotEnd(selected.slotIndex, base).toISOString(),
      concurrency,
    };
    startRunning(async () => {
      const res = await runStress(input);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setLastResult(res);
    });
  };

  const onReset = () => {
    setError(null);
    startResetting(async () => {
      await resetAll();
      setLastResult(null);
    });
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <header className="flex items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Room scheduling — concurrency showcase
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Fan out N concurrent booking requests at the same room+slot under
            different DB strategies. Watch the naive ones double-book and the
            safe ones hold the line.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            ← Book a Room
          </Link>
          <button
            type="button"
            onClick={onReset}
            disabled={resetting}
            className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50"
          >
            {resetting ? "Resetting…" : "Reset all"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Schedule
        </h2>
        <Schedule
          rooms={state.rooms}
          doctors={state.doctors}
          bookings={[...state.bookings, ...state.bookingsExcl]}
          selected={selected}
          onSelect={(roomId, slotIndex) =>
            setSelected((cur) =>
              cur && cur.roomId === roomId && cur.slotIndex === slotIndex
                ? null
                : { roomId, slotIndex },
            )
          }
        />
        <Legend />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Race control
        </h2>
        <RaceControl
          strategy={strategy}
          setStrategy={setStrategy}
          concurrency={concurrency}
          setConcurrency={setConcurrency}
          selected={selected}
          roomById={roomById}
          running={running}
          onRun={onRun}
        />
        {lastResult && <LastResultStrip result={lastResult} />}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Run history
        </h2>
        <RunHistory runs={state.runs} rooms={state.rooms} />
      </section>
    </main>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 dark:bg-emerald-950/40" />
        booked
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-rose-100 dark:bg-rose-950/40" />
        over-booked
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm ring-2 ring-indigo-500" />
        targeted
      </span>
    </div>
  );
}

function LastResultStrip({ result }: { result: StressResult }) {
  const overbooked = result.persistedOnSlot > 1;
  return (
    <div
      className={[
        "rounded-md border px-4 py-3 text-sm",
        overbooked
          ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30"
          : "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
      ].join(" ")}
    >
      <div className="font-medium">
        {overbooked
          ? `Over-booked — ${result.persistedOnSlot} bookings persisted on the same slot.`
          : `Held the line — ${result.persistedOnSlot} booking persisted on the slot.`}
      </div>
      <div className="mt-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
        booked: {result.succeeded} · conflict: {result.conflicted} · err:{" "}
        {result.errored} · p50 {result.p50Ms}ms / p99 {result.p99Ms}ms ·
        retries: {result.totalRetries} · wall {result.totalMs}ms
      </div>
    </div>
  );
}
