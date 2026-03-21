const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log("Checking FTS5 Search...");

db.serialize(() => {
    // Search for a common term or the one we just migrated
    db.all("SELECT * FROM Projects_FTS WHERE Projects_FTS MATCH 'Verification'", (err, rows) => {
        if (err) {
            console.error("Search error:", err);
        } else {
            console.log("FTS Search Results for 'Verification':", rows.length);
            rows.forEach(r => console.log(" - ", r.title));
        }
        db.close();
    });
});
