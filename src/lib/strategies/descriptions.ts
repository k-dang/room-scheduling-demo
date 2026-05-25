import type { StrategyId } from "./types";

export interface StrategyMeta {
  id: StrategyId;
  title: string;
  blurb: string;
  expectation: "broken" | "safe-locking" | "safe-retry" | "safe-declarative";
  sql: string;
  recommended?: {
    reason: string;
  };
  deepDive?: string[];
}

export const STRATEGIES: StrategyMeta[] = [
  {
    id: "naive",
    title: "Naive (autocommit)",
    blurb:
      "SELECT then INSERT with no transaction. Two requests both see 'no overlap' and both insert.",
    expectation: "broken",
    sql: `SELECT 1 FROM bookings
WHERE room_id = $1
  AND starts_at < $endsAt
  AND ends_at > $startsAt;

-- if none:
INSERT INTO bookings (...) VALUES (...);`,
  },
  {
    id: "read-committed",
    title: "READ COMMITTED txn",
    blurb:
      "Wrap the same logic in a transaction at the default isolation level. Still races — the overlap check is a phantom read.",
    expectation: "broken",
    sql: `BEGIN;
  SELECT 1 FROM bookings
  WHERE room_id = $1
    AND starts_at < $endsAt
    AND ends_at > $startsAt;

  -- if none:
  INSERT INTO bookings (...) VALUES (...);
COMMIT;`,
  },
  {
    id: "for-update",
    title: "SELECT FOR UPDATE",
    blurb:
      "Pessimistically lock the room row. Concurrent bookings on the same room queue up.",
    expectation: "safe-locking",
    sql: `BEGIN;
  SELECT id FROM rooms WHERE id = $1 FOR UPDATE;

  SELECT 1 FROM bookings
  WHERE room_id = $1
    AND starts_at < $endsAt
    AND ends_at > $startsAt;

  -- if none:
  INSERT INTO bookings (...) VALUES (...);
COMMIT;`,
  },
  {
    id: "serializable",
    title: "SERIALIZABLE + retry",
    blurb:
      "Strictest isolation. Postgres detects conflicting reads/writes and aborts losers with 40001. Retry transparently.",
    expectation: "safe-retry",
    sql: `BEGIN ISOLATION LEVEL SERIALIZABLE;
  SELECT 1 FROM bookings
  WHERE room_id = $1
    AND starts_at < $endsAt
    AND ends_at > $startsAt;

  -- if none:
  INSERT INTO bookings (...) VALUES (...);
COMMIT;
-- on 40001: retry from BEGIN`,
  },
  {
    id: "exclude",
    title: "EXCLUDE constraint",
    blurb:
      "Declarative: the table itself rejects overlapping ranges per room via a GiST EXCLUDE constraint. No app logic needed.",
    expectation: "safe-declarative",
    recommended: {
      reason:
        "The idiomatic Postgres answer for 'no overlapping bookings'. The constraint lives with the data — every code path that inserts is automatically safe, with no transactions, locks, or retry loops. Fastest in this benchmark because there's no serialization point.",
    },
    sql: `CREATE TABLE bookings_excl (
  ...
  during TSTZRANGE NOT NULL,
  EXCLUDE USING gist (
    room_id WITH =,
    during WITH &&
  )
);

INSERT INTO bookings_excl
  (room_id, during, ...)
VALUES
  ($1, tstzrange($2, $3, '[)'), ...);
-- raises 23P01 if overlap`,
    deepDive: [
      "The constraint is declared on two columns: room_id WITH = and during WITH &&. No two rows may exist where room_id is equal AND during ranges overlap.",
      "GiST is required because && (range overlap) is not a linear ordering — B-tree indexes only understand <, =, >. GiST is a pluggable spatial index that can evaluate overlap.",
      "The btree_gist extension adds integer support to GiST, letting room_id participate in the same index. Without it, you could only index during alone, and the constraint would block overlaps across all rooms — not just the same room.",
      "The check and the write are the same atomic operation. There is no window between SELECT and INSERT for another request to sneak in, so no transactions, locks, or retry logic are needed.",
    ],
  },
  {
    id: "advisory",
    title: "Advisory lock",
    blurb:
      "Acquire a transaction-scoped advisory lock keyed by room_id. Cheaper than row locks, no FK indirection.",
    expectation: "safe-locking",
    sql: `BEGIN;
  SELECT pg_advisory_xact_lock($1);  -- key = room_id

  SELECT 1 FROM bookings
  WHERE room_id = $1
    AND starts_at < $endsAt
    AND ends_at > $startsAt;

  -- if none:
  INSERT INTO bookings (...) VALUES (...);
COMMIT;`,
  },
];

export const STRATEGY_BY_ID: Record<StrategyId, StrategyMeta> =
  Object.fromEntries(STRATEGIES.map((s) => [s.id, s])) as Record<
    StrategyId,
    StrategyMeta
  >;
