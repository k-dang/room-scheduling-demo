import { sql } from "@/db";
import { ConflictError } from "./errors";
import type { Strategy } from "./types";

export const forUpdate: Strategy = async (req) => {
  const t0 = Date.now();
  try {
    await sql.begin(async (tx) => {
      await tx`SELECT id FROM room_scheduling.rooms WHERE id = ${req.roomId} FOR UPDATE`;
      const overlapping = await tx`
        SELECT 1 FROM room_scheduling.bookings
        WHERE room_id = ${req.roomId}
          AND starts_at < ${req.endsAt}::timestamptz
          AND ends_at > ${req.startsAt}::timestamptz
        LIMIT 1
      `;
      if (overlapping.length > 0) throw new ConflictError();
      await tx`
        INSERT INTO room_scheduling.bookings (room_id, doctor_id, starts_at, ends_at, strategy)
        VALUES (${req.roomId}, ${req.doctorId}, ${req.startsAt}::timestamptz, ${req.endsAt}::timestamptz, 'for-update')
      `;
    });
    return { status: "booked", retries: 0, latencyMs: Date.now() - t0 };
  } catch (e) {
    if (e instanceof ConflictError) {
      return {
        status: "conflict",
        reason: e.detail,
        retries: 0,
        latencyMs: Date.now() - t0,
      };
    }
    return {
      status: "error",
      reason: e instanceof Error ? e.message : String(e),
      retries: 0,
      latencyMs: Date.now() - t0,
    };
  }
};
