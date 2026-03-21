const express = require("express");
const router  = express.Router();
const ac = require("../controllers/analyticsController");
const ec = require("../controllers/extrasController");

// Existing routes
router.get("/",                              ac.getAnalytics);
router.get("/skill-gap/:studentId/:roleId",  ac.getSkillGap);
router.get("/benchmarking/:studentId",       ac.getPeerBenchmarking);
router.get("/leaderboard",                   ac.getLeaderboard);
router.get("/job-recommendations/:studentId",ac.getJobRecommendations);
router.get("/resume-score/:studentId",       ac.getResumeScore);
router.get("/auditlog/:studentId",           ec.getAuditLog);
router.get("/placement-score/:studentId",    ec.getPlacementScore);

// ── NEW ROUTES (Advanced DBMS Features) ──────────────────────────────────────
router.get("/skill-recommendations/:studentId/:roleId", ac.getSkillRecommendations);
router.get("/job-match/:studentId/:roleId",             ac.getJobMatchScore);
router.get("/hiring-trends",                            ac.getHiringTrends);
router.get("/career-predictor/:studentId",              ac.getCareerPredictor);
router.get("/top-skills/:department",                   ac.getTopSkillsByDept);
router.get("/cgpa-history/:studentId",                  ac.getCGPAHistory);
router.get("/placement-stats",                          ac.getPlacementStats);
router.get("/activity-log/:studentId",                  ac.getActivityLog);

module.exports = router;
