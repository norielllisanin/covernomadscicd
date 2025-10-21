const express = require('express');
const {
	getReports,
	convertPolicyToReport,
	createReport,
	getMisReports,
} = require('../controllers/report.controller');
const authClient = require('../middleware/authClient');
const router = express.Router();

router.get('/get-report', authClient(['ADMIN']), getReports);
router.get('/get-mis-report', authClient(['ADMIN']), getMisReports);
router.get(
	'/convert-policy-to-report',
	// authClient(['ADMIN']),
	convertPolicyToReport
);

router.post('/create-report', createReport);

module.exports = router;
