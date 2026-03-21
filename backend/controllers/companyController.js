const db = require("../config/db");

exports.getCompanies = async (req, res) => {
    try {
        const companies = await db.query("SELECT * FROM Companies");
        res.json(companies);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
};

// ─── POST /api/companies/power-search ───────────────────────
exports.powerSearch = async (req, res) => {
    const { minCgpa, skill, department } = req.body;
    try {
        let sql = `
            SELECT s.student_id, s.name, s.cgpa, s.department,
                   GROUP_CONCAT(sk.skill_name) as skills
            FROM Students s
            LEFT JOIN StudentSkills ss ON s.student_id = ss.student_id
            LEFT JOIN Skills sk ON ss.skill_id = sk.skill_id
            WHERE 1=1
        `;
        const params = [];

        if (minCgpa) {
            sql += " AND s.cgpa >= ?";
            params.push(parseFloat(minCgpa));
        }

        if (department) {
            sql += " AND s.department = ?";
            params.push(department);
        }

        sql += " GROUP BY s.student_id";

        // Filtering by skill using HAVING for relational strictness
        if (skill) {
            sql += " HAVING skills LIKE ?";
            params.push(`%${skill}%`);
        }

        const students = await db.query(sql, params);
        res.json(students);
    } catch (err) {
        console.error("[POWER SEARCH ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};
