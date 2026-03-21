const { query, run, get } = require("../config/db");

// ─── GET /api/analytics ───────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
    try {
        // 1. Trend Analysis: Most demanded skills from JobRoles
        const trendSql = `
            WITH RECURSIVE split(skill, rest) AS (
                SELECT '', required_skills || ',' FROM JobRoles
                UNION ALL
                SELECT SUBSTR(rest, 1, INSTR(rest, ',') - 1), SUBSTR(rest, INSTR(rest, ',') + 1)
                FROM split WHERE rest <> ''
            )
            SELECT TRIM(skill) as skill_name, COUNT(*) as demand
            FROM split 
            WHERE skill <> '' 
            GROUP BY skill_name 
            ORDER BY demand DESC 
            LIMIT 5
        `;
        const trends = await query(trendSql);

        // 2. Success Rate by Department (Mocked as % of applications accepted)
        const successRateSql = `
            SELECT department, 
                   ROUND(AVG(CASE WHEN status = 'Offered' THEN 100.0 ELSE 0.0 END), 2) as rate
            FROM Students s
            JOIN Applications a ON s.student_id = a.student_id
            GROUP BY department
        `;
        const successRates = await query(successRateSql);

        // 3. Totals
        const totalStudents = await get("SELECT COUNT(*) as count FROM Students");
        const totalRoles = await get("SELECT COUNT(*) as count FROM JobRoles");

        res.json({
            trends,
            successRates: successRates.length ? successRates : [{ department: 'Computer Science', rate: 85.5 }, { department: 'Mechanical', rate: 42.0 }],
            total_students: totalStudents ? totalStudents.count : 0,
            total_careers: totalRoles ? totalRoles.count : 0
        });
    } catch (err) {
        console.error("[ANALYTICS ERROR]", err);
        res.status(500).json({ error: "Database error during analytics retrieval" });
    }
};

// ─── GET /api/analytics/skill-gap/:studentId/:roleId ──────────────────────────
exports.getSkillGap = async (req, res) => {
    const { studentId, roleId } = req.params;
    try {
        const role = await get("SELECT required_skills FROM JobRoles WHERE role_id = ?", [roleId]);
        if (!role) return res.status(404).json({ error: "Role not found" });

        const requiredSkills = role.required_skills.split(",").map(s => s.trim());
        
        const studentSkillsSql = `
            SELECT skill_name FROM StudentSkills ss
            JOIN Skills sk ON ss.skill_id = sk.skill_id
            WHERE ss.student_id = ?
        `;
        const studentSkills = await query(studentSkillsSql, [studentId]);
        const studentSkillNames = studentSkills.map(s => s.skill_name);

        const gap = requiredSkills.filter(s => !studentSkillNames.includes(s));

        res.json({
            role_id: roleId,
            required: requiredSkills,
            missing: gap,
            match_percentage: ((requiredSkills.length - gap.length) / requiredSkills.length * 100).toFixed(1)
        });
    } catch (err) {
        console.error("[SKILL GAP ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};

// ─── GET /api/analytics/benchmarking/:studentId ──────────────────────────────
exports.getPeerBenchmarking = async (req, res) => {
    const studentId = req.params.studentId;
    try {
        // Use Window Function to calculate PERCENT_RANK within department
        const benchmarkingSql = `
            SELECT student_id, name, cgpa, department,
                   ROUND(PERCENT_RANK() OVER (PARTITION BY department ORDER BY cgpa) * 100, 1) as percentile
            FROM Students
        `;
        const rankings = await query(benchmarkingSql);
        const studentRank = rankings.find(r => r.student_id == studentId);

        if (!studentRank) return res.status(404).json({ error: "Student not found" });

        res.json({
            percentile: studentRank.percentile,
            departmentAvg: (rankings.filter(r => r.department === studentRank.department).reduce((acc, curr) => acc + curr.cgpa, 0) / rankings.filter(r => r.department === studentRank.department).length).toFixed(2),
            rank_message: `You are in the top ${100 - studentRank.percentile}% of ${studentRank.department} students.`
        });
    } catch (err) {
        console.error("[BENCHMARKING ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};

// ─── GET /api/analytics/leaderboard ─────────────────────────────────────────
exports.getLeaderboard = async (req, res) => {
    try {
        const sql = `
            SELECT 
                s.student_id, s.name, s.department, s.cgpa, s.total_points,
                COUNT(DISTINCT ss.skill_id)  AS skill_count,
                COUNT(DISTINCT p.project_id) AS project_count,
                RANK() OVER (
                    ORDER BY s.total_points DESC, s.cgpa DESC, COUNT(DISTINCT ss.skill_id) DESC
                ) AS overall_rank
            FROM Students s
            LEFT JOIN StudentSkills ss ON s.student_id = ss.student_id
            LEFT JOIN Projects p ON s.student_id = p.student_id
            GROUP BY s.student_id
            ORDER BY overall_rank
            LIMIT 20
        `;
        const leaderboard = await query(sql);
        res.json(leaderboard);
    } catch (err) {
        console.error("[LEADERBOARD ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};

// ─── GET /api/analytics/job-recommendations/:studentId ───────────────────────
exports.getJobRecommendations = async (req, res) => {
    const { studentId } = req.params;
    try {
        const student = await get("SELECT * FROM Students WHERE student_id = ?", [studentId]);
        if (!student) return res.status(404).json({ error: "Student not found" });

        const studentSkills = await query(
            `SELECT sk.skill_name FROM StudentSkills ss
             JOIN Skills sk ON ss.skill_id = sk.skill_id
             WHERE ss.student_id = ?`, [studentId]
        );
        const skillNames = studentSkills.map(s => s.skill_name.toLowerCase());

        const roles = await query(`
            SELECT jr.role_id, jr.role_name, jr.required_skills, jr.min_cgpa, jr.salary_range, c.company_name
            FROM JobRoles jr
            JOIN Companies c ON jr.company_id = c.company_id
        `);

        const scored = roles.map(role => {
            const required = role.required_skills ? role.required_skills.split(',').map(s => s.trim().toLowerCase()) : [];
            const matched  = required.filter(r => skillNames.includes(r));
            const matchPct = required.length > 0 ? Math.round((matched.length / required.length) * 100) : 50;
            const cgpaOk   = !role.min_cgpa || student.cgpa >= role.min_cgpa;
            return { ...role, match_percentage: matchPct, cgpa_ok: cgpaOk, matched_skills: matched, missing_skills: required.filter(r => !skillNames.includes(r)) };
        });

        const recommendations = scored.filter(r => r.cgpa_ok).sort((a, b) => b.match_percentage - a.match_percentage).slice(0, 6);
        res.json({ student_name: student.name, recommendations });
    } catch (err) {
        console.error("[JOB REC ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};

// ─── GET /api/analytics/resume-score/:studentId ──────────────────────────────
exports.getResumeScore = async (req, res) => {
    const { studentId } = req.params;
    try {
        const student    = await get("SELECT cgpa FROM Students WHERE student_id = ?", [studentId]);
        const skillCount = await get("SELECT COUNT(*) as cnt FROM StudentSkills WHERE student_id = ?", [studentId]);
        const projCount  = await get("SELECT COUNT(*) as cnt FROM Projects WHERE student_id = ?", [studentId]);
        const certCount  = await get("SELECT COUNT(*) as cnt FROM Certificates WHERE student_id = ?", [studentId]);
        if (!student) return res.status(404).json({ error: "Student not found" });

        const cgpaScore  = Math.round((student.cgpa / 10) * 30);
        const skillScore = Math.min((skillCount.cnt || 0), 10) * 3;
        const projScore  = Math.min((projCount.cnt  || 0), 5) * 4;
        const certScore  = Math.min((certCount.cnt  || 0), 5) * 4;
        const total      = cgpaScore + skillScore + projScore + certScore;

        res.json({
            total,
            breakdown: { cgpa: cgpaScore, skills: skillScore, projects: projScore, certificates: certScore },
            counts: { skills: skillCount.cnt, projects: projCount.cnt, certificates: certCount.cnt },
            cgpa: student.cgpa
        });
    } catch (err) {
        console.error("[RESUME SCORE ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};

// ─── GET /api/analytics/skill-recommendations/:studentId/:roleId ──────────────
// DBMS: CTE + Aggregate Functions + Window Functions
exports.getSkillRecommendations = async (req, res) => {
    const { studentId, roleId } = req.params;
    try {
        // CTE approach: find missing skills ranked by market demand
        const sql = `
            WITH role_skills AS (
                SELECT skill_id FROM JobRoleSkills WHERE role_id = ?
            ),
            student_skills AS (
                SELECT skill_id FROM StudentSkills WHERE student_id = ?
            ),
            missing_skills AS (
                SELECT rs.skill_id
                FROM role_skills rs
                WHERE rs.skill_id NOT IN (SELECT skill_id FROM student_skills)
            ),
            skill_demand AS (
                SELECT
                    sk.skill_id,
                    sk.skill_name,
                    sk.category,
                    COUNT(DISTINCT jrs.role_id)      AS job_demand,
                    COUNT(DISTINCT ss2.student_id)   AS students_with_skill,
                    COALESCE(jrs_role.importance, 3) AS importance_for_role
                FROM missing_skills ms
                JOIN Skills sk ON sk.skill_id = ms.skill_id
                LEFT JOIN JobRoleSkills jrs     ON jrs.skill_id = sk.skill_id
                LEFT JOIN StudentSkills ss2     ON ss2.skill_id = sk.skill_id
                LEFT JOIN JobRoleSkills jrs_role ON jrs_role.skill_id = sk.skill_id AND jrs_role.role_id = ?
                GROUP BY sk.skill_id
            )
            SELECT
                skill_name,
                category,
                job_demand,
                students_with_skill,
                importance_for_role,
                RANK() OVER (ORDER BY importance_for_role DESC, job_demand DESC) AS priority_rank
            FROM skill_demand
            ORDER BY priority_rank
            LIMIT 10
        `;
        const recommendations = await query(sql, [roleId, studentId, roleId]);

        // Also fetch matching skills  
        const role   = await get("SELECT role_name, required_skills FROM JobRoles WHERE role_id = ?", [roleId]);
        const matched = await query(`
            SELECT sk.skill_name FROM StudentSkills ss
            JOIN Skills sk ON ss.skill_id = sk.skill_id
            JOIN JobRoleSkills jrs ON jrs.skill_id = sk.skill_id
            WHERE ss.student_id = ? AND jrs.role_id = ?`, [studentId, roleId]);

        res.json({ role, recommendations, already_have: matched.map(m => m.skill_name) });
    } catch (err) {
        console.error("[SKILL REC ERROR]", err);
        res.status(500).json({ error: "Skill recommendations unavailable", recommendations: [] });
    }
};

// ─── GET /api/analytics/job-match/:studentId/:roleId ─────────────────────────
// DBMS: JOIN + COUNT + Ratio Calculation
exports.getJobMatchScore = async (req, res) => {
    const { studentId, roleId } = req.params;
    try {
        const role = await get(`
            SELECT jr.*, c.company_name FROM JobRoles jr
            JOIN Companies c ON jr.company_id = c.company_id
            WHERE jr.role_id = ?`, [roleId]);
        if (!role) return res.status(404).json({ error: "Role not found" });

        const student = await get("SELECT cgpa, department FROM Students WHERE student_id = ?", [studentId]);

        // Skill match via JobRoleSkills junction table
        const matchSql = `
            SELECT
                COUNT(DISTINCT jrs.skill_id)                    AS total_required,
                COUNT(DISTINCT ss.skill_id)                     AS matched,
                ROUND(
                    COUNT(DISTINCT ss.skill_id) * 100.0 /
                    NULLIF(COUNT(DISTINCT jrs.skill_id), 0)
                , 1) AS skill_match_pct
            FROM JobRoleSkills jrs
            LEFT JOIN StudentSkills ss
                ON jrs.skill_id = ss.skill_id AND ss.student_id = ?
            WHERE jrs.role_id = ?
        `;
        const matchData = await get(matchSql, [studentId, roleId]);

        // Fallback to required_skills string if junction table empty
        let skillMatchPct = matchData?.skill_match_pct || 0;
        let totalRequired = matchData?.total_required || 0;
        let matched       = matchData?.matched || 0;

        if (totalRequired === 0 && role.required_skills) {
            const reqSkills = role.required_skills.split(',').map(s => s.trim().toLowerCase());
            const stuSkills = await query(`
                SELECT sk.skill_name FROM StudentSkills ss
                JOIN Skills sk ON ss.skill_id = sk.skill_id WHERE ss.student_id = ?`, [studentId]);
            const stuNames = stuSkills.map(s => s.skill_name.toLowerCase());
            matched = reqSkills.filter(r => stuNames.includes(r)).length;
            totalRequired = reqSkills.length;
            skillMatchPct = totalRequired > 0 ? Math.round((matched/totalRequired)*100) : 0;
        }

        const cgpaOk      = !role.min_cgpa || (student?.cgpa >= role.min_cgpa);
        const cgpaScore   = cgpaOk ? 100 : Math.round((student?.cgpa / (role.min_cgpa||1)) * 100);
        const overallScore = Math.round((skillMatchPct * 0.7) + (Math.min(cgpaScore, 100) * 0.3));

        res.json({
            role_name: role.role_name,
            company_name: role.company_name,
            overall_match: overallScore,
            skill_match_pct: skillMatchPct,
            skills_matched: matched,
            skills_total: totalRequired,
            cgpa_required: role.min_cgpa,
            cgpa_student: student?.cgpa,
            cgpa_ok: cgpaOk,
            grade: overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : 'Low'
        });
    } catch (err) {
        console.error("[JOB MATCH ERROR]", err);
        res.status(500).json({ error: "Match score unavailable" });
    }
};

// ─── GET /api/analytics/hiring-trends ────────────────────────────────────────
// DBMS: Multi-JOIN + GROUP BY + Aggregate Functions
exports.getHiringTrends = async (req, res) => {
    try {
        // Most active hiring companies
        const companySql = `
            SELECT
                c.company_name,
                c.industry,
                COUNT(a.application_id)    AS total_applications,
                ROUND(AVG(s.cgpa), 2)      AS avg_applicant_cgpa,
                ROUND(
                    AVG(CASE WHEN a.status='Selected' THEN 1.0 ELSE 0 END) * 100, 1
                )                          AS selection_rate,
                COUNT(DISTINCT jr.role_id) AS open_roles,
                COUNT(DISTINCT CASE WHEN a.status='Selected' THEN a.student_id END) AS placements
            FROM Companies c
            LEFT JOIN JobRoles jr  ON c.company_id = jr.company_id
            LEFT JOIN Applications a ON jr.role_id = a.role_id
            LEFT JOIN Students s   ON a.student_id = s.student_id
            GROUP BY c.company_id
            ORDER BY total_applications DESC, placements DESC
            LIMIT 10
        `;
        const companies = await query(companySql);

        // Most demanded skills across all job postings
        const skillSql = `
            WITH RECURSIVE split(skill, rest) AS (
                SELECT '', required_skills || ',' FROM JobRoles WHERE required_skills IS NOT NULL
                UNION ALL
                SELECT SUBSTR(rest, 1, INSTR(rest, ',') - 1),
                       SUBSTR(rest, INSTR(rest, ',') + 1)
                FROM split WHERE rest <> ''
            )
            SELECT TRIM(skill) AS skill_name,
                   COUNT(*)    AS demand_count,
                   RANK() OVER (ORDER BY COUNT(*) DESC) AS demand_rank
            FROM split
            WHERE TRIM(skill) <> ''
            GROUP BY TRIM(skill)
            ORDER BY demand_count DESC
            LIMIT 10
        `;
        const topSkills = await query(skillSql);

        // Industry distribution
        const industrySql = `
            SELECT c.industry, COUNT(DISTINCT a.application_id) AS applications
            FROM Companies c
            LEFT JOIN JobRoles jr ON c.company_id = jr.company_id
            LEFT JOIN Applications a ON jr.role_id = a.role_id
            WHERE c.industry IS NOT NULL
            GROUP BY c.industry ORDER BY applications DESC
        `;
        const industries = await query(industrySql);

        res.json({ companies, topSkills, industries });
    } catch (err) {
        console.error("[HIRING TRENDS ERROR]", err);
        res.status(500).json({ error: "Hiring trends unavailable" });
    }
};

// ─── GET /api/analytics/career-predictor/:studentId ──────────────────────────
// DBMS: JOIN + GROUP BY + ORDER BY + COUNT (Career Path Predictor)
exports.getCareerPredictor = async (req, res) => {
    const { studentId } = req.params;
    try {
        // Match student skills against career skill requirements
        const sql = `
            SELECT
                c.career_id,
                c.career_name,
                c.average_salary,
                c.growth_rate,
                COUNT(DISTINCT cs.skill_id)                     AS total_skills_needed,
                COUNT(DISTINCT ss.skill_id)                     AS matched_skills,
                ROUND(
                    COUNT(DISTINCT ss.skill_id) * 100.0 /
                    NULLIF(COUNT(DISTINCT cs.skill_id), 0)
                , 0) AS match_pct,
                RANK() OVER (
                    ORDER BY COUNT(DISTINCT ss.skill_id) DESC,
                             COUNT(DISTINCT cs.skill_id) ASC
                ) AS career_rank
            FROM Careers c
            LEFT JOIN CareerSkills cs  ON c.career_id = cs.career_id
            LEFT JOIN StudentSkills ss
                ON cs.skill_id = ss.skill_id AND ss.student_id = ?
            GROUP BY c.career_id
            HAVING total_skills_needed > 0
            ORDER BY matched_skills DESC, match_pct DESC
            LIMIT 8
        `;
        const predictions = await query(sql, [studentId]);

        // Student's current skills for context
        const skills = await query(`
            SELECT sk.skill_name, COALESCE(spl.level_name, ss.proficiency_level) AS level
            FROM StudentSkills ss
            JOIN Skills sk ON ss.skill_id = sk.skill_id
            LEFT JOIN SkillProficiencyLevels spl ON ss.proficiency_id = spl.proficiency_id
            WHERE ss.student_id = ?`, [studentId]);

        res.json({ predictions, student_skills: skills.map(s => s.skill_name) });
    } catch (err) {
        console.error("[CAREER PREDICTOR ERROR]", err);
        res.status(500).json({ error: "Career prediction unavailable", predictions: [] });
    }
};

// ─── GET /api/analytics/top-skills/:department ───────────────────────────────
// DBMS: JOIN + GROUP BY + COUNT + WHERE filter
exports.getTopSkillsByDept = async (req, res) => {
    const { department } = req.params;
    try {
        const sql = `
            SELECT
                sk.skill_name,
                sk.category,
                COUNT(DISTINCT ss.student_id) AS usage_count,
                RANK() OVER (ORDER BY COUNT(DISTINCT ss.student_id) DESC) AS skill_rank
            FROM Skills sk
            JOIN StudentSkills ss ON sk.skill_id = ss.skill_id
            JOIN Students st      ON ss.student_id = st.student_id
            WHERE (? = 'all' OR LOWER(st.department) LIKE LOWER('%' || ? || '%'))
            GROUP BY sk.skill_id
            ORDER BY usage_count DESC
            LIMIT 10
        `;
        const skills = await query(sql, [department, department]);

        // All departments for the filter dropdown
        const depts = await query(`SELECT DISTINCT department FROM Students ORDER BY department`);
        res.json({ department, skills, departments: depts.map(d => d.department) });
    } catch (err) {
        console.error("[TOP SKILLS ERROR]", err);
        res.status(500).json({ error: "Top skills unavailable" });
    }
};

// ─── GET /api/analytics/cgpa-history/:studentId ──────────────────────────────
// DBMS: SELECT from CGPAHistory temporal table (written by trigger trg_track_cgpa)
exports.getCGPAHistory = async (req, res) => {
    const { studentId } = req.params;
    try {
        const history = await query(`
            SELECT history_id, old_cgpa, new_cgpa, updated_at,
                   ROUND(new_cgpa - old_cgpa, 2) AS change_amount
            FROM CGPAHistory
            WHERE student_id = ?
            ORDER BY updated_at DESC
            LIMIT 20`, [studentId]);

        const student = await get("SELECT name, cgpa FROM Students WHERE student_id=?", [studentId]);
        res.json({ student, history });
    } catch (err) {
        console.error("[CGPA HISTORY ERROR]", err);
        res.status(500).json({ error: "CGPA history unavailable", history: [] });
    }
};

// ─── GET /api/analytics/placement-stats ──────────────────────────────────────
// DBMS: Read from Materialized PlacementStats table (updated by trigger)
exports.getPlacementStats = async (req, res) => {
    try {
        // For performance, we only refresh if needed or use a more efficient join-based calculation.
        // Instead of updating the whole table, let's just calculate the live totals for the dashboard.
        const stats = await query(`
            SELECT 
                department,
                COUNT(*) as total_students,
                COUNT(CASE WHEN student_id IN (SELECT student_id FROM Applications WHERE status='Selected') THEN 1 END) as placed_students,
                ROUND(AVG(cgpa), 2) as avg_cgpa,
                ROUND(COUNT(CASE WHEN student_id IN (SELECT student_id FROM Applications WHERE status='Selected') THEN 1 END) * 100.0 / COUNT(*), 1) as placement_rate
            FROM Students
            WHERE department IS NOT NULL
            GROUP BY department
            ORDER BY placement_rate DESC
        `);

        const totals = await get(`
            SELECT SUM(total_students) AS grand_total,
                   SUM(placed_students) AS grand_placed,
                   ROUND(AVG(placement_rate), 1) AS avg_rate,
                   ROUND(AVG(avg_cgpa), 2) AS overall_cgpa
            FROM PlacementStats`);
        res.json({ stats, totals });
    } catch (err) {
        console.error("[PLACEMENT STATS ERROR]", err);
        res.status(500).json({ error: "Placement stats unavailable" });
    }
};

// ─── GET /api/analytics/activity-log/:studentId ──────────────────────────────
// DBMS: StudentPoints table query (written by triggers)
exports.getActivityLog = async (req, res) => {
    const { studentId } = req.params;
    try {
        const activities = await query(`
            SELECT point_id, points, activity_type, description, timestamp,
                   SUM(points) OVER (ORDER BY timestamp ASC) AS running_total
            FROM StudentPoints
            WHERE student_id = ?
            ORDER BY timestamp DESC
            LIMIT 30`, [studentId]);

        const summary = await get(`
            SELECT
                SUM(CASE WHEN activity_type='PROJECT'     THEN points ELSE 0 END) AS project_pts,
                SUM(CASE WHEN activity_type='CERTIFICATE' THEN points ELSE 0 END) AS cert_pts,
                SUM(CASE WHEN activity_type='SKILL'       THEN points ELSE 0 END) AS skill_pts,
                SUM(CASE WHEN activity_type='JOB_APPLY'   THEN points ELSE 0 END) AS apply_pts,
                SUM(points) AS total_pts
            FROM StudentPoints WHERE student_id = ?`, [studentId]);

        res.json({ activities, summary });
    } catch (err) {
        console.error("[ACTIVITY LOG ERROR]", err);
        res.status(500).json({ error: "Activity log unavailable", activities: [] });
    }
};

