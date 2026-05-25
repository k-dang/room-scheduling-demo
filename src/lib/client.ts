import type { StrategyId } from "./strategies/types";

export interface Room {
  id: number;
  name: string;
}

export interface Doctor {
  id: number;
  name: string;
  color: string;
}

export interface BookingRow {
  id: string;
  roomId: number;
  doctorId: number;
  startsAt: string;
  endsAt: string;
  strategy: string;
}

export interface RunRow {
  id: number;
  strategy: StrategyId;
  roomId: number;
  startsAt: string;
  endsAt: string;
  concurrency: number;
  succeeded: number;
  conflicted: number;
  errored: number;
  totalMs: number;
  p50Ms: number;
  p99Ms: number;
  maxMs: number;
  totalRetries: number;
  persistedOnSlot: number;
  createdAt: string;
}

export interface ScheduleState {
  rooms: Room[];
  doctors: Doctor[];
  bookings: BookingRow[];
  bookingsExcl: BookingRow[];
  runs: RunRow[];
}

export interface StressResponse {
  strategy: StrategyId;
  concurrency: number;
  succeeded: number;
  conflicted: number;
  errored: number;
  totalMs: number;
  p50Ms: number;
  p99Ms: number;
  maxMs: number;
  totalRetries: number;
  persistedOnSlot: number;
  results: {
    status: string;
    reason?: string;
    retries: number;
    latencyMs: number;
    doctorId: number;
  }[];
}

export async function fetchSchedule(): Promise<ScheduleState> {
  const r = await fetch("/api/schedule", { cache: "no-store" });
  if (!r.ok) throw new Error("failed to fetch schedule");
  return r.json();
}

export async function postStress(input: {
  strategy: StrategyId;
  roomId: number;
  startsAt: string;
  endsAt: string;
  concurrency: number;
}): Promise<StressResponse> {
  const r = await fetch("/api/stress", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`stress failed: ${await r.text()}`);
  return r.json();
}

export async function postReset(): Promise<void> {
  const r = await fetch("/api/reset", { method: "POST" });
  if (!r.ok) throw new Error("reset failed");
}
