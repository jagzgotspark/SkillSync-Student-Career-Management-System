const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");

router.get("/:id/match", studentController.getCareerMatch);

module.exports = router;