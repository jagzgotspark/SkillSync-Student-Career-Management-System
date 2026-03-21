const express = require('express');
const router = express.Router();
const appCtrl = require('../controllers/applicationController');

router.post('/', appCtrl.applyToJob);
router.get('/:studentId', appCtrl.getApplications);
router.patch('/:id/status', appCtrl.updateStatus);

module.exports = router;
