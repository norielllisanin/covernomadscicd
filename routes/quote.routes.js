const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const authClient = require('../middleware/authClient');
const {
	createQuote,
	getPolicyQuotation,
	ihoGetPolicyQuotation,
	getAllQuotations,
	emailQuote,
	getQuotationById,
	paymentTransactionWebhook,
} = require('../controllers/quote.controller');

//GET routes
router.get('/policy/quotation', errorHandler(getPolicyQuotation));
router.get('/iho/quotation', errorHandler(ihoGetPolicyQuotation));
router.get(
	'/:page',
	authClient(['USER', 'WHOLESELLER', 'ADMIN', 'BROKER', 'INSURER']),
	errorHandler(getAllQuotations)
);
router.get(
	'/get-by-id/:quoteId',
	// authClient(['USER', 'WHOLESELLER', 'ADMIN', 'BROKER', 'INSURER']),
	errorHandler(getQuotationById)
);

router.post('/email/:quoteId', errorHandler(emailQuote));
// POST routes
router.post('/payment/webhook', errorHandler(paymentTransactionWebhook));
router.post('/create', errorHandler(createQuote));

module.exports = router;
