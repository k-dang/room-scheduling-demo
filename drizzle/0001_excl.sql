-- Hand-written migration: features Drizzle's schema DSL can't express.
--
-- `btree_gist` is required for the EXCLUDE constraint to combine an equality
-- check on room_id with a range-overlap check on the during column.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE TABLE "room_scheduling"."bookings_excl" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL REFERENCES "room_scheduling"."rooms"(id),
	"doctor_id" integer NOT NULL REFERENCES "room_scheduling"."doctors"(id),
	"during" tstzrange NOT NULL,
	"strategy" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_excl_no_overlap" EXCLUDE USING gist (room_id WITH =, during WITH &&)
);
