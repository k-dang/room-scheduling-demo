export const SLOT_MINUTES = 30;
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 17;
export const SLOTS_PER_DAY =
  ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;

export function todayBase(): Date {
  const d = new Date();
  d.setHours(DAY_START_HOUR, 0, 0, 0);
  return d;
}

export function slotStart(slotIndex: number, base = todayBase()): Date {
  const d = new Date(base);
  d.setMinutes(d.getMinutes() + slotIndex * SLOT_MINUTES);
  return d;
}

export function slotEnd(slotIndex: number, base = todayBase()): Date {
  return slotStart(slotIndex + 1, base);
}

export function slotIndexOf(iso: string, base = todayBase()): number {
  const ms = new Date(iso).getTime() - base.getTime();
  return Math.round(ms / (SLOT_MINUTES * 60_000));
}

export function formatSlotLabel(slotIndex: number, base = todayBase()): string {
  const d = slotStart(slotIndex, base);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
