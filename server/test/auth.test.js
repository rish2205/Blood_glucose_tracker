const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { app, pool, request, resetDb } = require("./helpers");

beforeEach(resetDb);
after(() => pool.end());

const signup = (email = "a@example.com") =>
  request(app).post("/api/auth/register").send({ name: "Asha", email, password: "password123" });

test("password is stored as a bcrypt hash, never plain text", async () => {
  await signup();
  const { rows } = await pool.query("SELECT password_hash FROM users");
  assert.notEqual(rows[0].password_hash, "password123");
  assert.match(rows[0].password_hash, /^\$2[aby]\$/);
});

test("duplicate email is rejected, ignoring case", async () => {
  await signup("a@example.com");
  const res = await signup("A@Example.com");
  assert.equal(res.status, 409);
});

test("login works with the right password and fails with a wrong one", async () => {
  await signup();
  const ok = await request(app).post("/api/auth/login").send({ email: "a@example.com", password: "password123" });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  assert.equal(ok.body.user.password_hash, undefined);
  const bad = await request(app).post("/api/auth/login").send({ email: "a@example.com", password: "wrong-pass" });
  assert.equal(bad.status, 401);
});

test("readings need a login", async () => {
  assert.equal((await request(app).get("/api/readings")).status, 401);
});
