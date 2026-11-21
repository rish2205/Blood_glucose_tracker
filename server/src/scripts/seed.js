// Demo data for local development. Fake credentials only: demo@sweety.local / Demo@12345
require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("../db");
const { SLOTS } = require("../validation");

const EMAIL = "demo@sweety.local";
const PASSWORD = "Demo@12345";

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

(async () => {
  if (/_test$/.test(process.env.PGDATABASE)) throw new Error("Seed is for the dev database only.");
  const hash = await bcrypt.hash(PASSWORD, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ('Demo User', $1, $2)
     ON CONFLICT (lower(email)) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [EMAIL, hash]
  );
  const userId = rows[0].id;
  await pool.query("DELETE FROM readings WHERE user_id = $1", [userId]);

  const keys = Object.keys(SLOTS);
  let n = 0;
  for (let back = 0; back < 70; back++) {
    const d = new Date();
    d.setDate(d.getDate() - back);
    for (let s = 0; s < keys.length; s++) {
      if ((back * 3 + s) % 5 === 0) continue; // leave some gaps so empty slots exist
      const value = 90 + ((back * 17 + s * 29) % 110) + (s === 0 ? 0 : 20);
      await pool.query(
        "INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)",
        [userId, iso(d), keys[s], Math.min(value, 600)]
      );
      n++;
    }
  }
  console.log(`Seeded ${n} readings for ${EMAIL} (password: ${PASSWORD}).`);
  await pool.end();
})().catch((e) => {
  console.error("seed failed:", e.message);
  process.exit(1);
});
