export type StrategyId =
  | "naive"
  | "read-committed"
  | "for-update"
  | "serializable"
  | "exclude"
  | "advisory";

export interface BookingRequest {
  roomId: number;
  doctorId: number;
  /** ISO-8601 UTC timestamp */
  startsAt: string;
  /** ISO-8601 UTC timestamp */
  endsAt: string;
}

export interface BookingResult {
  status: "booked" | "conflict" | "error";
  reason?: string;
  retries: number;
  latencyMs: number;
}

export type Strategy = (req: BookingRequest) => Promise<BookingResult>;
