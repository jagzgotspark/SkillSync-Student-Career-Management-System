const { query, get } = require('../config/db');

// ─── GET /api/analytics/auditlog/:studentId ────────────────────────────────
exports.getAuditLog = async (req, res) => {
    const { studentId } = req.params;
    try {
        const logs = await query(`
            SELECT log_id, action, table_name, record_id, old_value, new_value, timestamp
            FROM AuditLog
            WHERE record_id = ? OR (action = 'JOB_APPLY' AND record_id = ?)
            ORDER BY timestamp DESC
            LIMIT 20
        `, [studentId, studentId]);

        // Humanize log messages
        const humanized = logs.map(l => {
            let icon = '📝', msg = `${l.action} on ${l.table_name}`;
            if (l.action === 'JOB_APPLY')          { icon = '💼'; msg = `Applied to a new job role`; }
            if (l.action === 'UPDATE_CGPA')         { icon = '🎓'; msg = `CGPA updated: ${l.old_value} → ${l.new_value}`; }
            if (l.action === 'STATUS_UPDATE')       { icon = '✅'; msg = `Application status changed to ${l.new_value}`; }
            if (l.action === 'UPDATE')              { icon = '✏️'; msg = `Profile updated`; }
            return { ...l, icon, message: msg };
        });
        res.json(humanized);
    } catch (err) {
        console.error('[AUDITLOG ERROR]', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// ─── GET /api/analytics/placement-score/:studentId ────────────────────────
exports.getPlacementScore = async (req, res) => {
    const { studentId } = req.params;
    try {
        const student   = await get('SELECT cgpa, department FROM Students WHERE student_id=?', [studentId]);
        const skillCnt  = await get('SELECT COUNT(*) as cnt FROM StudentSkills WHERE student_id=?', [studentId]);
        const projCnt   = await get('SELECT COUNT(*) as cnt FROM Projects WHERE student_id=?', [studentId]);
        const certCnt   = await get('SELECT COUNT(*) as cnt FROM Certificates WHERE student_id=?', [studentId]);
        const appCnt    = await get('SELECT COUNT(*) as cnt FROM Applications WHERE student_id=?', [studentId]);

        if (!student) return res.status(404).json({ error: 'Student not found' });

        // Weighted formula (max 100):
        // CGPA: 35    → (cgpa/10)*35
        // Skills: 25  → min(skills,10)*2.5
        // Projects: 25→ min(projects,5)*5
        // Certs: 10   → min(certs,5)*2
        // Applied: 5  → min(applied,5)*1
        const cgpa      = parseFloat(student.cgpa) || 0;
        const cgpaW     = (cgpa / 10) * 35;
        const skillW    = Math.min((skillCnt?.cnt || 0), 10) * 2.5;
        const projW     = Math.min((projCnt?.cnt  || 0), 5)  * 5;
        const certW     = Math.min((certCnt?.cnt  || 0), 5)  * 2;
        const appW      = Math.min((appCnt?.cnt   || 0), 5)  * 1;
        const total     = Math.round(cgpaW + skillW + projW + certW + appW);

        // Department-based average for context
        const deptAvg = await get(`
            SELECT ROUND(AVG(
              ((s.cgpa/10)*35) +
              (MIN(COALESCE((SELECT COUNT(*) FROM StudentSkills ss WHERE ss.student_id=s.student_id),0),10)*2.5)+
              (MIN(COALESCE((SELECT COUNT(*) FROM Projects p WHERE p.student_id=s.student_id),0),5)*5)+
              (MIN(COALESCE((SELECT COUNT(*) FROM Certificates c WHERE c.student_id=s.student_id),0),5)*2)
            ),1) as avg_score
            FROM Students s WHERE department=?
        `, [student.department]);

        res.json({
            total,
            dept_avg: deptAvg?.avg_score || 0,
            department: student.department,
            breakdown: {
                cgpa: Math.round(cgpaW),
                skills: Math.round(skillW),
                projects: Math.round(projW),
                certificates: Math.round(certW),
                applications: Math.round(appW)
            }
        });
    } catch (err) {
        console.error('[PLACEMENT SCORE ERROR]', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// ─── GET /api/search?q=term ───────────────────────────────────────────────
exports.ftsSearch = async (req, res) => {
    const q = req.query.q || '';
    if (!q.trim()) return res.json({ jobs: [], projects: [] });
    try {
        // FTS5 job search
        const jobs = await query(`
            SELECT jr.role_id, jr.role_name, jr.required_skills, jr.salary_range, c.company_name
            FROM JobRoles_FTS fts
            JOIN JobRoles jr ON fts.role_id = jr.role_id
            JOIN Companies c ON jr.company_id = c.company_id
            WHERE JobRoles_FTS MATCH ?
            LIMIT 10
        `, [q + '*']).catch(() => []);

        // FTS5 project search
        const projects = await query(`
            SELECT p.project_id, p.title, p.description, p.tech_stack, s.name as student_name
            FROM Projects_FTS fts
            JOIN Projects p ON fts.project_id = p.project_id
            JOIN Students s ON p.student_id = s.student_id
            WHERE Projects_FTS MATCH ?
            LIMIT 10
        `, [q + '*']).catch(() => []);

        res.json({ jobs, projects });
    } catch (err) {
        console.error('[FTS SEARCH ERROR]', err);
        res.status(500).json({ error: 'Search failed' });
    }
};
