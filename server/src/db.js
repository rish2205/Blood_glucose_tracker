const { Pool, types } = require("pg");

// Keep DATE columns as 'YYYY-MM-DD' strings so JS never shifts them by time zone.
types.setTypeParser(1082, (v) => v);

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

module.exports = pool;
