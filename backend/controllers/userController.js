const db = require("../config/db");

exports.getAllUsers = (req, res) => {
  console.log("Controller reached");

  const query = "SELECT * FROM Users";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Query error:", err);
      return res.status(500).json({ error: "Database query failed" });
    }

    console.log("Query executed successfully");
    res.json(results);
  });
};