const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads/profile_images");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `student_${req.params.id}_${Date.now()}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20 MB limit
});

router.get("/", studentController.getAllStudents);
router.get("/:id/detail", studentController.getStudentDetail);
router.get("/:id/match", studentController.getCareerMatch);
router.get("/:id/skill-gap", studentController.getSkillGap);
router.get("/:id/dashboard", studentController.getStudentDashboard);
router.get("/:id/recommendations", studentController.getRecommendations);
router.get("/:id/resume", studentController.getResume);
router.get("/:id/profile", studentController.getProfile);
router.post("/:id/profile", upload.single('profile_image'), studentController.updateProfile);

module.exports = router;
