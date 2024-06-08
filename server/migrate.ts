import "dotenv/config";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import db, { sqlite } from "./src/data";

migrate(db, { migrationsFolder: "./migrations" });
sqlite.close();
