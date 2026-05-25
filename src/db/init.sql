CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS room_scheduling;

CREATE TABLE IF NOT EXISTS room_scheduling.rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS room_scheduling.doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

-- Used by strategies that operate without a DB-level overlap constraint.
CREATE TABLE IF NOT EXISTS room_scheduling.bookings (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES room_scheduling.rooms(id),
  doctor_id INTEGER NOT NULL REFERENCES room_scheduling.doctors(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  strategy TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bookings_room_time_idx ON room_scheduling.bookings (room_id, starts_at);

-- Used by the "exclude" strategy. EXCLUDE rejects overlapping rows in the same room.
CREATE TABLE IF NOT EXISTS room_scheduling.bookings_excl (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES room_scheduling.rooms(id),
  doctor_id INTEGER NOT NULL REFERENCES room_scheduling.doctors(id),
  during TSTZRANGE NOT NULL,
  strategy TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_overlap EXCLUDE USING gist (room_id WITH =, during WITH &&)
);

CREATE TABLE IF NOT EXISTS room_scheduling.runs (
  id SERIAL PRIMARY KEY,
  strategy TEXT NOT NULL,
  room_id INTEGER NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  concurrency INTEGER NOT NULL,
  succeeded INTEGER NOT NULL,
  conflicted INTEGER NOT NULL,
  errored INTEGER NOT NULL,
  total_ms INTEGER NOT NULL,
  p50_ms INTEGER NOT NULL,
  p99_ms INTEGER NOT NULL,
  max_ms INTEGER NOT NULL,
  total_retries INTEGER NOT NULL,
  persisted_on_slot INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO room_scheduling.rooms (name)
SELECT v FROM (VALUES ('Exam Room 1'), ('Exam Room 2'), ('Exam Room 3'), ('Exam Room 4')) AS t(v)
WHERE NOT EXISTS (SELECT 1 FROM room_scheduling.rooms);

INSERT INTO room_scheduling.doctors (name, color)
SELECT v.name, v.color FROM (VALUES
  ('Dr. Chen',   '#3b82f6'),
  ('Dr. Patel',  '#10b981'),
  ('Dr. Garcia', '#f59e0b'),
  ('Dr. Kim',    '#ef4444'),
  ('Dr. Muller', '#8b5cf6'),
  ('Dr. Hassan', '#ec4899'),
  ('Dr. Wright', '#14b8a6'),
  ('Dr. Singh',  '#f97316')
) AS v(name, color)
WHERE NOT EXISTS (SELECT 1 FROM room_scheduling.doctors);
