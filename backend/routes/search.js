const express = require('express');
const router = express.Router();
const extrasCtrl = require('../controllers/extrasController');

router.get('/', extrasCtrl.ftsSearch);

module.exports = router;
