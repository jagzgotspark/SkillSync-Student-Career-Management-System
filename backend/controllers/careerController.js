const db = require("../config/db");

exports.getAllUsers = (req, res) => {
  db.query("SELECT * FROM Users", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};