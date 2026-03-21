const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const run = (sql, params=[]) => new Promise((res,rej) => db.run(sql, params, err => err ? rej(err) : res()));
const all = (sql, params=[]) => new Promise((res,rej) => db.all(sql, params, (err,rows) => err ? rej(err) : res(rows)));

const tableInfo = (table) => new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.name));
    });
});

const addColumn = async (table, column, type) => {
    const columns = await tableInfo(table);
    if (!columns.includes(column)) {
        console.log(`  ➕ Adding column ${column} to ${table}...`);
        await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
};

const migrate = async () => {
    console.log("\n🗄️  SkillSync — Database Migration v2\n");

    // ─── EXISTING STRUCTURE MIGRATIONS ────────────────────────────────────────

    await run(`CREATE TABLE IF NOT EXISTS SkillProficiencyLevels (
        proficiency_id INTEGER PRIMARY KEY,
        level_name TEXT NOT NULL UNIQUE
    )`);
    await run(`INSERT OR IGNORE INTO SkillProficiencyLevels VALUES (1,'Beginner'),(2,'Intermediate'),(3,'Expert')`);

    await addColumn('Students', 'total_points', 'INTEGER DEFAULT 0');
    await addColumn('Students', 'created_at', 'DATETIME');
    await addColumn('Students', 'updated_at', 'DATETIME');
    await addColumn('Projects', 'created_at', 'DATETIME');
    await addColumn('Projects', 'updated_at', 'DATETIME');
    await addColumn('Applications', 'updated_at', 'DATETIME');
    await addColumn('StudentSkills', 'proficiency_id', 'INTEGER REFERENCES SkillProficiencyLevels(proficiency_id)');
    await addColumn('AuditLog', 'record_id', 'INTEGER');
    await addColumn('AuditLog', 'old_value', 'TEXT');
    await addColumn('AuditLog', 'new_value', 'TEXT');

    // ─── NEW TABLES (FEATURE 1–8) ──────────────────────────────────────────────
    console.log("\n📋 Creating new tables...");

    // Materialized Placement Summary Table (Feature 3)
    await run(`CREATE TABLE IF NOT EXISTS PlacementStats (
        stat_id      INTEGER PRIMARY KEY AUTOINCREMENT,
        department   TEXT NOT NULL UNIQUE,
        total_students  INTEGER DEFAULT 0,
        placed_students INTEGER DEFAULT 0,
        avg_cgpa        REAL    DEFAULT 0.0,
        placement_rate  REAL    DEFAULT 0.0,
        last_updated    DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("  ✅ PlacementStats");

    // Historical CGPA Tracking Table (Feature 5)
    await run(`CREATE TABLE IF NOT EXISTS CGPAHistory (
        history_id  INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id  INTEGER NOT NULL,
        old_cgpa    REAL,
        new_cgpa    REAL,
        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE
    )`);
    console.log("  ✅ CGPAHistory");

    // Student Points Activity Log (Feature 4)
    await run(`CREATE TABLE IF NOT EXISTS StudentPoints (
        point_id      INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id    INTEGER NOT NULL,
        points        INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        description   TEXT,
        timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE
    )`);
    console.log("  ✅ StudentPoints");

    // RBAC — Roles table (Feature 8)
    await run(`CREATE TABLE IF NOT EXISTS Roles (
        role_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        role_name TEXT NOT NULL UNIQUE,
        description TEXT
    )`);
    await run(`INSERT OR IGNORE INTO Roles(role_name, description) VALUES
        ('student',   'Registered student with career access'),
        ('recruiter', 'Company recruiter with student directory access'),
        ('mentor',    'Industry mentor for guidance and sessions'),
        ('admin',     'Full system administration access')`);
    console.log("  ✅ Roles");

    // RBAC — UserRoles junction table (Feature 8)
    await run(`CREATE TABLE IF NOT EXISTS UserRoles (
        user_id  INTEGER NOT NULL,
        role_id  INTEGER NOT NULL,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES Roles(role_id) ON DELETE CASCADE
    )`);
    console.log("  ✅ UserRoles");

    // JobRoleSkills — proper junction table for M:N job-skill relationship
    await run(`CREATE TABLE IF NOT EXISTS JobRoleSkills (
        role_id   INTEGER NOT NULL,
        skill_id  INTEGER NOT NULL,
        importance INTEGER DEFAULT 1 CHECK(importance BETWEEN 1 AND 5),
        PRIMARY KEY (role_id, skill_id),
        FOREIGN KEY (role_id)  REFERENCES JobRoles(role_id) ON DELETE CASCADE,
        FOREIGN KEY (skill_id) REFERENCES Skills(skill_id) ON DELETE CASCADE
    )`);
    console.log("  ✅ JobRoleSkills");

    // ─── TRIGGERS ─────────────────────────────────────────────────────────────
    console.log("\n⚡ Creating triggers...");

    // Existing triggers (kept for compatibility)
    await run(`CREATE TRIGGER IF NOT EXISTS trg_add_project_points
        AFTER INSERT ON Projects
        BEGIN
            UPDATE Students SET total_points = total_points + 50, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = NEW.student_id;
            INSERT INTO StudentPoints(student_id, points, activity_type, description)
            VALUES(NEW.student_id, 50, 'PROJECT', 'Added project: ' || NEW.title);
            INSERT INTO AuditLog(action, table_name, record_id, new_value)
            VALUES('POINTS_AWARDED','Projects',NEW.student_id,'+50 pts — Project: '||NEW.title);
        END`);

    await run(`CREATE TRIGGER IF NOT EXISTS trg_cert_points
        AFTER INSERT ON Certificates
        BEGIN
            UPDATE Students SET total_points = total_points + 30, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = NEW.student_id;
            INSERT INTO StudentPoints(student_id, points, activity_type, description)
            VALUES(NEW.student_id, 30, 'CERTIFICATE', 'Earned certificate: ' || NEW.name);
            INSERT INTO AuditLog(action, table_name, record_id, new_value)
            VALUES('POINTS_AWARDED','Certificates',NEW.student_id,'+30 pts — Cert: '||NEW.name);
        END`);

    // Skill added points (Feature 4)
    await run(`CREATE TRIGGER IF NOT EXISTS trg_skill_points
        AFTER INSERT ON StudentSkills
        BEGIN
            UPDATE Students SET total_points = total_points + 10, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = NEW.student_id;
            INSERT INTO StudentPoints(student_id, points, activity_type, description)
            VALUES(NEW.student_id, 10, 'SKILL', 'Added skill_id: ' || NEW.skill_id);
        END`);

    // Job applied points (Feature 4)
    await run(`CREATE TRIGGER IF NOT EXISTS trg_application_points
        AFTER INSERT ON Applications
        BEGIN
            UPDATE Students SET total_points = total_points + 5
            WHERE student_id = NEW.student_id;
            INSERT INTO StudentPoints(student_id, points, activity_type, description)
            VALUES(NEW.student_id, 5, 'JOB_APPLY', 'Applied to role_id: ' || NEW.role_id);
            INSERT INTO AuditLog(action, table_name, record_id, new_value)
            VALUES('JOB_APPLY','Applications',NEW.student_id,'+5 pts — Applied to role '||NEW.role_id);
        END`);

    // CGPA History tracking (Feature 5)
    await run(`CREATE TRIGGER IF NOT EXISTS trg_track_cgpa
        AFTER UPDATE OF cgpa ON Students
        WHEN OLD.cgpa != NEW.cgpa
        BEGIN
            INSERT INTO CGPAHistory(student_id, old_cgpa, new_cgpa, updated_at)
            VALUES(NEW.student_id, OLD.cgpa, NEW.cgpa, CURRENT_TIMESTAMP);
            INSERT INTO AuditLog(action, table_name, record_id, old_value, new_value)
            VALUES('UPDATE_CGPA','Students',NEW.student_id,CAST(OLD.cgpa AS TEXT),CAST(NEW.cgpa AS TEXT));
        END`);

    // Placement stats trigger — fires when application becomes 'Selected' (Feature 3)
    await run(`CREATE TRIGGER IF NOT EXISTS trg_update_placement
        AFTER UPDATE OF status ON Applications
        WHEN NEW.status = 'Selected'
        BEGIN
            INSERT OR IGNORE INTO PlacementStats(department, total_students, placed_students)
            SELECT department, 0, 0 FROM Students WHERE student_id = NEW.student_id;

            UPDATE PlacementStats
            SET placed_students = placed_students + 1,
                last_updated = CURRENT_TIMESTAMP
            WHERE department = (SELECT department FROM Students WHERE student_id = NEW.student_id);

            UPDATE PlacementStats
            SET placement_rate = ROUND(placed_students * 100.0 / NULLIF(total_students,0), 1)
            WHERE department = (SELECT department FROM Students WHERE student_id = NEW.student_id);
        END`);

    // Application log trigger
    await run(`CREATE TRIGGER IF NOT EXISTS trg_application_log
        AFTER INSERT ON Applications
        BEGIN
            INSERT INTO AuditLog(action, table_name, record_id, new_value)
            VALUES('JOB_APPLY','Applications',NEW.student_id,'Applied to role_id '||NEW.role_id);
        END`);

    // Status change audit trigger
    await run(`CREATE TRIGGER IF NOT EXISTS trg_status_update
        AFTER UPDATE OF status ON Applications
        WHEN OLD.status != NEW.status
        BEGIN
            INSERT INTO AuditLog(action, table_name, record_id, old_value, new_value)
            VALUES('STATUS_UPDATE','Applications',NEW.application_id,OLD.status,NEW.status);
        END`);

    console.log("  ✅ All triggers created");

    // ─── VIEWS ────────────────────────────────────────────────────────────────
    console.log("\n👁️  Creating views...");

    await run(`CREATE VIEW IF NOT EXISTS v_resume_flat AS
        SELECT s.student_id, u.name, u.email, s.department, s.year, s.cgpa, s.total_points,
               GROUP_CONCAT(DISTINCT sk.skill_name) AS skills,
               GROUP_CONCAT(DISTINCT p.title) AS projects,
               GROUP_CONCAT(DISTINCT c.name) AS certificates,
               COUNT(DISTINCT ss.skill_id) AS skill_count,
               COUNT(DISTINCT p.project_id) AS project_count,
               COUNT(DISTINCT c.certificate_id) AS cert_count
        FROM Students s
        JOIN Users u ON s.student_id = u.user_id
        LEFT JOIN StudentSkills ss ON s.student_id = ss.student_id
        LEFT JOIN Skills sk        ON ss.skill_id = sk.skill_id
        LEFT JOIN Projects p       ON s.student_id = p.student_id
        LEFT JOIN Certificates c   ON s.student_id = c.student_id
        GROUP BY s.student_id`);

    await run(`CREATE VIEW IF NOT EXISTS v_active_jobs AS
        SELECT jr.role_id, jr.role_name, jr.required_skills, jr.salary_range,
               jr.location, jr.min_cgpa, jr.job_type,
               c.company_name, c.industry, c.website
        FROM JobRoles jr
        JOIN Companies c ON jr.company_id = c.company_id`);

    console.log("  ✅ Views created");

    // ─── FTS5 VIRTUAL TABLES ──────────────────────────────────────────────────
    console.log("\n🔍 Setting up FTS5...");
    await run(`CREATE VIRTUAL TABLE IF NOT EXISTS Projects_FTS USING fts5(
        project_id UNINDEXED, title, description, tech_stack,
        content='Projects', content_rowid='project_id')`);
    await run(`CREATE VIRTUAL TABLE IF NOT EXISTS JobRoles_FTS USING fts5(
        role_id UNINDEXED, role_name, required_skills,
        content='JobRoles', content_rowid='role_id')`);
    try { await run(`INSERT INTO Projects_FTS(Projects_FTS) VALUES('rebuild')`); } catch(e){}
    try { await run(`INSERT INTO JobRoles_FTS(JobRoles_FTS) VALUES('rebuild')`); } catch(e){}
    console.log("  ✅ FTS5 tables ready");

    // ─── INDEXES ──────────────────────────────────────────────────────────────
    console.log("\n🗂️  Creating indexes...");
    const indexes = [
        [`idx_students_dept`,    `ON Students(department)`],
        [`idx_students_cgpa`,    `ON Students(cgpa DESC)`],
        [`idx_students_points`,  `ON Students(total_points DESC)`],
        [`idx_applications_sid`, `ON Applications(student_id)`],
        [`idx_applications_rid`, `ON Applications(role_id)`],
        [`idx_applications_stat`,`ON Applications(status)`],
        [`idx_skills_name`,      `ON Skills(skill_name)`],
        [`idx_projects_sid`,     `ON Projects(student_id)`],
        [`idx_certs_sid`,        `ON Certificates(student_id)`],
        [`idx_auditlog_rid`,     `ON AuditLog(record_id)`],
        [`idx_auditlog_ts`,      `ON AuditLog(timestamp DESC)`],
        [`idx_cgpahistory_sid`,  `ON CGPAHistory(student_id)`],
        [`idx_studentpoints_sid`,`ON StudentPoints(student_id)`],
        [`idx_placements_dept`,  `ON PlacementStats(department)`],
    ];
    for (const [name, def] of indexes) {
        await run(`CREATE INDEX IF NOT EXISTS ${name} ${def}`);
    }
    console.log("  ✅ All indexes ready");

    // ─── SEED PlacementStats from existing Applications ────────────────────────
    console.log("\n🌱 Seeding PlacementStats from existing data...");
    await run(`INSERT OR IGNORE INTO PlacementStats(department, total_students, placed_students, avg_cgpa, placement_rate)
        SELECT
            s.department,
            COUNT(DISTINCT s.student_id) AS total_students,
            COUNT(DISTINCT CASE WHEN a.status='Selected' THEN a.student_id END) AS placed_students,
            ROUND(AVG(s.cgpa), 2) AS avg_cgpa,
            ROUND(COUNT(DISTINCT CASE WHEN a.status='Selected' THEN a.student_id END) * 100.0
                / NULLIF(COUNT(DISTINCT s.student_id), 0), 1) AS placement_rate
        FROM Students s
        LEFT JOIN Applications a ON s.student_id = a.student_id
        GROUP BY s.department`);
    console.log("  ✅ PlacementStats seeded");

    // ─── SEED JobRoleSkills from JobRoles.required_skills ────────────────────
    console.log("\n🌱 Seeding JobRoleSkills junction table...");
    const roles = await all(`SELECT role_id, required_skills FROM JobRoles WHERE required_skills IS NOT NULL`);
    for (const role of roles) {
        const skillNames = role.required_skills.split(',').map(s => s.trim()).filter(Boolean);
        for (const sn of skillNames) {
            const skillRow = await all(`SELECT skill_id FROM Skills WHERE skill_name = ? LIMIT 1`, [sn]);
            if (skillRow.length) {
                await run(`INSERT OR IGNORE INTO JobRoleSkills(role_id, skill_id, importance)
                    VALUES(?, ?, 3)`, [role.role_id, skillRow[0].skill_id]);
            }
        }
    }
    console.log("  ✅ JobRoleSkills seeded");

    // ─── SEED UserRoles from existing Students ────────────────────────────────────
    console.log("\n🌱 Seeding UserRoles...");
    await run(`INSERT OR IGNORE INTO UserRoles(user_id, role_id)
        SELECT s.student_id, r.role_id FROM Students s
        JOIN Roles r ON r.role_name = 'student'`);
    console.log("  ✅ UserRoles seeded");

    console.log("\n✅ Migration v2 complete!\n");
    db.close();
};

migrate().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
