import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const postgresUrl = process.env.DATABASE_URL;

if (!postgresUrl) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: postgresUrl,
});

const db = drizzle(pool, { schema });

export { pool };
export default db;
