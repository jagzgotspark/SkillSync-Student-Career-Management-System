const { run } = require('./config/db');

async function go() {
    try {
        await run("ALTER TABLE Projects ADD COLUMN github_url TEXT;");
        console.log("Column github_url added to Projects successfully.");
    } catch(err) {
        console.error("Error:", err);
    }
}
go();
