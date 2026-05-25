import { NextResponse } from "next/server";
import { sql } from "@/db";

export async function POST() {
  await sql`TRUNCATE room_scheduling.bookings, room_scheduling.bookings_excl, room_scheduling.runs RESTART IDENTITY`;
  return NextResponse.json({ ok: true });
}
