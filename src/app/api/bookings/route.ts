import { NextResponse } from "next/server";
import { sql } from "@/db";
import { SLOTS_PER_DAY, slotEnd, slotStart, todayBase } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { room_id: number; doctor_id: number; slot_index: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { room_id, doctor_id, slot_index } = body;
  if (!room_id || !doctor_id || slot_index == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (slot_index < 0 || slot_index >= SLOTS_PER_DAY) {
    return NextResponse.json({ error: "Invalid slot index" }, { status: 400 });
  }

  const [room] = (await sql`
    SELECT timezone FROM room_scheduling.rooms WHERE id = ${room_id}
  `) as { timezone: string }[];
  if (!room) {
    return NextResponse.json({ error: "Unknown room" }, { status: 404 });
  }

  // The slot's wall-clock window is anchored to the room's timezone — never the
  // server's. Stored as UTC; only the venue's tz determines what "08:00" means.
  const base = todayBase(room.timezone);
  const startsAt = slotStart(slot_index, base).toISOString();
  const endsAt = slotEnd(slot_index, base).toISOString();

  try {
    const [row] = await sql`
      INSERT INTO room_scheduling.bookings_excl (room_id, doctor_id, during, strategy)
      VALUES (
        ${room_id},
        ${doctor_id},
        tstzrange(${startsAt}::timestamptz, ${endsAt}::timestamptz, '[)'),
        'exclude'
      )
      RETURNING id, room_id, doctor_id, lower(during) AS starts_at, upper(during) AS ends_at, strategy
    `;

    return NextResponse.json({
      booking: {
        id: `e${row.id}`,
        roomId: row.room_id as number,
        doctorId: row.doctor_id as number,
        startsAt: new Date(row.starts_at as string).toISOString(),
        endsAt: new Date(row.ends_at as string).toISOString(),
        strategy: row.strategy as string,
      },
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23P01") {
      return NextResponse.json(
        { error: "This time slot is already booked for this room." },
        { status: 409 },
      );
    }
    console.error("Booking error:", e);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
