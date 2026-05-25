import { sql } from "@/db";
import type { Strategy } from "./types";

export const excludeConstraint: Strategy = async (req) => {
  const t0 = Date.now();
  try {
    await sql`
      INSERT INTO room_scheduling.bookings_excl (room_id, doctor_id, during, strategy)
      VALUES (
        ${req.roomId},
        ${req.doctorId},
        tstzrange(${req.startsAt}::timestamptz, ${req.endsAt}::timestamptz, '[)'),
        'exclude'
      )
    `;
    return { status: "booked", retries: 0, latencyMs: Date.now() - t0 };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23P01") {
      return {
        status: "conflict",
        reason: "exclusion constraint violation",
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
