const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Connecting to database at:', dbPath);

db.serialize(() => {
    db.run("CREATE INDEX IF NOT EXISTS idx_students_dept ON Students(department);", (err) => {
        if (err) console.error('Error idx_students_dept:', err.message);
        else console.log('Index idx_students_dept created.');
    });
    db.run("CREATE INDEX IF NOT EXISTS idx_apps_status ON Applications(status);", (err) => {
        if (err) console.error('Error idx_apps_status:', err.message);
        else console.log('Index idx_apps_status created.');
    });
    db.run("CREATE INDEX IF NOT EXISTS idx_apps_student ON Applications(student_id);", (err) => {
        if (err) console.error('Error idx_apps_student:', err.message);
        else console.log('Index idx_apps_student created.');
    });
});
db.close();
