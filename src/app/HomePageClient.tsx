"use client";

import { useState, useMemo } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { BookingCalendar } from "@/components/BookingCalendar";
import { BookingPanel } from "@/components/BookingPanel";
import type { ScheduleState } from "@/lib/data";
import { SLOTS_PER_DAY, slotIndexOf, todayBase, tzAbbreviation } from "@/lib/time";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export function HomePageClient({ state }: { state: ScheduleState }) {
  const [selectedSlot, setSelectedSlot] = useState<{
    roomId: number;
    slotIndex: number;
  } | null>(null);

  // Each room defines its own "today" because its timezone differs. Pre-compute
  // a base instant per room so the calendar can filter bookings against the
  // right wall-clock day.
  const roomBases = useMemo(
    () => new Map(state.rooms.map((r) => [r.id, todayBase(r.timezone)] as const)),
    [state.rooms],
  );

  const stats = useMemo(() => {
    const totalSlots = state.rooms.length * SLOTS_PER_DAY;
    const bookedSet = new Set<string>();
    for (const b of state.bookingsExcl) {
      const base = roomBases.get(b.roomId);
      if (!base) continue;
      const si = slotIndexOf(b.startsAt, base);
      if (si < 0 || si >= SLOTS_PER_DAY) continue;
      bookedSet.add(`${b.roomId}:${si}`);
    }
    return {
      total: totalSlots,
      booked: bookedSet.size,
      available: totalSlots - bookedSet.size,
    };
  }, [state, roomBases]);

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const tzSummary = useMemo(() => {
    const zones = [...new Set(state.rooms.map((r) => r.timezone))];
    return zones.map((z) => ({ zone: z, abbr: tzAbbreviation(z) }));
  }, [state.rooms]);

  return (
    <div
      className={jakarta.className}
      style={{ minHeight: "100vh", background: "#F8F7F5" }}
    >
      {/* Top nav */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #E5E7EB",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: 1160,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 60,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                background: "linear-gradient(135deg, #0D9488 0%, #0F766E 100%)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: 17,
                color: "#111827",
                letterSpacing: "-0.03em",
              }}
            >
              ClearCare
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#0D9488",
                background: "#F0FDFA",
                border: "1px solid #99F6E4",
                borderRadius: 20,
                padding: "3px 10px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Demo
            </span>
            <Link
              href="/concurrency"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#0D9488",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "#F0FDFA",
                border: "1px solid #99F6E4",
                borderRadius: 8,
                padding: "6px 12px",
              }}
            >
              Concurrency Showcase
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Showcase banner */}
      <div
        style={{
          background: "linear-gradient(90deg, #F0FDFA 0%, #ECFDF5 100%)",
          borderBottom: "1px solid #A7F3D0",
        }}
      >
        <div
          style={{
            maxWidth: 1160,
            margin: "0 auto",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: "#065F46",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0D9488"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            <strong>This is a showcase app</strong> demonstrating optimistic concurrency control — book a slot, then visit the{" "}
            <Link
              href="/concurrency"
              style={{ color: "#0D9488", fontWeight: 600, textDecoration: "underline" }}
            >
              Concurrency Showcase
            </Link>{" "}
            to see how double-booking conflicts are detected and resolved.
          </span>
        </div>
      </div>

      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "36px 24px" }}>
        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 28,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#0D9488",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Room Availability
            </p>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "#111827",
                letterSpacing: "-0.04em",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {dateLabel}
            </h1>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <StatPill
              value={stats.available}
              label="available"
              color="#059669"
              bg="#ECFDF5"
              border="#A7F3D0"
            />
            <StatPill
              value={stats.booked}
              label="booked"
              color="#6B7280"
              bg="#F9FAFB"
              border="#E5E7EB"
            />
            <StatPill
              value={state.rooms.length}
              label="rooms"
              color="#2563EB"
              bg="#EFF6FF"
              border="#BFDBFE"
            />
          </div>
        </div>

        {tzSummary.length > 0 && <TimezoneStrip zones={tzSummary} />}
        <BookingCalendar
          rooms={state.rooms}
          doctors={state.doctors}
          bookings={state.bookingsExcl}
          selectedSlot={selectedSlot}
          onSlotClick={(roomId, slotIndex) =>
            setSelectedSlot((cur) =>
              cur?.roomId === roomId && cur?.slotIndex === slotIndex
                ? null
                : { roomId, slotIndex },
            )
          }
        />
        <CalendarLegend />
      </main>

      {selectedSlot && (
        <BookingPanel
          rooms={state.rooms}
          doctors={state.doctors}
          selectedSlot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onBooked={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
}

function StatPill({
  value,
  label,
  color,
  bg,
  border,
}: {
  value: number;
  label: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: "10px 16px",
        minWidth: 72,
      }}
    >
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          color,
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "#9CA3AF",
          marginTop: 3,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function CalendarLegend() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        marginTop: 14,
        paddingLeft: 4,
      }}
    >
      <LegendItem color="#5EEAD4" bg="#F0FDFA" label="Available — click to book" />
      <LegendItem color="#9CA3AF" bg="#F3F4F6" label="Booked" />
    </div>
  );
}

function TimezoneStrip({
  zones,
}: {
  zones: { zone: string; abbr: string }[];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
        padding: "10px 14px",
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 10,
        fontSize: 12,
        color: "#374151",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0D9488"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span style={{ fontWeight: 600, color: "#0F766E" }}>
        Times shown in each clinic&apos;s local timezone
      </span>
      <span style={{ color: "#9CA3AF" }}>·</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {zones.map((z) => (
          <span
            key={z.zone}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "#F0FDFA",
              border: "1px solid #CCFBF1",
              borderRadius: 6,
              padding: "2px 8px",
              fontFamily: "ui-monospace, monospace",
              fontSize: 11,
              color: "#0F766E",
            }}
          >
            <strong style={{ fontWeight: 700 }}>{z.abbr}</strong>
            <span style={{ color: "#0D9488", opacity: 0.8 }}>{z.zone}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function LegendItem({
  color,
  bg,
  label,
}: {
  color: string;
  bg: string;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "#6B7280",
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          background: bg,
          border: `1.5px solid ${color}`,
        }}
      />
      {label}
    </div>
  );
}
