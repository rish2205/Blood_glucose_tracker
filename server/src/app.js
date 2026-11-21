require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const auth = require("./auth");

const app = express();

app.use(cors({ origin: /^http:\/\/localhost:517[3-9]$/ }));
app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({ error: "Database connection failed." });
  }
});

app.use("/api/auth", auth.router);
app.use("/api/readings", auth.requireAuth, require("./readings"));
app.use("/api/reports", auth.requireAuth, require("./reports").router);

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

module.exports = app;
