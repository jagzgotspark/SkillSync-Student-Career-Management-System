const { run } = require('../config/db');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function addUser(email, name, password) {
    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await run(
            `INSERT INTO Students (name, email, password_hash, role, department, year, cgpa) 
             VALUES (?, ?, ?, 'student', 'Computer Science', 3, 9.0)`,
            [name, email, hash]
        );
        console.log(`Successfully added user: ${name} (${email}) with ID: ${result.id}`);
        process.exit(0);
    } catch (err) {
        console.error('Error adding user:', err.message);
        process.exit(1);
    }
}

const [email, name, password] = process.argv.slice(2);

if (!email || !name || !password) {
    console.log('Usage: node add_user.js <email> <name> <password>');
    process.exit(1);
}

addUser(email, name, password);
