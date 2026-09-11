const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// Save score
app.post("/score", async (req, res) => {
  const { team, score } = req.body;

  try {
    await pool.query(
      "INSERT INTO scores(team, score) VALUES($1, $2)",
      [team, score]
    );

    res.json({ message: "Score saved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get scores
app.get("/scores", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM scores ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching scores:", err.message);
    res.status(500).json({ error: "Error fetching scores from database" });
  }
});

const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error("Server error:", err);
  }
});