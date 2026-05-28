import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

await sql`DROP SCHEMA IF EXISTS room_scheduling CASCADE`;
await sql`DROP TABLE IF EXISTS drizzle.__drizzle_migrations`;
console.log("dropped room_scheduling schema and drizzle migration table");

await sql.end();
