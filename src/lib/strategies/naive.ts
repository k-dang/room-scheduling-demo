import { sql } from "@/db";
import type { Strategy } from "./types";

export const naive: Strategy = async (req) => {
  const t0 = Date.now();
  // Reserve a dedicated connection so concurrent callers actually race in parallel
  // (otherwise postgres-js pipelines on a shared connection and accidentally serializes them).
  const cx = await sql.reserve();
  try {
    const overlapping = await cx`
      SELECT 1 FROM room_scheduling.bookings
      WHERE room_id = ${req.roomId}
        AND starts_at < ${req.endsAt}::timestamptz
        AND ends_at > ${req.startsAt}::timestamptz
      LIMIT 1
    `;
    if (overlapping.length > 0) {
      return {
        status: "conflict",
        reason: "overlap visible in pre-check",
        retries: 0,
        latencyMs: Date.now() - t0,
      };
    }
    // Simulate app work between the check and the write — validation, fee calculation,
    // notifications, whatever. This is the window in which the race actually happens.
    await new Promise((r) => setTimeout(r, 50));
    await cx`
      INSERT INTO room_scheduling.bookings (room_id, doctor_id, starts_at, ends_at, strategy)
      VALUES (${req.roomId}, ${req.doctorId}, ${req.startsAt}::timestamptz, ${req.endsAt}::timestamptz, 'naive')
    `;
    return { status: "booked", retries: 0, latencyMs: Date.now() - t0 };
  } catch (e) {
    return {
      status: "error",
      reason: e instanceof Error ? e.message : String(e),
      retries: 0,
      latencyMs: Date.now() - t0,
    };
  } finally {
    cx.release();
  }
};
