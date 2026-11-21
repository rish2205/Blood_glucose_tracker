// Safety: tests only ever run against the *_test database, never the dev one.
require("dotenv").config();
const testDb = process.env.PGDATABASE_TEST || "sweety_db_test";
if (!testDb.endsWith("_test") || testDb === process.env.PGDATABASE) {
  throw new Error(`Refusing to run tests: "${testDb}" must end in _test and differ from PGDATABASE.`);
}
process.env.PGDATABASE = testDb; // set before ../src/db is loaded

const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db");

async function resetDb() {
  const { rows } = await pool.query("SELECT current_database() AS db");
  if (!rows[0].db.endsWith("_test")) throw new Error("Not a test database; refusing to truncate.");
  await pool.query(fs.readFileSync(path.join(__dirname, "../db/schema.sql"), "utf8"));
  await pool.query("TRUNCATE readings, users RESTART IDENTITY CASCADE");
}

let n = 0;
// Registers a fresh user; auth is a ready-to-use Authorization header value.
async function newUser(name = "Test User") {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email: `user${++n}@example.com`, password: "password123" });
  return { id: res.body.user.id, auth: `Bearer ${res.body.token}` };
}

const addReading = (user, body) =>
  request(app).post("/api/readings").set("Authorization", user.auth).send(body);

const dayOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

module.exports = { app, pool, request, resetDb, newUser, addReading, dayOffset };
