const db = require("../config/db");

exports.getCareerMatch = (req, res) => {
  const studentId = req.params.id;

  const query = `
    SELECT 
      c.career_name,
      ROUND(
        (
          COUNT(DISTINCT ss.skill_id) /
          (SELECT COUNT(*) FROM Career_Skills cs2 WHERE cs2.career_id = c.career_id)
        ) * 100,
        2
      ) AS match_percentage
    FROM Careers c
    LEFT JOIN Career_Skills cs ON c.career_id = cs.career_id
    LEFT JOIN Student_Skills ss 
      ON ss.skill_id = cs.skill_id
      AND ss.student_id = ?
      AND ss.skill_level >= cs.required_level
    GROUP BY c.career_id, c.career_name
  `;

  db.query(query, [studentId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database query failed" });
    }

    res.json(results);
  });
};