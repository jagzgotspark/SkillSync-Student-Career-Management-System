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

exports.getSkillGap = (req, res) => {
  const studentId = req.params.id;

  const query = `
    SELECT c.career_name, s.skill_name
    FROM Careers c
    JOIN Career_Skills cs ON c.career_id = cs.career_id
    JOIN Skills s ON cs.skill_id = s.skill_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM Student_Skills ss
      WHERE ss.student_id = ?
      AND ss.skill_id = cs.skill_id
      AND ss.skill_level >= cs.required_level
    )
  `;

  db.query(query, [studentId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database query failed" });
    }

    res.json(results);
  });
};
exports.getStudentDashboard = (req, res) => {
  const studentId = req.params.id;

  const studentQuery = `
    SELECT u.name, s.department, s.year
    FROM Students s
    JOIN Users u ON s.student_id = u.user_id
    WHERE s.student_id = ?
  `;

  const skillsQuery = `
    SELECT sk.skill_name, ss.skill_level
    FROM Student_Skills ss
    JOIN Skills sk ON ss.skill_id = sk.skill_id
    WHERE ss.student_id = ?
  `;

  const matchQuery = `
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

  db.query(studentQuery, [studentId], (err, studentResult) => {
    if (err) return res.status(500).json(err);

    db.query(skillsQuery, [studentId], (err, skillsResult) => {
      if (err) return res.status(500).json(err);

      db.query(matchQuery, [studentId], (err, matchResult) => {
        if (err) return res.status(500).json(err);

        res.json({
          student: studentResult[0],
          skills: skillsResult,
          career_match: matchResult
        });
      });
    });
  });
};