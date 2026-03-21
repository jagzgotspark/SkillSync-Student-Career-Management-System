const { get, query, run } = require('./config/db');

async function test(studentId) {
    try {
        console.log("Fetching student...");
        const student = await get(
            `SELECT student_id, name, email, department, year, cgpa, phone,
                    profile_image, total_points, linkedin_url, github_url
             FROM Students WHERE student_id = ? AND (role='student' OR role IS NULL)`,
            [studentId]
        );
        console.log("Student:", student);
        
        console.log("Fetching skills...");
        const skills = await query(
            `SELECT sk.skill_name, COALESCE(spl.level_name, ss.skill_level) AS level
             FROM StudentSkills ss
             JOIN Skills sk ON ss.skill_id = sk.skill_id
             LEFT JOIN SkillProficiencyLevels spl ON ss.proficiency_id = spl.proficiency_id
             WHERE ss.student_id = ?`, [studentId]);
             console.log("Skills:", skills.length);
             
        console.log("Fetching projects...");
        const projects = await query(
            `SELECT title, description, tech_stack, github_link as github_url
             FROM Projects WHERE student_id = ?`, [studentId]);
             console.log("Projects:", projects.length);
             
        console.log("Fetching certificates...");
        const certificates = await query(
            `SELECT certificate_name as name, issuer, date_issued as issue_date FROM Certificates WHERE student_id = ?`, [studentId]);
             console.log("Certs:", certificates.length);
             
        console.log("Fetching applications...");
        const applications = await query(
            `SELECT jr.role_name, c.company_name, a.status, a.applied_date as applied_at
             FROM Applications a
             JOIN JobRoles jr ON a.role_id = jr.role_id
             JOIN Companies c ON jr.company_id = c.company_id
             WHERE a.student_id = ? ORDER BY a.applied_date DESC LIMIT 10`, [studentId]);
             console.log("Apps:", applications.length);
    } catch (e) {
        console.error("Error:", e);
    }
}
test(4);
