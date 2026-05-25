"use client";

import { STRATEGIES, STRATEGY_BY_ID } from "@/lib/strategies/descriptions";
import type { StrategyId } from "@/lib/strategies/types";
import { formatSlotLabel } from "@/lib/time";

interface Props {
  strategy: StrategyId;
  setStrategy(s: StrategyId): void;
  concurrency: number;
  setConcurrency(c: number): void;
  selected: { roomId: number; slotIndex: number } | null;
  roomNameById: Map<number, string>;
  running: boolean;
  onRun(): void;
}

const expectationStyles: Record<string, string> = {
  broken: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  "safe-locking":
    "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  "safe-retry":
    "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  "safe-declarative":
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
};

const expectationLabels: Record<string, string> = {
  broken: "races — will over-book",
  "safe-locking": "safe via locking",
  "safe-retry": "safe via retry",
  "safe-declarative": "safe via constraint",
};

export function RaceControl({
  strategy,
  setStrategy,
  concurrency,
  setConcurrency,
  selected,
  roomNameById,
  running,
  onRun,
}: Props) {
  const meta = STRATEGY_BY_ID[strategy];
  const canRun = !!selected && !running;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div>
          <div className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Strategy
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStrategy(s.id)}
                className={[
                  "relative rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                  strategy === s.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                    : s.recommended
                      ? "border-amber-300 hover:border-amber-400 dark:border-amber-700/60 dark:hover:border-amber-600"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
                ].join(" ")}
              >
                {s.recommended && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] leading-none text-amber-950 shadow-sm ring-2 ring-white dark:ring-black"
                    title="Recommended"
                    aria-label="Recommended"
                  >
                    ★
                  </span>
                )}
                <div className="font-medium">{s.title}</div>
                <div
                  className={[
                    "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
                    expectationStyles[s.expectation],
                  ].join(" ")}
                >
                  {expectationLabels[s.expectation]}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="conc"
            className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            <span>Concurrency</span>
            <span className="font-mono text-sm normal-case text-zinc-900 dark:text-zinc-100">
              {concurrency}
            </span>
          </label>
          <input
            id="conc"
            type="range"
            min={2}
            max={50}
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        <div>
          <div className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Target slot
          </div>
          {selected ? (
            <div className="rounded-md bg-zinc-100 dark:bg-zinc-900 px-3 py-2 font-mono text-sm">
              {roomNameById.get(selected.roomId)} @{" "}
              {formatSlotLabel(selected.slotIndex)}–
              {formatSlotLabel(selected.slotIndex + 1)}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-500">
              Click a cell in the schedule above
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!canRun}
          onClick={onRun}
          className={[
            "w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-colors",
            canRun
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed",
          ].join(" ")}
        >
          {running
            ? `Running ${concurrency} concurrent bookings…`
            : `Race ${concurrency} bookings`}
        </button>
      </div>

      <div
        className={[
          "rounded-lg border p-4",
          meta.recommended
            ? "border-amber-300 dark:border-amber-700/60"
            : "border-zinc-200 dark:border-zinc-800",
        ].join(" ")}
      >
        <div className="mb-1 flex items-center gap-2">
          {meta.recommended && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] leading-none text-amber-950"
              title="Recommended"
              aria-label="Recommended"
            >
              ★
            </span>
          )}
          <h3 className="font-semibold">{meta.title}</h3>
          <span
            className={[
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              expectationStyles[meta.expectation],
            ].join(" ")}
          >
            {expectationLabels[meta.expectation]}
          </span>
        </div>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          {meta.blurb}
        </p>
        {meta.recommended && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
            <span className="font-semibold">Why this is the idiomatic pick: </span>
            {meta.recommended.reason}
          </div>
        )}
        {meta.deepDive && (
          <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/50">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              How it works
            </div>
            <ul className="space-y-1.5">
              {meta.deepDive.map((point) => (
                <li key={point} className="flex gap-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <span className="mt-0.5 shrink-0 text-zinc-400">›</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}
        <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-100">
          <code>{meta.sql}</code>
        </pre>
      </div>
    </div>
  );
}
