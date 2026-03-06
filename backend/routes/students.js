const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");

router.get("/:id/match", studentController.getCareerMatch);
router.get("/:id/skill-gap", studentController.getSkillGap);
router.get("/:id/dashboard", studentController.getStudentDashboard);

module.exports = router;

