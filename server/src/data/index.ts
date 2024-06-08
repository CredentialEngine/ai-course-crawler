import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqliteUrl = process.env.DATABASE_URL;

if (!sqliteUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sqlite = new Database(sqliteUrl);
const db = drizzle(sqlite, { schema });

export function getSqliteTimestamp() {
  return new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
}

export { sqlite };
export default db;
