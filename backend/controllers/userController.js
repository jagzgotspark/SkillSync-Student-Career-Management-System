const db = require("../config/db");

exports.getAllUsers = async (req, res) => {
  try {
    const results = await db.query("SELECT * FROM Students");
    res.json(results);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
};