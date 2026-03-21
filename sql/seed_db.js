
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../backend/database.sqlite');
const sqlPath = path.join(__dirname, 'demodata_seed.sql');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

const sql = fs.readFileSync(sqlPath, 'utf8');

// The SQL file contains multiple statements. 
// sqlite3's db.exec can handle multiple statements.
console.log('Starting data insertion...');
db.exec(sql, (err) => {
    if (err) {
        console.error('Error executing SQL', err);
        db.close();
        process.exit(1);
    }
    console.log('Data successfully inserted.');
    db.close();
});
