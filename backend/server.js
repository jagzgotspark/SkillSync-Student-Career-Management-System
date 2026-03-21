const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health Check
app.get("/health", (req, res) => res.json({ status: "ok", message: "SkillSync Backend is Live!" }));


const userRoutes = require("./routes/users");
const studentRoutes = require("./routes/students");
const careerRoutes = require("./routes/careers");
const analyticsRoutes = require("./routes/analytics");
const skillRoutes = require("./routes/skills");
const authRoutes = require("./routes/auth");
const companyRoutes = require("./routes/companies");

app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/careers", careerRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/applications", require("./routes/applications"));
app.use("/api/search", require("./routes/search"));

// Serve Static Frontend and Uploads
const frontendPath = path.join(__dirname, "../frontend/public");
const srcPath = path.join(__dirname, "../frontend/src");
const uploadsPath = path.join(__dirname, "uploads");
app.use(express.static(frontendPath));
app.use('/src', express.static(srcPath));
app.use('/uploads', express.static(uploadsPath));

// Routes for common pages
app.get("/", (req, res) => res.sendFile(path.join(frontendPath, "landing.html")));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/signup.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/login.html')));
app.get('/careers', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/careers.html')));
app.get('/recruiters', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/recruiters.html')));
app.get('/mentorship', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/mentorship.html')));
app.get('/analytics', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/analytics.html')));
app.get('/students', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/students.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/index.html')));
app.get('/skill-gap', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/skill-gap.html')));
app.get('/leaderboard', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/leaderboard.html')));
app.get('/resume-score', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/resume-score.html')));
app.get('/applications', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/applications.html')));
app.get('/company-dashboard', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/company-dashboard.html')));
app.get('/company', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/company-dashboard.html')));

const PORT = process.env.PORT || 3002;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 SkillSync Backend & Frontend Live!`);
  console.log(`🔗 Access it at: http://localhost:${PORT}`);
});