const { db, query, run, get } = require('../config/db');

// ─── POST /api/applications — Apply to Job (REAL TRANSACTION) ───────────────
exports.applyToJob = async (req, res) => {
    const { student_id, role_id } = req.body;
    if (!student_id || !role_id) return res.status(400).json({ error: 'student_id and role_id required' });
    try {
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION', err => { if (err) return reject(err); });
                // Check not already applied
                db.get('SELECT application_id FROM Applications WHERE student_id=? AND role_id=?',
                    [student_id, role_id], (err, row) => {
                    if (err) { db.run('ROLLBACK'); return reject(err); }
                    if (row)  { db.run('ROLLBACK'); return reject(new Error('ALREADY_APPLIED')); }

                    const now = new Date().toISOString();
                    // Insert application
                    db.run(
                        `INSERT INTO Applications (student_id, role_id, status, applied_date, updated_at)
                         VALUES (?, ?, 'Applied', ?, ?)`,
                        [student_id, role_id, now, now], (err) => {
                        if (err) { db.run('ROLLBACK'); return reject(err); }

                        // Log to AuditLog
                        db.run(
                            `INSERT INTO AuditLog (action, table_name, record_id, new_value)
                             VALUES ('JOB_APPLY', 'Applications', ?, ?)`,
                            [student_id, `Applied to role_id ${role_id}`], (err) => {
                            if (err) { db.run('ROLLBACK'); return reject(err); }
                            db.run('COMMIT', err => { if (err) return reject(err); resolve(); });
                        });
                    });
                });
            });
        });
        res.json({ success: true, message: 'Application submitted successfully!' });
    } catch (err) {
        if (err.message === 'ALREADY_APPLIED') return res.status(409).json({ error: 'You have already applied for this role.' });
        console.error('[APPLY ERROR]', err);
        res.status(500).json({ error: 'Transaction failed. Please try again.' });
    }
};

// ─── GET /api/applications/:studentId — Get Student Applications ────────────
exports.getApplications = async (req, res) => {
    const studentId = req.params.studentId;
    try {
        const apps = await query(`
            SELECT
                a.application_id,
                a.status,
                a.applied_date,
                a.updated_at,
                jr.role_name,
                jr.salary_range,
                jr.location,
                c.company_name,
                c.industry
            FROM Applications a
            JOIN JobRoles jr ON a.role_id = jr.role_id
            JOIN Companies c ON jr.company_id = c.company_id
            WHERE a.student_id = ?
            ORDER BY a.applied_date DESC
        `, [studentId]);
        res.json(apps);
    } catch (err) {
        console.error('[GET APPLICATIONS ERROR]', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// ─── PATCH /api/applications/:id/status — Update Application Status (Admin) ─
exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Applied', 'Shortlisted', 'Rejected', 'Selected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    try {
        const now = new Date().toISOString();
        await run(`UPDATE Applications SET status=?, updated_at=? WHERE application_id=?`, [status, now, id]);
        // Log status change
        await run(`INSERT INTO AuditLog (action, table_name, record_id, new_value) VALUES (?,?,?,?)`,
            ['STATUS_UPDATE', 'Applications', id, status]);
        res.json({ success: true });
    } catch (err) {
        console.error('[UPDATE STATUS ERROR]', err);
        res.status(500).json({ error: 'Database error' });
    }
};
