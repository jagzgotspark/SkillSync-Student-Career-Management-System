const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/", (req, res) => {
  console.log("Users route hit");
  userController.getAllUsers(req, res);
});

module.exports = router;