const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const verify = async () => {
    db.serialize(() => {
        console.log("--- Verifying Schema Enhancements ---");

        // 1. Check columns
        db.all("PRAGMA table_info(Students)", (err, rows) => {
            const cols = rows.map(r => r.name);
            console.log("Students Columns:", cols);
            if (cols.includes('total_points') && cols.includes('created_at')) console.log("✅ Students schema OK");
        });

        // 2. Check Triggers
        db.run("INSERT INTO Projects (student_id, title) VALUES (1, 'Test Verification Project')");
        db.get("SELECT total_points FROM Students WHERE student_id = 1", (err, row) => {
            console.log("Student 1 Total Points after project insert:", row.total_points);
            // Assuming points were 0 or already had some, it should increase by 50
        });

        // 3. Check CGPA Audit Trigger
        db.run("UPDATE Students SET cgpa = 9.5 WHERE student_id = 1");
        db.get("SELECT * FROM AuditLog WHERE action = 'UPDATE_CGPA' ORDER BY timestamp DESC LIMIT 1", (err, row) => {
            if (row) {
                console.log("✅ Audit Log Trigger OK:", row);
            } else {
                console.log("❌ Audit Log Trigger FAILED");
            }
        });

        // 4. Check Views
        db.get("SELECT * FROM v_resume_flat LIMIT 1", (err, row) => {
            if (row) console.log("✅ v_resume_flat OK");
        });

        // 5. Check FTS
        db.all("SELECT * FROM Projects_FTS WHERE Projects_FTS MATCH 'Verification'", (err, rows) => {
            console.log("FTS Match Count:", rows.length);
            if (rows.length > 0) console.log("✅ FTS5 OK");
        });
    });
};

verify();
