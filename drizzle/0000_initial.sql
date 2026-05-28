CREATE SCHEMA IF NOT EXISTS "room_scheduling";
--> statement-breakpoint
CREATE TABLE "room_scheduling"."bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"strategy" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_scheduling"."doctors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_scheduling"."rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_scheduling"."runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"strategy" text NOT NULL,
	"room_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"concurrency" integer NOT NULL,
	"succeeded" integer NOT NULL,
	"conflicted" integer NOT NULL,
	"errored" integer NOT NULL,
	"total_ms" integer NOT NULL,
	"p50_ms" integer NOT NULL,
	"p99_ms" integer NOT NULL,
	"max_ms" integer NOT NULL,
	"total_retries" integer NOT NULL,
	"persisted_on_slot" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
