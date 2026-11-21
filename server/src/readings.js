const { Router } = require("express");
const pool = require("./db");
const { SLOTS, isRealDate, validateReadingInput } = require("./validation");

const router = Router();
const COLUMNS = "id, to_char(reading_date, 'YYYY-MM-DD') AS date, slot, value";
const SLOT_ORDER = `array_position(ARRAY['morning','after_breakfast','after_lunch','after_dinner'], slot)`;

// Runs the checks that need the database, then calls write(client). One transaction per
// request; the user row is locked so two parallel requests cannot both pass the 4-per-day check.
async function saveReading(userId, input, readingId, write) {
  const invalid = validateReadingInput(input);
  if (invalid) return { status: 400, error: invalid };
  const date = input.date;
  const slot = input.slot;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
    const { rows } = await client.query(
      "SELECT slot FROM readings WHERE user_id = $1 AND reading_date = $2 AND id IS DISTINCT FROM $3",
      [userId, date, readingId ?? null]
    );
    let error = null;
    if (rows.length >= 4) error = "You can add only 4 readings per day.";
    else if (rows.some((r) => r.slot === slot)) {
      error = `You already have an ${SLOTS[slot]} reading for this date.`;
    }
    if (error) {
      await client.query("ROLLBACK");
      return { status: 400, error };
    }
    const row = await write(client);
    await client.query("COMMIT");
    return row ? { status: readingId ? 200 : 201, row } : { status: 404, error: "Reading not found." };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

const body = (req) => ({ date: req.body?.date, slot: req.body?.slot, value: req.body?.value });

router.get("/", async (req, res) => {
  const { date } = req.query;
  if (date !== undefined && !isRealDate(String(date))) {
    return res.status(400).json({ error: "Please choose a valid date." });
  }
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: "page must be 1 or more and limit between 1 and 100." });
  }
  // Both queries filter by user_id from the token, so paging can never reach another user's rows.
  const where = "user_id = $1 AND ($2::date IS NULL OR reading_date = $2::date)";
  const [list, count] = await Promise.all([
    pool.query(
      `SELECT ${COLUMNS} FROM readings WHERE ${where}
       ORDER BY reading_date DESC, ${SLOT_ORDER}, id DESC
       LIMIT $3 OFFSET $4`,
      [req.userId, date ?? null, limit, (page - 1) * limit]
    ),
    pool.query(`SELECT COUNT(*) FROM readings WHERE ${where}`, [req.userId, date ?? null]),
  ]);
  const total = Number(count.rows[0].count);
  res.json({ readings: list.rows, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

router.post("/", async (req, res) => {
  const input = body(req);
  const r = await saveReading(req.userId, input, null, async (c) =>
    (await c.query(
      `INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [req.userId, input.date, input.slot, Number(input.value)]
    )).rows[0]
  );
  res.status(r.status).json(r.row ? { reading: r.row } : { error: r.error });
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: "Reading not found." });
  const input = body(req);
  const r = await saveReading(req.userId, input, id, async (c) =>
    (await c.query(
      `UPDATE readings SET reading_date = $3, slot = $4, value = $5
       WHERE id = $1 AND user_id = $2 RETURNING ${COLUMNS}`,
      [id, req.userId, input.date, input.slot, Number(input.value)]
    )).rows[0]
  );
  res.status(r.status).json(r.row ? { reading: r.row } : { error: r.error });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { rowCount } = Number.isInteger(id)
    ? await pool.query("DELETE FROM readings WHERE id = $1 AND user_id = $2", [id, req.userId])
    : { rowCount: 0 };
  if (!rowCount) return res.status(404).json({ error: "Reading not found." });
  res.status(204).end();
});

module.exports = router;
