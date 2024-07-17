import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqliteUrl = process.env.DATABASE_URL;

if (!sqliteUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sqlite = new Database(sqliteUrl);

// Ref. https://twitter.com/meln1k/status/1813314113705062774

// "enables write-ahead log so that your reads do not block writes and vice-versa."
sqlite.pragma("journal_mode = WAL");

// "sqlite will wait 5 seconds to obtain a lock before returning SQLITE_BUSY errors,
//  which will significantly reduce them."
sqlite.pragma("busy_timeout = 5000");

// "sqlite will sync less frequently and be more performant,
//  still safe to use because of the enabled WAL mode"
sqlite.pragma("synchronous = NORMAL");

// "negative number means kilobytes, in this case 20MB of memory for cache."
sqlite.pragma("cache_size = -20000");

// "because of historical reasons foreign keys are disabled by default, we should manually enable them."
sqlite.pragma("foreign_keys = true");

// "moves temporary tables from disk into RAM, speeds up performance a lot."
sqlite.pragma("temp_store = memory");

const db = drizzle(sqlite, { schema });

export function getSqliteTimestamp() {
  return new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
}

export { sqlite };
export default db;
