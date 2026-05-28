"use client";

import { useMemo } from "react";
import type { BookingRow, Doctor, Room } from "@/lib/data";
import { SLOTS_PER_DAY, formatSlotLabel, slotEnd, slotStart, todayBase } from "@/lib/time";

interface Cell {
  roomId: number;
  slotIndex: number;
  bookings: BookingRow[];
}

interface Props {
  rooms: Room[];
  doctors: Doctor[];
  bookings: BookingRow[];
  selected: { roomId: number; slotIndex: number } | null;
  onSelect(roomId: number, slotIndex: number): void;
}

export function Schedule({
  rooms,
  doctors,
  bookings,
  selected,
  onSelect,
}: Props) {
  const doctorById = useMemo(
    () => new Map(doctors.map((d) => [d.id, d])),
    [doctors],
  );

  // Per-room base — each room's "08:00 today" lives in its own timezone.
  const baseByRoom = useMemo(
    () => new Map(rooms.map((r) => [r.id, todayBase(r.timezone)] as const)),
    [rooms],
  );

  const cells = useMemo(() => {
    const grid = new Map<string, Cell>();
    for (const room of rooms) {
      for (let s = 0; s < SLOTS_PER_DAY; s++) {
        grid.set(`${room.id}:${s}`, {
          roomId: room.id,
          slotIndex: s,
          bookings: [],
        });
      }
    }
    for (const b of bookings) {
      const roomBase = baseByRoom.get(b.roomId);
      if (!roomBase) continue;
      const bStart = new Date(b.startsAt).getTime();
      const bEnd = new Date(b.endsAt).getTime();
      for (let s = 0; s < SLOTS_PER_DAY; s++) {
        const sStart = slotStart(s, roomBase).getTime();
        const sEnd = slotEnd(s, roomBase).getTime();
        if (bStart < sEnd && bEnd > sStart && b.roomId) {
          const cell = grid.get(`${b.roomId}:${s}`);
          if (cell) cell.bookings.push(b);
        }
      }
    }
    return grid;
  }, [rooms, bookings, baseByRoom]);

  // Header labels use the first room's tz (concurrency view targets a single
  // room+slot at a time, so a representative axis is fine).
  const firstRoom = rooms[0];
  const headerBase = firstRoom ? baseByRoom.get(firstRoom.id)! : null;
  const headerTz = firstRoom?.timezone;

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-900/50">
            <th className="sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-900/50 border-b border-r border-zinc-200 dark:border-zinc-800 px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
              Room
            </th>
            {Array.from({ length: SLOTS_PER_DAY }).map((_, i) => (
              <th
                key={`slot-h-${i}`}
                className="border-b border-zinc-200 dark:border-zinc-800 px-1 py-2 text-center font-mono text-[11px] text-zinc-500 dark:text-zinc-500 min-w-[52px]"
              >
                {headerBase && headerTz
                  ? formatSlotLabel(i, headerBase, headerTz)
                  : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id}>
              <td className="sticky left-0 z-10 bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 px-3 py-2 font-medium whitespace-nowrap">
                <div className="flex flex-col">
                  <span>{room.name}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {room.timezone.split("/").pop()?.replace(/_/g, " ")}
                  </span>
                </div>
              </td>
              {Array.from({ length: SLOTS_PER_DAY }).map((_, s) => {
                const cell = cells.get(`${room.id}:${s}`);
                const count = cell?.bookings.length ?? 0;
                const isSelected =
                  selected?.roomId === room.id && selected.slotIndex === s;
                const isOverbooked = count > 1;
                return (
                  <td
                    key={`r${room.id}s${s}`}
                    className={[
                      "border-b border-r border-zinc-100 dark:border-zinc-900 p-0 align-middle",
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-inset ring-indigo-500"
                        : isOverbooked
                          ? "bg-rose-50 dark:bg-rose-950/30"
                          : count === 1
                            ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                            : "",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(room.id, s)}
                      className="block w-full h-full px-1 py-2 text-center cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-colors"
                      title={
                        count === 0
                          ? "empty — click to target"
                          : `${count} booking${count === 1 ? "" : "s"}`
                      }
                    >
                      <CellContents
                        bookings={cell?.bookings ?? []}
                        doctorById={doctorById}
                      />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellContents({
  bookings,
  doctorById,
}: {
  bookings: BookingRow[];
  doctorById: Map<number, Doctor>;
}) {
  if (bookings.length === 0) {
    return (
      <span className="inline-block h-5 w-5 rounded-full opacity-0">.</span>
    );
  }
  const shown = bookings.slice(0, 4);
  const extra = bookings.length - shown.length;
  const over = bookings.length > 1;
  return (
    <div className="flex items-center justify-center gap-0.5">
      {shown.map((b) => {
        const d = doctorById.get(b.doctorId);
        return (
          <span
            key={b.id}
            className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white dark:ring-black"
            style={{ background: d?.color ?? "#888" }}
            title={d?.name}
          />
        );
      })}
      <span
        className={[
          "ml-1 font-mono text-[10px]",
          over
            ? "text-rose-600 dark:text-rose-400 font-semibold"
            : "text-zinc-500",
        ].join(" ")}
      >
        {extra > 0
          ? `+${extra}`
          : bookings.length > 1
            ? `×${bookings.length}`
            : ""}
      </span>
    </div>
  );
}
