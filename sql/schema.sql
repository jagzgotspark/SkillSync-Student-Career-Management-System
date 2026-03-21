-- ============================================================
--  SkillSync: Student Career Management System
--  DATABASE SCHEMA — SQLite 3
--  Matched to actual project state (Students table handles Auth)
-- ============================================================

PRAGMA foreign_keys = ON;

-- Table: Students (Core table for all users: Students, Mentors, Companies)
CREATE TABLE IF NOT EXISTS Students (
    student_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'student' CHECK(role IN ('student', 'mentor', 'company', 'admin')),
    department    TEXT,
    year          INTEGER,
    cgpa          REAL,
    phone         TEXT,
    profile_image TEXT,
    total_points  INTEGER DEFAULT 0,
    resume_url    TEXT,
    linkedin_url  TEXT,
    github_url    TEXT,
    full_profile  TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: Skills
CREATE TABLE IF NOT EXISTS Skills (
    skill_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_name TEXT    UNIQUE NOT NULL,
    category   TEXT
);

-- Table: StudentSkills
CREATE TABLE IF NOT EXISTS StudentSkills (
    student_id        INTEGER NOT NULL,
    skill_id          INTEGER NOT NULL,
    proficiency_level TEXT    DEFAULT 'Intermediate',
    proficiency_id    INTEGER,
    PRIMARY KEY (student_id, skill_id),
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES Skills(skill_id) ON DELETE CASCADE
);

-- Table: Companies
CREATE TABLE IF NOT EXISTS Companies (
    company_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT    NOT NULL,
    industry     TEXT,
    location     TEXT,
    website      TEXT
);

-- Table: JobRoles
CREATE TABLE IF NOT EXISTS JobRoles (
    role_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id      INTEGER NOT NULL,
    role_name       TEXT    NOT NULL,
    required_skills TEXT,
    salary_range    TEXT,
    location        TEXT,
    min_cgpa        REAL    DEFAULT 0.0,
    job_type        TEXT    DEFAULT 'Full-Time',
    posted_date     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE
);

-- Table: Applications
CREATE TABLE IF NOT EXISTS Applications (
    application_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id     INTEGER NOT NULL,
    role_id        INTEGER NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'Applied',
    applied_date   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, role_id),
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id)    REFERENCES JobRoles(role_id) ON DELETE CASCADE
);

-- Table: Projects
CREATE TABLE IF NOT EXISTS Projects (
    project_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id   INTEGER NOT NULL,
    title        TEXT    NOT NULL,
    description  TEXT,
    tech_stack   TEXT,
    project_url  TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE
);

-- Table: Certificates
CREATE TABLE IF NOT EXISTS Certificates (
    certificate_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id        INTEGER NOT NULL,
    name              TEXT    NOT NULL,
    issuing_authority TEXT,
    issue_date        DATE,
    expiry_date       DATE,
    credential_url    TEXT,
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE
);

-- Table: JobRoleSkills
CREATE TABLE IF NOT EXISTS JobRoleSkills (
    role_id  INTEGER,
    skill_id INTEGER,
    PRIMARY KEY(role_id, skill_id),
    FOREIGN KEY(role_id) REFERENCES JobRoles(role_id),
    FOREIGN KEY(skill_id) REFERENCES Skills(skill_id)
);

-- Materialized Stats table for placement analytics
CREATE TABLE IF NOT EXISTS PlacementStats (
    dept_id         INTEGER PRIMARY KEY,
    department      TEXT UNIQUE,
    total_students  INTEGER,
    placed_students INTEGER,
    avg_cgpa        REAL,
    placement_rate  REAL,
    last_updated    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity Points table
CREATE TABLE IF NOT EXISTS StudentPoints (
    point_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id    INTEGER,
    points        INTEGER,
    activity_type TEXT, -- 'PROJECT', 'CERTIFICATE', 'SKILL', 'JOB_APPLY'
    description   TEXT,
    timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES Students(student_id)
);

-- CGPA Change History for line charts
CREATE TABLE IF NOT EXISTS CGPAHistory (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    old_cgpa   REAL,
    new_cgpa   REAL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES Students(student_id)
);