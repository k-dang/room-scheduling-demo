"use client";

import { useMemo } from "react";
import type { Room, Doctor, BookingRow } from "@/lib/client";
import { formatSlotLabel, slotIndexOf, SLOTS_PER_DAY, todayBase } from "@/lib/time";

interface Props {
  rooms: Room[];
  doctors: Doctor[];
  bookings: BookingRow[];
  selectedSlot: { roomId: number; slotIndex: number } | null;
  onSlotClick: (roomId: number, slotIndex: number) => void;
}

export function BookingCalendar({ rooms, doctors, bookings, selectedSlot, onSlotClick }: Props) {
  const doctorMap = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);
  const base = useMemo(() => todayBase(), []);

  const bookingMap = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of bookings) {
      const si = slotIndexOf(b.startsAt, base);
      if (si < 0 || si >= SLOTS_PER_DAY) continue;
      const key = `${b.roomId}:${si}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [bookings, base]);

  const slots = useMemo(() => Array.from({ length: SLOTS_PER_DAY }, (_, i) => i), []);

  const isHour = (si: number) => si % 2 === 0;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: 72,
                  padding: "16px 12px 16px 16px",
                  background: "#FAFAF8",
                  borderBottom: "2px solid #E5E7EB",
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                }}
              />
              {rooms.map((room) => (
                <th
                  key={room.id}
                  style={{
                    padding: "16px 12px",
                    background: "#FAFAF8",
                    borderBottom: "2px solid #E5E7EB",
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#374151",
                    letterSpacing: "-0.01em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "#F3F4F6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: "#6B7280",
                        fontWeight: 600,
                      }}
                    >
                      {room.id}
                    </span>
                    <span>{room.name.replace("Exam Room", "Exam")}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((si) => {
              const showHourMark = isHour(si);
              return (
                <tr
                  key={si}
                  style={{
                    borderTop: showHourMark
                      ? "1px solid #E5E7EB"
                      : "1px solid #F3F4F6",
                  }}
                >
                  <td
                    style={{
                      width: 72,
                      padding: "0 12px 0 16px",
                      verticalAlign: "middle",
                      height: 52,
                      background: "#FAFAF8",
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      borderRight: "2px solid #E5E7EB",
                    }}
                  >
                    <span
                      style={{
                        fontSize: showHourMark ? 12 : 11,
                        fontWeight: showHourMark ? 600 : 400,
                        color: showHourMark ? "#6B7280" : "#D1D5DB",
                        display: "block",
                        textAlign: "right",
                        letterSpacing: "-0.01em",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatSlotLabel(si, base)}
                    </span>
                  </td>
                  {rooms.map((room) => {
                    const key = `${room.id}:${si}`;
                    const cellBookings = bookingMap.get(key) ?? [];
                    const isBooked = cellBookings.length > 0;
                    const isSelected =
                      selectedSlot?.roomId === room.id &&
                      selectedSlot?.slotIndex === si;
                    const doctor = isBooked
                      ? doctorMap.get(cellBookings[0].doctorId)
                      : undefined;

                    return (
                      <td
                        key={room.id}
                        style={{ padding: "4px 6px", verticalAlign: "middle" }}
                      >
                        {isBooked && doctor ? (
                          <BookedCell doctor={doctor} />
                        ) : (
                          <AvailableCell
                            selected={isSelected}
                            onClick={() => onSlotClick(room.id, si)}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookedCell({ doctor }: { doctor: Doctor }) {
  const bg = hexToRgba(doctor.color, 0.1);
  const border = hexToRgba(doctor.color, 0.25);
  const initials = doctor.name
    .split(" ")
    .filter((p) => p !== "Dr.")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      style={{
        height: 44,
        borderRadius: 8,
        background: bg,
        border: `1.5px solid ${border}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 10px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: doctor.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.01em",
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: darkenHex(doctor.color),
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {doctor.name.replace("Dr. ", "")}
      </span>
    </div>
  );
}

function AvailableCell({
  selected,
  onClick,
}: {
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="calendar-slot-btn"
      style={{
        width: "100%",
        height: 44,
        borderRadius: 8,
        background: selected ? "#CCFBF1" : "transparent",
        border: selected ? "2px solid #0F766E" : "2px solid transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: selected ? "#0F766E" : "transparent",
        transition: "all 0.12s ease",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          const el = e.currentTarget;
          el.style.background = "#F0FDFA";
          el.style.borderColor = "#5EEAD4";
          el.style.color = "#0D9488";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          const el = e.currentTarget;
          el.style.background = "transparent";
          el.style.borderColor = "transparent";
          el.style.color = "transparent";
        }
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return `rgba(100,100,100,${alpha})`;
  return `rgba(${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)},${alpha})`;
}

function darkenHex(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return "#111827";
  return `rgb(${Math.round(parseInt(r[1], 16) * 0.65)},${Math.round(parseInt(r[2], 16) * 0.65)},${Math.round(parseInt(r[3], 16) * 0.65)})`;
}
