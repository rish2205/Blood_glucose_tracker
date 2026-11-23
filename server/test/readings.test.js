const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, pool, request, resetDb, newUser, addReading, dayOffset } = require("./helpers");

beforeEach(resetDb);
after(() => pool.end());

const DAY = "2026-03-10";
const ok = { date: DAY, slot: "morning", value: 100 };

test("each validation rule returns its message", async () => {
  const u = await newUser();
  const cases = [
    [{ ...ok, value: "" }, "Please enter a glucose value."],
    [{ ...ok, value: undefined }, "Please enter a glucose value."],
    [{ ...ok, value: 39 }, "Value must be a whole number between 40 and 600 mg/dl."],
    [{ ...ok, value: 601 }, "Value must be a whole number between 40 and 600 mg/dl."],
    [{ ...ok, value: 120.5 }, "Value must be a whole number between 40 and 600 mg/dl."],
    [{ ...ok, value: "abc" }, "Value must be a whole number between 40 and 600 mg/dl."],
    [{ ...ok, date: dayOffset(1) }, "Date cannot be in the future."],
  ];
  for (const [body, message] of cases) {
    const res = await addReading(u, body);
    assert.equal(res.status, 400);
    assert.equal(res.body.error, message);
  }
  assert.equal((await addReading(u, { ...ok, value: 40 })).status, 201); // lower boundary
  assert.equal((await addReading(u, { ...ok, slot: "after_lunch", value: 600 })).status, 201); // upper boundary
});

test("only one reading per slot per day", async () => {
  const u = await newUser();
  await addReading(u, ok);
  const res = await addReading(u, { ...ok, value: 130 });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "You already have an Morning (fasting) reading for this date.");
  // same slot on another day is fine
  assert.equal((await addReading(u, { ...ok, date: "2026-03-11" })).status, 201);
});

test("at most 4 readings per day", async () => {
  const u = await newUser();
  for (const slot of ["morning", "after_breakfast", "after_lunch", "after_dinner"]) {
    assert.equal((await addReading(u, { ...ok, slot })).status, 201);
  }
  const res = await addReading(u, { ...ok, slot: "morning" });
  assert.equal(res.body.error, "You can add only 4 readings per day.");
});

test("parallel adds cannot duplicate a slot", async () => {
  const u = await newUser();
  const results = await Promise.all(Array.from({ length: 8 }, () => addReading(u, ok)));
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal(results.filter((r) => r.status === 500).length, 0);
});

test("users only see and change their own readings", async () => {
  const a = await newUser();
  const b = await newUser();
  const id = (await addReading(a, ok)).body.reading.id;

  const list = await request(app).get("/api/readings").set("Authorization", b.auth);
  assert.deepEqual(list.body.readings, []);
  const put = await request(app).put(`/api/readings/${id}`).set("Authorization", b.auth).send({ ...ok, value: 50 });
  assert.equal(put.status, 404);
  const del = await request(app).delete(`/api/readings/${id}`).set("Authorization", b.auth);
  assert.equal(del.status, 404);

  const mine = await request(app).get("/api/readings").set("Authorization", a.auth);
  assert.equal(mine.body.readings[0].value, 100); // untouched
});

test("edit works, ignores itself in the checks, and still enforces the rules", async () => {
  const u = await newUser();
  const id = (await addReading(u, ok)).body.reading.id;
  await addReading(u, { ...ok, slot: "after_lunch" });

  const same = await request(app).put(`/api/readings/${id}`).set("Authorization", u.auth).send({ ...ok, value: 140 });
  assert.equal(same.status, 200);
  assert.equal(same.body.reading.value, 140);

  const clash = await request(app).put(`/api/readings/${id}`).set("Authorization", u.auth).send({ ...ok, slot: "after_lunch" });
  assert.equal(clash.body.error, "You already have an After lunch reading for this date.");

  const del = await request(app).delete(`/api/readings/${id}`).set("Authorization", u.auth);
  assert.equal(del.status, 204);
});

test("pagination: boundaries, stable order, bad values, and no leaking of other users", async () => {
  const a = await newUser();
  const b = await newUser();
  for (let day = 1; day <= 6; day++) {
    await addReading(a, { date: `2026-03-0${day}`, slot: "morning", value: 100 + day });
  }
  await addReading(b, { date: "2026-03-09", slot: "morning", value: 333 });

  const get = (user, qs) => request(app).get(`/api/readings?${qs}`).set("Authorization", user.auth);

  const p1 = (await get(a, "page=1&limit=5")).body;
  assert.equal(p1.readings.length, 5);
  assert.equal(p1.total, 6);
  assert.equal(p1.totalPages, 2);
  assert.equal(p1.readings[0].date, "2026-03-06"); // newest first

  const p2 = (await get(a, "page=2&limit=5")).body;
  assert.deepEqual(p2.readings.map((r) => r.date), ["2026-03-01"]); // the 6th reading, no overlap with page 1

  const past = (await get(a, "page=3&limit=5")).body;
  assert.deepEqual(past.readings, []);
  assert.equal(past.totalPages, 2);

  const all = [...p1.readings, ...p2.readings];
  assert.ok(all.every((r) => r.value !== 333)); // user B's reading never appears
  assert.equal((await get(b, "page=1&limit=5")).body.total, 1);

  for (const qs of ["page=0", "page=abc", "limit=0", "limit=101", "limit=1.5"]) {
    assert.equal((await get(a, qs)).status, 400, qs);
  }
  assert.equal((await get(a, "")).body.limit, 20); // defaults
});
