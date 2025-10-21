const express = require('express');
const router = express.Router();
const {
	getAllCmsQuotations,
	getCmsQuotationById,
	cmsPaymentTransactionWebhook,
	createCmsQuote,
	emailCmsQuote,
	getCmsPolicyQuotation,
} = require('../../controllers/cms/cmsQuotes.controller');
const { errorHandler } = require('../../middleware/errorHandler');
const authClientCms = require('../../middleware/validators/cms/authClientCms');

router.post('/cms-create-quote', errorHandler(createCmsQuote));
router.get('/quotation', errorHandler(getCmsPolicyQuotation));
router.get('/cms-quotes/:page', errorHandler(getAllCmsQuotations));
router.get('/cms-quote-get-by-id/:quoteId', errorHandler(getCmsQuotationById));

router.post('/cms-quote-email/:quoteId', errorHandler(emailCmsQuote));
// POST routes

module.exports = router;
