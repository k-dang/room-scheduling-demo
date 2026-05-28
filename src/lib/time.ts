import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const SLOT_MINUTES = 30;
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 17;
export const SLOTS_PER_DAY =
  ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;

// "Today at DAY_START_HOUR:00 in `timeZone`", returned as a UTC `Date`.
// Server and client agree because the wall-clock anchor is the room's timezone,
// never the runtime's local timezone.
export function todayBase(timeZone: string, now: Date = new Date()): Date {
  const localDate = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const hh = String(DAY_START_HOUR).padStart(2, "0");
  return fromZonedTime(`${localDate} ${hh}:00:00`, timeZone);
}

export function slotStart(slotIndex: number, base: Date): Date {
  return new Date(base.getTime() + slotIndex * SLOT_MINUTES * 60_000);
}

export function slotEnd(slotIndex: number, base: Date): Date {
  return slotStart(slotIndex + 1, base);
}

export function slotIndexOf(iso: string, base: Date): number {
  const ms = new Date(iso).getTime() - base.getTime();
  return Math.round(ms / (SLOT_MINUTES * 60_000));
}

export function formatSlotLabel(slotIndex: number, base: Date, timeZone: string): string {
  return formatInTimeZone(slotStart(slotIndex, base), timeZone, "HH:mm");
}

export function formatInZone(iso: string, timeZone: string, pattern = "HH:mm"): string {
  return formatInTimeZone(new Date(iso), timeZone, pattern);
}

// Short label for a timezone (e.g. "PST", "EDT") at a given instant.
export function tzAbbreviation(timeZone: string, at: Date = new Date()): string {
  return formatInTimeZone(at, timeZone, "zzz");
}
