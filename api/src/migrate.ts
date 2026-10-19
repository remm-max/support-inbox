import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "db");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  console.log(`Running ${file}`);
  await pool.query(readFileSync(join(dir, file), "utf8"));
}
console.log("Migrations done");
await pool.end();
