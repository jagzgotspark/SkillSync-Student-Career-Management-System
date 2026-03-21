const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.put("/password", authController.changePassword);
router.delete("/delete", authController.deleteAccount);

module.exports = router;
