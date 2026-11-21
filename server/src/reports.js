const { Router } = require("express");
const pool = require("./db");
const { isRealDate, todayStr } = require("./validation");

const router = Router();

// Date maths on 'YYYY-MM-DD' strings through UTC, so time zones never shift a day.
const fromParts = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);

// Ranges for a selected date: that day, 1st of its month to that day, and the whole previous month.
function ranges(date) {
  const [y, m] = date.split("-").map(Number);
  return {
    daily: [date, date],
    monthToDate: [fromParts(y, m - 1, 1), date],
    previousMonth: [fromParts(y, m - 2, 1), fromParts(y, m - 1, 0)],
  };
}

async function stats(userId, [from, to]) {
  const { rows } = await pool.query(
    `SELECT MAX(value) AS highest, MIN(value) AS lowest, ROUND(AVG(value), 1) AS average, COUNT(*) AS count
     FROM readings WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
    [userId, from, to]
  );
  const r = rows[0];
  const count = Number(r.count);
  return {
    from, to, count,
    highest: count ? r.highest : null,
    lowest: count ? r.lowest : null,
    average: count ? Number(r.average) : null,
  };
}

router.get("/", async (req, res) => {
  const date = req.query.date === undefined ? todayStr() : String(req.query.date);
  if (!isRealDate(date)) return res.status(400).json({ error: "Please choose a valid date." });
  if (date > todayStr()) return res.status(400).json({ error: "Date cannot be in the future." });

  const r = ranges(date);
  const [daily, monthToDate, previousMonth, list] = await Promise.all([
    stats(req.userId, r.daily),
    stats(req.userId, r.monthToDate),
    stats(req.userId, r.previousMonth),
    pool.query(
      `SELECT id, slot, value FROM readings WHERE user_id = $1 AND reading_date = $2
       ORDER BY array_position(ARRAY['morning','after_breakfast','after_lunch','after_dinner'], slot)`,
      [req.userId, date]
    ),
  ]);
  res.json({ date, daily: { ...daily, readings: list.rows }, monthToDate, previousMonth });
});

module.exports = { router, ranges };
