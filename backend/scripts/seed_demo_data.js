
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const sqlPath = path.join(__dirname, '../../sql/demodata_seed.sql');

const db = new sqlite3.Database(dbPath);

const sqlContent = fs.readFileSync(sqlPath, 'utf8');
const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);

async function seed() {
    console.log(`Starting execution of ${statements.length} statements...`);
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        try {
            await new Promise((resolve, reject) => {
                db.run(stmt, (err) => {
                    if (err) {
                        console.error(`Error in statement ${i + 1}:`, stmt);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (err) {
            console.error('Seeding halted due to error:', err.message);
            db.close();
            process.exit(1);
        }
    }
    
    console.log('All statements executed successfully.');
    db.close();
}

seed();
