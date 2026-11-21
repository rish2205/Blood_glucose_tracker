// Creates the separate test database (default: sweety_db_test) if it does not exist.
require("dotenv").config();
const { Client } = require("pg");

const name = process.env.PGDATABASE_TEST || "sweety_db_test";
if (!/^[a-z0-9_]+_test$/.test(name) || name === process.env.PGDATABASE) {
  console.error(`Refusing: test database name "${name}" must end in _test and differ from PGDATABASE.`);
  process.exit(1);
}

(async () => {
  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    database: "postgres",
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });
  await client.connect();
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (rowCount) console.log(`Database "${name}" already exists.`);
  else {
    await client.query(`CREATE DATABASE ${name}`); // name validated above
    console.log(`Created database "${name}".`);
  }
  await client.end();
})().catch((e) => {
  console.error("create-test-db failed:", e.message);
  process.exit(1);
});
