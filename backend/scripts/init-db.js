const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const initDb = async () => {
  db.serialize(async () => {
    console.log("Creating tables...");

    // 1. Students
    db.run(`CREATE TABLE IF NOT EXISTS Students (
      student_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      cgpa REAL CHECK(cgpa <= 10),
      department TEXT,
      year INTEGER,
      phone TEXT,
      profile_image TEXT
    )`);

    // 2. Skills
    db.run(`CREATE TABLE IF NOT EXISTS Skills (
      skill_id INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_name TEXT NOT NULL UNIQUE,
      category TEXT
    )`);

    // 3. StudentSkills (Many-to-Many)
    db.run(`CREATE TABLE IF NOT EXISTS StudentSkills (
      student_skill_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      skill_id INTEGER,
      skill_level TEXT,
      FOREIGN KEY(student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
      FOREIGN KEY(skill_id) REFERENCES Skills(skill_id) ON DELETE CASCADE
    )`);

    // 4. Projects
    db.run(`CREATE TABLE IF NOT EXISTS Projects (
      project_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      github_link TEXT,
      tech_stack TEXT,
      FOREIGN KEY(student_id) REFERENCES Students(student_id) ON DELETE CASCADE
    )`);

    // 5. Certificates
    db.run(`CREATE TABLE IF NOT EXISTS Certificates (
      certificate_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      certificate_name TEXT NOT NULL,
      issuer TEXT,
      date_issued TEXT,
      FOREIGN KEY(student_id) REFERENCES Students(student_id) ON DELETE CASCADE
    )`);

    // 6. Hackathons
    db.run(`CREATE TABLE IF NOT EXISTS Hackathons (
      hackathon_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organizer TEXT,
      location TEXT,
      date TEXT,
      prize_pool TEXT
    )`);

    // 7. HackathonParticipation
    db.run(`CREATE TABLE IF NOT EXISTS HackathonParticipation (
      participation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      hackathon_id INTEGER,
      position TEXT,
      FOREIGN KEY(student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
      FOREIGN KEY(hackathon_id) REFERENCES Hackathons(hackathon_id) ON DELETE CASCADE
    )`);

    // 8. Companies
    db.run(`CREATE TABLE IF NOT EXISTS Companies (
      company_id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      industry TEXT,
      location TEXT
    )`);

    // 9. JobRoles
    db.run(`CREATE TABLE IF NOT EXISTS JobRoles (
      role_id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      role_name TEXT NOT NULL,
      salary_range TEXT,
      required_skills TEXT,
      FOREIGN KEY(company_id) REFERENCES Companies(company_id) ON DELETE CASCADE
    )`);

    // 10. Applications
    db.run(`CREATE TABLE IF NOT EXISTS Applications (
      application_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      role_id INTEGER,
      status TEXT DEFAULT 'Pending',
      applied_date TEXT,
      FOREIGN KEY(student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
      FOREIGN KEY(role_id) REFERENCES JobRoles(role_id) ON DELETE CASCADE
    )`);

    // VIEWS
    db.run(`CREATE VIEW IF NOT EXISTS TopStudents AS
      SELECT name, cgpa, department FROM Students WHERE cgpa > 8.5`);

    // TRIGGERS (Simulated via CHECK in SQLite, but let's add a log trigger)
    db.run(`CREATE TABLE IF NOT EXISTS AuditLog (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      table_name TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TRIGGER IF NOT EXISTS log_student_insert
      AFTER INSERT ON Students
      BEGIN
        INSERT INTO AuditLog (action, table_name) VALUES ('INSERT', 'Students');
      END;`);

    // INDEXES
    db.run(`CREATE INDEX IF NOT EXISTS idx_student_email ON Students(email)`);

    console.log("Seeding data...");
    
    // Seed Skills
    const skills = [
      ['React', 'Frontend'], ['Node.js', 'Backend'], ['Python', 'AI/ML'], 
      ['SQL', 'Database'], ['Docker', 'DevOps'], ['Figma', 'Design'],
      ['Java', 'Backend'], ['C++', 'Systems'], ['AWS', 'Cloud'], ['Cybersecurity', 'Security']
    ];
    skills.forEach(s => db.run(`INSERT OR IGNORE INTO Skills (skill_name, category) VALUES (?, ?)`, s));

    // Seed Companies
    const companies = [
      ['Google', 'Tech', 'Mountain View'], ['Microsoft', 'Tech', 'Redmond'],
      ['Amazon', 'E-commerce', 'Seattle'], ['Apple', 'Tech', 'Cupertino'], ['Meta', 'Social Media', 'Menlo Park']
    ];
    companies.forEach(c => db.run(`INSERT OR IGNORE INTO Companies (company_name, industry, location) VALUES (?, ?, ?)`, c));

    // Seed JobRoles
    const roles = [
      [1, 'Software Engineer', '₹15L - 30L', 'React, Node.js, SQL'],
      [1, 'Data Scientist', '₹18L - 35L', 'Python, SQL, AI/ML'],
      [2, 'Frontend Developer', '₹12L - 25L', 'React, Figma, CSS'],
      [3, 'DevOps Engineer', '₹14L - 28L', 'Docker, AWS, Linux']
    ];
    roles.forEach(r => db.run(`INSERT OR IGNORE INTO JobRoles (company_id, role_name, salary_range, required_skills) VALUES (?, ?, ?, ?)`, r));

    // Seed Hackathons
    const hacks = [
      ['Smart India Hackathon', 'Govt of India', 'Multiple', '2025-08-15', '₹1,00,000'],
      ['Google Solution Challenge', 'Google', 'Online', '2025-03-28', '$3,000'],
      ['ETHIndia', 'Devfolio', 'Bangalore', '2025-12-01', '₹30,00,000']
    ];
    hacks.forEach(h => db.run(`INSERT OR IGNORE INTO Hackathons (name, organizer, location, date, prize_pool) VALUES (?, ?, ?, ?, ?)`, h));

    // Default student for demo
    const hashedPw = await bcrypt.hash('password123', 10);
    db.run(`INSERT OR IGNORE INTO Students (name, email, password_hash, cgpa, department, year) 
      VALUES (?, ?, ?, ?, ?, ?)`, 
      ['Demo Student', 'student@example.com', hashedPw, 9.2, 'Computer Science', 3]);

    console.log("Database initialized successfully!");
  });
};

initDb();
