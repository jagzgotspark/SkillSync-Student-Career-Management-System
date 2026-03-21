const express = require("express");
const router = express.Router();
const skillController = require("../controllers/skillController");

router.get("/", skillController.getAllSkills);

module.exports = router;
