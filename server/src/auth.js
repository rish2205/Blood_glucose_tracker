const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Router } = require("express");
const pool = require("./db");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be set to at least 32 characters.");
  return s;
}

const sign = (user) => jwt.sign({ sub: user.id }, secret(), { expiresIn: "7d" });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

// Sets req.userId from "Authorization: Bearer <token>", or answers 401.
function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  try {
    if (scheme !== "Bearer" || !token) throw new Error("no token");
    req.userId = Number(jwt.verify(token, secret()).sub);
    next();
  } catch {
    res.status(401).json({ error: "Please log in." });
  }
}

const router = Router();

router.post("/register", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");
  if (!name) return res.status(400).json({ error: "Please enter your name." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid email." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (password.length > 72) return res.status(400).json({ error: "Password must be at most 72 characters." }); // bcrypt ignores bytes past 72

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hash]
    );
    res.status(201).json({ token: sign(rows[0]), user: publicUser(rows[0]) });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
    throw e;
  }
});

router.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim();
  const password = String(req.body?.password ?? "");
  const { rows } = await pool.query("SELECT * FROM users WHERE lower(email) = lower($1)", [email]);
  const ok = rows[0] && (await bcrypt.compare(password, rows[0].password_hash));
  if (!ok) return res.status(401).json({ error: "Invalid email or password." });
  res.json({ token: sign(rows[0]), user: publicUser(rows[0]) });
});

router.get("/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT id, name, email FROM users WHERE id = $1", [req.userId]);
  if (!rows[0]) return res.status(401).json({ error: "Please log in." });
  res.json({ user: rows[0] });
});

module.exports = { router, requireAuth };
