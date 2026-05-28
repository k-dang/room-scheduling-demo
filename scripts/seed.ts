import { config } from "dotenv";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { doctors, rooms } from "../src/db/schema";

config({ path: ".env.local" });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle({ client, schema: { rooms, doctors } });

const seedRooms = [
  { name: "Exam Room 1", timezone: "America/Los_Angeles" },
  { name: "Exam Room 2", timezone: "America/Los_Angeles" },
  { name: "Exam Room 3", timezone: "America/Los_Angeles" },
  { name: "Exam Room 4", timezone: "America/Los_Angeles" },
];

const seedDoctors = [
  { name: "Dr. Chen", color: "#3b82f6" },
  { name: "Dr. Patel", color: "#10b981" },
  { name: "Dr. Garcia", color: "#f59e0b" },
  { name: "Dr. Kim", color: "#ef4444" },
  { name: "Dr. Muller", color: "#8b5cf6" },
  { name: "Dr. Hassan", color: "#ec4899" },
  { name: "Dr. Wright", color: "#14b8a6" },
  { name: "Dr. Singh", color: "#f97316" },
];

const [roomRow] = await db.select({ n: count() }).from(rooms);
if (roomRow.n === 0) {
  await db.insert(rooms).values(seedRooms);
  console.log(`seeded ${seedRooms.length} rooms`);
} else {
  console.log(`rooms already seeded (${roomRow.n}), skipping`);
}

const [docRow] = await db.select({ n: count() }).from(doctors);
if (docRow.n === 0) {
  await db.insert(doctors).values(seedDoctors);
  console.log(`seeded ${seedDoctors.length} doctors`);
} else {
  console.log(`doctors already seeded (${docRow.n}), skipping`);
}

await client.end();
