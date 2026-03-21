const { db: rawDb, query, run, get } = require("../config/db");

// ─── POST /api/students/:id/profile (Update Profile) ─────────────────────────
exports.updateProfile = async (req, res) => {
    const studentId = parseInt(req.params.id);
    let { skills, department, year, cgpa, career_goal, full_profile } = req.body;
    
    // Handle skills if sent as string via FormData
    let parsedSkills = [];
    if (typeof skills === 'string') {
        try { parsedSkills = JSON.parse(skills); } catch(e) { parsedSkills = []; }
    } else {
        parsedSkills = skills || [];
    }

    try {
        let profileImage = null;
        if (req.file) {
            profileImage = `/uploads/profile_images/${req.file.filename}`;
        }

        // Extract linkedin/github from full_profile if available
        let linkedin_url = null;
        let github_url = null;
        if (full_profile) {
            try {
                const fpData = JSON.parse(full_profile);
                linkedin_url = fpData['p-linkedin'] || null;
                github_url = fpData['p-github'] || null;
            } catch (e) {}
        }

        // Update basic student info
        await run(
            `UPDATE Students 
             SET department = ?, year = ?, cgpa = ?, phone = ?, profile_image = COALESCE(?, profile_image), full_profile = ?, linkedin_url = COALESCE(?, linkedin_url), github_url = COALESCE(?, github_url)
             WHERE student_id = ?`,
            [department, year, cgpa, req.body.phone || null, profileImage, full_profile || null, linkedin_url, github_url, studentId]
        );

        // Update Skills (Relational Way)
        // 1. Clear current skills for this student
        await run("DELETE FROM StudentSkills WHERE student_id = ?", [studentId]);

        // 2. Insert new skills (ensuring skills exist in master table first)
        for (const s of parsedSkills) {
            // Check if skill exists in master Skills table
            let skillMaster = await get("SELECT skill_id FROM Skills WHERE skill_name = ?", [s.skill_name]);
            if (!skillMaster) {
                const resSkill = await run("INSERT INTO Skills (skill_name) VALUES (?)", [s.skill_name]);
                skillMaster = { skill_id: resSkill.id };
            }

            // Get proficiency_id from name or use default 1 (Beginner)
            let prof = await get("SELECT proficiency_id FROM SkillProficiencyLevels WHERE level_name = ?", [s.level || 'Beginner']);
            let profId = prof ? prof.proficiency_id : 1;

            await run(
                "INSERT INTO StudentSkills (student_id, skill_id, proficiency_level, proficiency_id) VALUES (?, ?, ?, ?)",
                [studentId, skillMaster.skill_id, s.level || 'Beginner', profId]
            );
        }

        res.json({ message: "Profile updated successfully (DBMS)", profile_image: profileImage });
    } catch (err) {
        console.error("[PROFILE UPDATE ERROR]", err);
        res.status(500).json({ error: "Failed to update profile in database" });
    }
};

// ─── GET /api/students/:id/profile ─────────────────────────
exports.getProfile = async (req, res) => {
    const studentId = parseInt(req.params.id);
    try {
        const student = await get("SELECT * FROM Students WHERE student_id = ?", [studentId]);
        if (!student) return res.status(404).json({ error: "Profile not found" });

        // Get skills via JOIN with proficiency level
        const skills = await query(
            `SELECT sk.skill_name, COALESCE(spl.level_name, ss.skill_level) as level 
             FROM StudentSkills ss
             JOIN Skills sk ON ss.skill_id = sk.skill_id
             LEFT JOIN SkillProficiencyLevels spl ON ss.proficiency_id = spl.proficiency_id
             WHERE ss.student_id = ?`,
            [studentId]
        );

        res.json({
            profile_image: student.profile_image,
            full_profile: {
                ...student,
                skills: skills
            }
        });
    } catch (err) {
        console.error("[GET PROFILE ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};

// ─── GET /api/students/:id/resume ──────────────────────────
exports.getResume = async (req, res) => {
    const studentId = req.params.id;
    try {
        const resumeData = await db.get("SELECT * FROM v_resume_flat WHERE student_id = ?", [studentId]);
        if (!resumeData) return res.status(404).json({ error: "Resume data not found" });
        res.json(resumeData);
    } catch (err) {
        console.error("[RESUME ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};

// ─── GET /api/students/:id/dashboard (Real SQL Aggregation) ─────────────────────────
exports.getStudentDashboard = async (req, res) => {
    const studentId = parseInt(req.params.id);
    try {
        const student = await get("SELECT * FROM Students WHERE student_id = ?", [studentId]);
        if (!student) return res.status(404).json({ error: "Student not found" });

        const skills = await query(
            `SELECT sk.skill_name, ss.skill_level 
             FROM StudentSkills ss
             JOIN Skills sk ON ss.skill_id = sk.skill_id
             WHERE ss.student_id = ?`,
            [studentId]
        );

        if (skills.length === 0) {
            return res.json({
                needs_onboarding: true,
                student: student
            });
        }

        // Fetch Career Matches from Database (Simulating Career Path DB)
        const jobRoles = await query(
            `SELECT jr.*, c.company_name 
             FROM JobRoles jr
             JOIN Companies c ON jr.company_id = c.company_id
             LIMIT 5`
        );

        const careerMatches = jobRoles.map(role => ({
            career_name: role.role_name,
            match_percentage: (Math.random() * 20 + 80).toFixed(2), // Mock score based on role
            company: role.company_name
        }));

        res.json({
            needs_onboarding: false,
            student: student,
            skills: skills,
            career_match: careerMatches
        });
    } catch (err) {
        console.error("[DASHBOARD ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};

// ─── GET /api/students (JOIN Query for Recruiters / Mentors) ─────────────────
exports.getAllStudents = async (req, res) => {
    try {
        const { dept, min_cgpa, search } = req.query;
        let where = "WHERE (s.role = 'student' OR s.role IS NULL)";
        const params = [];
        if (dept)     { where += " AND s.department = ?";              params.push(dept); }
        if (min_cgpa) { where += " AND s.cgpa >= ?";                   params.push(parseFloat(min_cgpa)); }
        if (search)   { where += " AND (s.name LIKE ? OR s.department LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }

        const sql = `
            SELECT
                s.student_id, s.name, s.email, s.department, s.year, s.cgpa,
                s.profile_image, s.total_points,
                COUNT(DISTINCT ss.skill_id)       AS skill_count,
                COUNT(DISTINCT p.project_id)      AS project_count,
                COUNT(DISTINCT c.certificate_id)  AS cert_count,
                GROUP_CONCAT(DISTINCT sk.skill_name) AS top_skills
            FROM Students s
            LEFT JOIN StudentSkills ss ON s.student_id = ss.student_id
            LEFT JOIN Skills sk        ON ss.skill_id  = sk.skill_id
            LEFT JOIN Projects p       ON s.student_id = p.student_id
            LEFT JOIN Certificates c   ON s.student_id = c.student_id
            ${where}
            GROUP BY s.student_id
            ORDER BY s.cgpa DESC, s.total_points DESC
        `;
        const students = await query(sql, params);
        res.json(students);
    } catch (err) {
        console.error("[GET ALL STUDENTS ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};

// ─── GET /api/students/:id/detail (Full profile for mentor/company view) ──────
exports.getStudentDetail = async (req, res) => {
    const studentId = parseInt(req.params.id);
    try {
        const student = await get(
            `SELECT student_id, name, email, department, year, cgpa, phone,
                    profile_image, total_points, linkedin_url, github_url
             FROM Students WHERE student_id = ? AND (role='student' OR role IS NULL)`,
            [studentId]
        );
        if (!student) return res.status(404).json({ error: "Student not found" });

        const skills = await query(
            `SELECT sk.skill_name, COALESCE(spl.level_name, ss.skill_level) AS level
             FROM StudentSkills ss
             JOIN Skills sk ON ss.skill_id = sk.skill_id
             LEFT JOIN SkillProficiencyLevels spl ON ss.proficiency_id = spl.proficiency_id
             WHERE ss.student_id = ?`, [studentId]);
        const projects = await query(
            `SELECT title, description, tech_stack, github_link as github_url
             FROM Projects WHERE student_id = ?`, [studentId]);
        const certificates = await query(
            `SELECT certificate_name as name, issuer, date_issued as issue_date FROM Certificates WHERE student_id = ?`, [studentId]);
        const applications = await query(
            `SELECT jr.role_name, c.company_name, a.status, a.applied_date as applied_at
             FROM Applications a
             JOIN JobRoles jr ON a.role_id = jr.role_id
             JOIN Companies c ON jr.company_id = c.company_id
             WHERE a.student_id = ? ORDER BY a.applied_date DESC LIMIT 10`, [studentId]);

        res.json({ ...student, skills, projects, certificates, applications });
    } catch (err) {
        console.error("[STUDENT DETAIL ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};

// ─── GET /api/students/:id/match ──────────────────────────────
exports.getCareerMatch = (req, res) => {
    exports.getStudentDashboard(req, res);
};

exports.getSkillGap = async (req, res) => {
    res.json([
        { career_name: "Data Scientist", skill_name: "Python (Advanced)" },
        { career_name: "DevOps", skill_name: "Terasform" }
    ]);
};

exports.getRecommendations = async (req, res) => {
   res.json({ 
       Rec1: { opportunity_kind: "Internship", role: "SDE Intern", org_name: "Google", reason: "SQL Skills" },
       Rec2: { opportunity_kind: "Course", role: "Advanced DBMS", org_name: "Coursera", reason: "Academic path" }
   });
};