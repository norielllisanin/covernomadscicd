const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const authCvnAdmin = require('../middleware/authCvnAdmin');
const {
	stripeWebhook,
	createBalanceClearanceCheckoutUrl,
	getPaymentHistory,
	topUpBalance,
	ihoTopUpBalance,
} = require('../controllers/payment.controller');
const authClient = require('../middleware/authClient');
const {
	validate,
} = require('../middleware/validators/payment.controller.validator');

// GET routes
router.get(
	'/',
	authClient(['WHOLESELLER', 'USER']),
	errorHandler(getPaymentHistory)
);
//POST routes
router.post('/stripe-webhook', errorHandler(stripeWebhook));
router.post(
	'/balance/clearance',
	authClient(['WHOLESELLER', 'USER']),
	validate('createBalanceClearanceCheckoutUrl'),
	errorHandler(createBalanceClearanceCheckoutUrl)
);
router.post(
	'/balance/topup/:id',
	authClient(['ADMIN', 'WHOLESELLER', 'AGENCY']),
	errorHandler(topUpBalance)
);
router.post(
	'/balance/iho/topup/:id',
	authClient(['BROKER', 'INSURER', 'AGENCY']),
	errorHandler(ihoTopUpBalance)
);
module.exports = router;
