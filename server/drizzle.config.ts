import "dotenv/config";
import type { Config } from "drizzle-kit";

const sqliteUrl = process.env.DATABASE_URL;

if (!sqliteUrl) {
  throw new Error("DATABASE_URL is not set");
}

export default {
  schema: "./src/data/schema.ts",
  out: "./migrations",
  driver: "better-sqlite",
  dbCredentials: {
    url: sqliteUrl,
  },
} satisfies Config;
