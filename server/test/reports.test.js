const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, pool, request, resetDb, newUser, addReading, dayOffset } = require("./helpers");
const { ranges } = require("../src/reports");

beforeEach(resetDb);
after(() => pool.end());

test("date ranges match the assignment example and month edges", () => {
  assert.deepEqual(ranges("2026-10-15"), {
    daily: ["2026-10-15", "2026-10-15"],
    monthToDate: ["2026-10-01", "2026-10-15"],
    previousMonth: ["2026-09-01", "2026-09-30"],
  });
  assert.deepEqual(ranges("2026-01-05").previousMonth, ["2025-12-01", "2025-12-31"]);
  assert.deepEqual(ranges("2024-03-31").previousMonth, ["2024-02-01", "2024-02-29"]); // leap year
});

test("reports compute highest, lowest, average (1 decimal) and count per range", async () => {
  const u = await newUser();
  const put = (date, slot, value) => addReading(u, { date, slot, value });
  await put("2026-09-10", "morning", 100); // previous month
  await put("2026-09-30", "morning", 101);
  await put("2026-10-01", "morning", 90); // month to date
  await put("2026-10-15", "morning", 100); // selected day
  await put("2026-10-15", "after_lunch", 111);
  await put("2026-10-16", "morning", 300); // after the selected day: excluded

  const res = await request(app).get("/api/reports?date=2026-10-15").set("Authorization", u.auth);
  assert.equal(res.status, 200);
  const { daily, monthToDate, previousMonth } = res.body;

  assert.equal(daily.count, 2);
  assert.equal(daily.average, 105.5);
  assert.deepEqual(daily.readings.map((r) => r.slot), ["morning", "after_lunch"]);
  assert.deepEqual([monthToDate.count, monthToDate.highest, monthToDate.lowest, monthToDate.average], [3, 111, 90, 100.3]);
  assert.deepEqual([previousMonth.count, previousMonth.highest, previousMonth.lowest, previousMonth.average], [2, 101, 100, 100.5]);
});

test("empty periods give count 0 and null values, and other users data is not counted", async () => {
  const a = await newUser();
  const b = await newUser();
  await addReading(a, { date: "2026-10-15", slot: "morning", value: 100 });
  const res = await request(app).get("/api/reports?date=2026-10-15").set("Authorization", b.auth);
  assert.equal(res.body.daily.count, 0);
  assert.equal(res.body.daily.average, null);
  assert.deepEqual(res.body.daily.readings, []);
  assert.equal(res.body.previousMonth.highest, null);
});

test("report rejects future and malformed dates", async () => {
  const u = await newUser();
  const get = (d) => request(app).get(`/api/reports?date=${d}`).set("Authorization", u.auth);
  assert.equal((await get(dayOffset(1))).body.error, "Date cannot be in the future.");
  assert.equal((await get("2026-02-31")).status, 400);
  assert.equal((await get("nope")).status, 400);
});
