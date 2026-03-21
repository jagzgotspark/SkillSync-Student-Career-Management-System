const { query, run, get } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "skillsync_fallback_secret_2025";
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ─── POST /api/auth/register ──────────────────────────────────────────────────
exports.register = async (req, res) => {
    const { email, password, name, role, department, year, cgpa, organization } = req.body;

    if (!email || !password || !name || !role) {
        return res.status(400).json({ error: "All fields are required" });
    }

    if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
            error: "Password must be at least 8 characters with uppercase, lowercase, number and symbol." 
        });
    }

    // Normalize role
    const normalizedRole = ['mentor','company'].includes(role) ? role : 'student';

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const existing = await get("SELECT student_id FROM Students WHERE email = ?", [email]);
        if (existing) return res.status(400).json({ error: "Email already registered" });

        if (normalizedRole === 'student') {
            await run(
                `INSERT INTO Students (name, email, password_hash, role, department, year, cgpa) 
                 VALUES (?, ?, ?, 'student', ?, ?, ?)`,
                [name, email, passwordHash, department || null, year ? parseInt(year) : null, cgpa ? parseFloat(cgpa) : 0]
            );
        } else {
            // Mentor or Company — store in Students table with role flag, no academic fields
            await run(
                `INSERT INTO Students (name, email, password_hash, role, department) 
                 VALUES (?, ?, ?, ?, ?)`,
                [name, email, passwordHash, normalizedRole, organization || normalizedRole]
            );
        }

        res.json({ message: "Registration successful!" });
    } catch (err) {
        console.error("[REGISTER ERROR]", err);
        res.status(500).json({ error: "Server error during registration" });
    }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    try {
        const user = await get("SELECT * FROM Students WHERE email = ?", [email]);
        if (!user) return res.status(401).json({ error: "No account found with this email" });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: "Incorrect password" });

        const userRole = user.role || 'student';

        const token = jwt.sign(
            { id: user.student_id, role: userRole, email: user.email },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.student_id,
                name: user.name,
                role: userRole,
                email: user.email,
                department: user.department,
                profile_image: user.profile_image
            },
        });
    } catch (err) {
        console.error("[LOGIN ERROR]", err);
        res.status(500).json({ error: "Server error during login" });
    }
};

// ─── PUT /api/auth/password ───────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        const decoded = jwt.verify(token, JWT_SECRET);
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing required fields" });
        if (!passwordRegex.test(newPassword)) return res.status(400).json({ error: "Password too weak" });

        const user = await get("SELECT * FROM Students WHERE student_id = ?", [decoded.id]);
        if (!user) return res.status(404).json({ error: "User not found" });
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: "Incorrect current password" });

        const newHash = await bcrypt.hash(newPassword, 10);
        await run("UPDATE Students SET password_hash = ? WHERE student_id = ?", [newHash, decoded.id]);
        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("[PASSWORD UPDATE ERROR]", err);
        res.status(500).json({ message: "Server error or invalid token." });
    }
};

// ─── DELETE /api/auth/delete ──────────────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });
        const decoded = jwt.verify(token, JWT_SECRET);
        const { password } = req.body;
        if (!password) return res.status(400).json({ message: "Password required" });

        const user = await get("SELECT * FROM Students WHERE student_id = ?", [decoded.id]);
        if (!user) return res.status(404).json({ message: "User not found" });
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

        await run("DELETE FROM Students WHERE student_id = ?", [decoded.id]);
        res.json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error("[ACCOUNT DELETE ERROR]", err);
        res.status(500).json({ message: "Server error or invalid token." });
    }
};
