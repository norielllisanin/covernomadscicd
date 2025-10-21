const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const {
	getPolicyProducts,
	createPolicy,
	getPolicies,
	getPolicyCoi,
	verifyPolicyCoi,
	getPolicyInvoice,
	getPolicyReceipt,
	updatePolicy,
	emailPolicy,
	policyTicket,
	// cancelPolicy,
	getAllPolicyProducts,
	getFilteredPolicies,
	updatePolicyStatus,
	setInitalAmendValues,
	premiumFix,
	getPolicyProductsBrokerAgency,
} = require('../controllers/policy.controller');
const {
	validate,
} = require('../middleware/validators/policy.controller.validator');
const authCvnAdmin = require('../middleware/authCvnAdmin');
const authClient = require('../middleware/authClient');
const {
	getPolicyQuotation,
	ihoGetPolicyQuotation,
} = require('../controllers/quote.controller');
//POST routes
router.post(
	'/',
	authClient(['USER', 'WHOLESELLER', 'ADMIN', 'BROKER', 'INSURER']),
	validate('createPolicy'),
	errorHandler(createPolicy)
);
router.post(
	'/get-products',
	// authToken,
	authClient(['USER', 'WHOLESELLER', 'INSURER', 'ADMIN', 'BROKER']),
	// validate('getPolicyProducts'),
	errorHandler(getPolicyProducts)
);
router.post(
	'/get-products/broker-agency',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),

	errorHandler(getPolicyProductsBrokerAgency)
);
router.post(
	'/get-allproducts',
	authCvnAdmin,
	validate('getPolicyProducts'),
	errorHandler(getAllPolicyProducts)
);
router.post(
	'/email/:policyId',
	authClient(['ADMIN', 'USER', 'WHOLESELLER', 'BROKER', 'INSURER']),
	errorHandler(emailPolicy)
);
router.post(
	'/ticket/:policyId',
	authClient(['USER', 'WHOLESELLER', 'ADMIN', 'BROKER', 'INSURER']),
	// validate('policyTicket'),
	errorHandler(policyTicket)
);
// router.post('/cancel/:policyId', authCvnAdmin, errorHandler(cancelPolicy));

//GET routes
router.get('/get-policies', authClient(['ADMIN']), getFilteredPolicies);
router.get(
	'/:page',
	authClient(['USER', 'WHOLESELLER', 'ADMIN', 'BROKER', 'INSURER']),
	errorHandler(getPolicies)
);
router.get('/coi/:policyId', errorHandler(getPolicyCoi));
router.get('/invoice/:policyId', errorHandler(getPolicyInvoice));
router.get('/receipt/:policyId', errorHandler(getPolicyReceipt));
router.get('/verify/:policyId', errorHandler(verifyPolicyCoi));
router.get('/policy/quotation', errorHandler(getPolicyQuotation));
router.get('/iho/quotation', errorHandler(ihoGetPolicyQuotation));
//PATCH routes
router.patch(
	'/update-policy-status',
	authCvnAdmin,
	errorHandler(updatePolicyStatus)
);
router.patch(
	'/:policyId',
	authClient(['WHOLESELLER', 'ADMIN', 'USER', 'INSURER', 'BROKER']),
	validate('updatePolicy'),
	errorHandler(updatePolicy)
);
router.post(
	'/add-inital-amend-values',
	authCvnAdmin,
	errorHandler(setInitalAmendValues)
);

router.post('/premium-fix', errorHandler(premiumFix));

module.exports = router;
