const db = require("../config/db");

exports.getAllSkills = (req, res) => {
  db.query("SELECT * FROM Skills", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};
