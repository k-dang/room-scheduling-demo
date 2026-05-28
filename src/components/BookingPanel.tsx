"use client";

import { useState, useEffect } from "react";
import { formatInTimeZone } from "date-fns-tz";
import type { Room, Doctor } from "@/lib/client";
import { formatSlotLabel, slotEnd, todayBase, tzAbbreviation } from "@/lib/time";

interface Props {
  rooms: Room[];
  doctors: Doctor[];
  selectedSlot: { roomId: number; slotIndex: number };
  onClose: () => void;
  onBooked: () => void;
}

export function BookingPanel({
  rooms,
  doctors,
  selectedSlot,
  onClose,
  onBooked,
}: Props) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setSelectedDoctorId(null);
    setError(null);
    setSuccess(false);
  }, [selectedSlot]);

  const room = rooms.find((r) => r.id === selectedSlot.roomId);
  // Room is the source of truth for the slot's wall-clock semantics.
  const timeZone = room?.timezone ?? "UTC";
  const base = todayBase(timeZone);
  const startLabel = formatSlotLabel(selectedSlot.slotIndex, base, timeZone);
  const endTime = slotEnd(selectedSlot.slotIndex, base);
  const endLabel = formatInTimeZone(endTime, timeZone, "HH:mm");
  const tzAbbr = room ? tzAbbreviation(timeZone, base) : "";

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  const handleBook = async () => {
    if (!selectedDoctorId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          room_id: selectedSlot.roomId,
          doctor_id: selectedDoctorId,
          slot_index: selectedSlot.slotIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to book slot.");
        return;
      }
      setSuccess(true);
      setTimeout(() => onBooked(), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 260);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(17,24,39,0.25)",
          zIndex: 40,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.25s ease",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Book appointment"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: "#fff",
          zIndex: 50,
          boxShadow:
            "-8px 0 32px rgba(0,0,0,0.08), -2px 0 8px rgba(0,0,0,0.04)",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.26s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 20px",
            borderBottom: "1px solid #F3F4F6",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
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
                New Appointment
              </p>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#111827",
                  margin: 0,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.2,
                }}
              >
                {room?.name ?? "Room"}
              </h2>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  background: "#F0FDFA",
                  border: "1px solid #CCFBF1",
                  borderRadius: 6,
                  padding: "4px 10px",
                }}
              >
                <svg
                  width="12"
                  height="12"
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
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#0F766E" }}
                >
                  {startLabel} – {endLabel}
                </span>
                {tzAbbr && (
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "ui-monospace, monospace",
                      color: "#0F766E",
                      opacity: 0.7,
                      marginLeft: 2,
                    }}
                    title={timeZone}
                  >
                    {tzAbbr}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: "1.5px solid #E5E7EB",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9CA3AF",
                flexShrink: 0,
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F9FAFB";
                e.currentTarget.style.color = "#374151";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#9CA3AF";
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Doctor list */}
        <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#6B7280",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Select Provider
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {doctors.map((doc) => {
              const isSel = selectedDoctorId === doc.id;
              const initials = doc.name
                .split(" ")
                .filter((p) => p !== "Dr.")
                .map((p) => p[0])
                .join("")
                .slice(0, 2);
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDoctorId(doc.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: isSel
                      ? `2px solid ${doc.color}`
                      : "2px solid #F3F4F6",
                    background: isSel
                      ? hexToRgba(doc.color, 0.07)
                      : "#FAFAF8",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.12s ease",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSel) {
                      e.currentTarget.style.background = "#F9FAFB";
                      e.currentTarget.style.borderColor = "#E5E7EB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSel) {
                      e.currentTarget.style.background = "#FAFAF8";
                      e.currentTarget.style.borderColor = "#F3F4F6";
                    }
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: doc.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#111827",
                        lineHeight: 1.3,
                      }}
                    >
                      {doc.name}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: isSel ? `none` : "2px solid #E5E7EB",
                      background: isSel ? doc.color : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.12s ease",
                    }}
                  >
                    {isSel && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 8,
                padding: "10px 14px",
                marginTop: 14,
                fontSize: 13,
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "20px 24px",
            borderTop: "1px solid #F3F4F6",
            background: "#FAFAF8",
          }}
        >
          {success ? (
            <div
              style={{
                height: 48,
                borderRadius: 10,
                background: "#ECFDF5",
                border: "1.5px solid #6EE7B7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: "#059669",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Appointment confirmed!
            </div>
          ) : (
            <button
              type="button"
              onClick={handleBook}
              disabled={!selectedDoctorId || loading}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 10,
                background:
                  selectedDoctorId && !loading
                    ? selectedDoctor?.color ?? "#0F766E"
                    : "#E5E7EB",
                color: selectedDoctorId && !loading ? "#fff" : "#9CA3AF",
                border: "none",
                cursor:
                  selectedDoctorId && !loading ? "pointer" : "not-allowed",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <Spinner />
                  Booking...
                </>
              ) : (
                "Confirm Appointment"
              )}
            </button>
          )}
          <p
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "#9CA3AF",
              marginTop: 10,
              letterSpacing: "0.01em",
            }}
          >
            Protected by EXCLUDE constraint — concurrent requests are safe
          </p>
        </div>
      </div>
    </>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return `rgba(100,100,100,${alpha})`;
  return `rgba(${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)},${alpha})`;
}
