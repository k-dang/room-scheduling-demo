"use client";

import type { Room, RunRow } from "@/lib/client";
import { STRATEGY_BY_ID } from "@/lib/strategies/descriptions";
import { formatInZone } from "@/lib/time";

interface Props {
  runs: RunRow[];
  rooms: Room[];
}

export function RunHistory({ runs, rooms }: Props) {
  const roomById = new Map(rooms.map((r) => [r.id, r] as const));

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-sm text-zinc-500">
        No races yet. Pick a strategy and a slot, then hit Race.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-left">
            <Th>Strategy</Th>
            <Th>Slot</Th>
            <Th align="right">N</Th>
            <Th align="right">Booked</Th>
            <Th align="right">Conflict</Th>
            <Th align="right">Err</Th>
            <Th align="right">p50</Th>
            <Th align="right">p99</Th>
            <Th align="right">max</Th>
            <Th align="right">Retries</Th>
            <Th align="right">Persisted</Th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const meta = STRATEGY_BY_ID[r.strategy];
            const overbooked = r.persistedOnSlot > 1;
            const room = roomById.get(r.roomId);
            const tz = room?.timezone ?? "UTC";
            return (
              <tr
                key={r.id}
                className="border-t border-zinc-100 dark:border-zinc-900"
              >
                <Td>
                  <div className="flex items-center gap-1.5 font-medium">
                    {meta?.recommended && (
                      <span
                        className="text-amber-500"
                        title="Recommended"
                        aria-label="Recommended"
                      >
                        ★
                      </span>
                    )}
                    {meta?.title ?? r.strategy}
                  </div>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-zinc-500">
                    {room?.name ?? `room ${r.roomId}`} @{" "}
                    {formatInZone(r.startsAt, tz, "HH:mm zzz")}
                  </span>
                </Td>
                <Td align="right" mono>
                  {r.concurrency}
                </Td>
                <Td align="right" mono>
                  {r.succeeded}
                </Td>
                <Td align="right" mono>
                  {r.conflicted}
                </Td>
                <Td align="right" mono>
                  {r.errored}
                </Td>
                <Td align="right" mono>
                  {r.p50Ms}ms
                </Td>
                <Td align="right" mono>
                  {r.p99Ms}ms
                </Td>
                <Td align="right" mono>
                  {r.maxMs}ms
                </Td>
                <Td align="right" mono>
                  {r.totalRetries}
                </Td>
                <Td align="right">
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs",
                      overbooked
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                        : r.persistedOnSlot === 1
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
                    ].join(" ")}
                  >
                    {overbooked ? `×${r.persistedOnSlot}` : r.persistedOnSlot}
                  </span>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={[
        "px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  mono = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={[
        "px-3 py-2",
        align === "right" ? "text-right" : "text-left",
        mono ? "font-mono text-xs" : "",
      ].join(" ")}
    >
      {children}
    </td>
  );
}
