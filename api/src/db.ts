import "dotenv/config";
import pg from "pg";

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://inbox:inbox@localhost:5432/inbox",
});
