const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

router.get('/', companyController.getCompanies);
router.post('/power-search', companyController.powerSearch);

module.exports = router;
