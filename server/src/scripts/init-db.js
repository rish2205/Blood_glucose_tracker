// Applies db/schema.sql. Use `--test` to target the test database (never the dev one).
require("dotenv").config();
if (process.argv.includes("--test")) {
  process.env.PGDATABASE = process.env.PGDATABASE_TEST || "sweety_db_test";
}
const fs = require("fs");
const path = require("path");
const pool = require("../db");

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, "../../db/schema.sql"), "utf8");
  await pool.query(sql);
  console.log(`Schema applied to "${process.env.PGDATABASE}".`);
  await pool.end();
})().catch((e) => {
  console.error("init-db failed:", e.message);
  process.exit(1);
});
