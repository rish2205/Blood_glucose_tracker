const SLOTS = {
  morning: "Morning (fasting)",
  after_breakfast: "After breakfast",
  after_lunch: "After lunch",
  after_dinner: "After dinner",
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Today in the server's local time, as YYYY-MM-DD.
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// True only for real calendar dates (rejects 2026-02-31).
function isRealDate(s) {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toISOString().slice(0, 10) === s;
}

// Returns an error message, or null when the input is valid. Format-level rules only;
// "one per slot" and "max 4 per day" need the database (see readings.js).
function validateReadingInput({ date, slot, value }) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "Please enter a glucose value.";
  }
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 40 || n > 600) return "Value must be a whole number between 40 and 600 mg/dl.";
  if (typeof date !== "string" || !isRealDate(date)) return "Please choose a valid date.";
  if (date > todayStr()) return "Date cannot be in the future.";
  if (!Object.hasOwn(SLOTS, slot)) return "Please choose a time slot.";
  return null;
}

module.exports = { SLOTS, todayStr, isRealDate, validateReadingInput };
