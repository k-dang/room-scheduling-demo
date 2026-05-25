import { sql } from "@/db";
import { ConflictError } from "./errors";
import type { Strategy } from "./types";

const MAX_RETRIES = 8;

export const serializable: Strategy = async (req) => {
  const t0 = Date.now();
  let retries = 0;

  while (true) {
    try {
      await sql.begin("isolation level serializable", async (tx) => {
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
          VALUES (${req.roomId}, ${req.doctorId}, ${req.startsAt}::timestamptz, ${req.endsAt}::timestamptz, 'serializable')
        `;
      });
      return { status: "booked", retries, latencyMs: Date.now() - t0 };
    } catch (e) {
      if (e instanceof ConflictError) {
        return {
          status: "conflict",
          reason: e.detail,
          retries,
          latencyMs: Date.now() - t0,
        };
      }
      const code = (e as { code?: string }).code;
      // 40001 serialization_failure, 40P01 deadlock_detected
      if ((code === "40001" || code === "40P01") && retries < MAX_RETRIES) {
        retries++;
        await new Promise((r) => setTimeout(r, Math.random() * 20 * retries));
        continue;
      }
      return {
        status: "error",
        reason: e instanceof Error ? e.message : String(e),
        retries,
        latencyMs: Date.now() - t0,
      };
    }
  }
};
