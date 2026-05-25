import { config } from "dotenv";
import { readFileSync } from "node:fs";
import postgres from "postgres";

config({ path: ".env.local" });

const ddl = readFileSync("src/db/init.sql", "utf-8");
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

await sql.unsafe(ddl);
console.log("schema initialized");
await sql.end();
