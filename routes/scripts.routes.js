const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const authCvnAdmin = require('../middleware/authCvnAdmin');
const {
	fixPremium,
	transferCreditHistoryToPayment,
} = require('../controllers/scripts.controller');

//POST routes
router.post('/fix-premium', errorHandler(fixPremium));
router.post(
	'/transfer-credithistory-to-payment',
	// authCvnAdmin,
	errorHandler(transferCreditHistoryToPayment)
);

module.exports = router;
