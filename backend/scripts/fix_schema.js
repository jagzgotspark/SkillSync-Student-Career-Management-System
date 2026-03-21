
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const migrations = [
    "ALTER TABLE Companies ADD COLUMN website TEXT;",
    "ALTER TABLE JobRoles ADD COLUMN location TEXT;",
    "ALTER TABLE JobRoles ADD COLUMN min_cgpa REAL DEFAULT 0.0;",
    "ALTER TABLE JobRoles ADD COLUMN job_type TEXT DEFAULT 'Full-Time';",
    "ALTER TABLE JobRoles ADD COLUMN posted_date DATETIME DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE StudentSkills ADD COLUMN proficiency_level TEXT DEFAULT 'Intermediate';",
    "ALTER TABLE Projects ADD COLUMN project_url TEXT;"
];

async function runMigrations() {
    for (const sql of migrations) {
        try {
            await new Promise((resolve, reject) => {
                db.run(sql, (err) => {
                    if (err) {
                        if (err.message.includes("duplicate column name")) {
                            console.log(`Column already exists: ${sql}`);
                            resolve();
                        } else {
                            reject(err);
                        }
                    } else {
                        console.log(`Executed: ${sql}`);
                        resolve();
                    }
                });
            });
        } catch (err) {
            console.error(`Migration failed: ${sql}`, err.message);
        }
    }
    db.close();
}

runMigrations();
