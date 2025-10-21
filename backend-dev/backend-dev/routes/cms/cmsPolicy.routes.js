const express = require('express');
const router = express.Router();
const { errorHandler } = require('../../middleware/errorHandler');
const {
	createPolicy,
	getPolicies,
	setInitalAmendValues,
	premiumFix,
	getPolicyCmsCoi,
	getPolicyCmsInvoice,
	getPolicyCmsReceipt,
	getCmsPolicyQuotation,
	updateCmsPolicyStatus,
	updateCmsPolicy,
	emailCmsPolicy,
	policyTicketCms,
	verifyCmsPolicyCoi,
} = require('../../controllers/cms/cmsPolicy.controller');
const {
	validate,
} = require('../../middleware/validators/cms/cms.policy.controller.validator');
const authCvnAdmin = require('../../middleware/authCvnAdmin');
const authClient = require('../../middleware/authClient');
const {
	getAllCmsPolicyProducts,
} = require('../../controllers/cms/cmsPolicy.controller');
const authClientCms = require('../../middleware/validators/cms/authClientCms');
const {
	getPolicyProductsBrokerAgency,
} = require('../../controllers/policy.controller');
//POST routes

router.post(
	'/',
	// authClient(['USER', 'WHOLESELLER', 'ADMIN', 'BROKER', 'INSURER']),
	validate('createPolicy'),
	errorHandler(createPolicy)
);

router.post(
	'/get-products/broker-agency',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),

	errorHandler(getPolicyProductsBrokerAgency)
);
router.post(
	'/get-cms-allproducts',
	// authCmsAdmin,
	// validate('getPolicyProducts'),
	errorHandler(getAllCmsPolicyProducts)
);
router.post(
	'/email/:policyId',
	authClientCms(['ADMIN', 'USER', 'CMS', 'BROKER', 'INSURER']),
	errorHandler(emailCmsPolicy)
);
router.post(
	'/ticket/:policyId',
	authClientCms(['USER', 'CMS', 'ADMIN', 'BROKER', 'INSURER']),
	// validate('policyTicket'),
	errorHandler(policyTicketCms)
);

router.get(
	'/:page',
	// authClient(['USER', 'WHOLESELLER', 'ADMIN', 'BROKER', 'INSURER']),
	errorHandler(getPolicies)
);
router.get('/coi/:policyId', errorHandler(getPolicyCmsCoi));
router.get('/invoice/:policyId', errorHandler(getPolicyCmsInvoice));
router.get('/receipt/:policyId', errorHandler(getPolicyCmsReceipt));
router.get('/verify/:policyId', errorHandler(verifyCmsPolicyCoi));
// router.get('/iho/quotation', errorHandler(ihoGetPolicyQuotation));
//PATCH routes
router.patch(
	'/update-cms-policy-status',
	authCvnAdmin,
	errorHandler(updateCmsPolicyStatus)
);
router.patch(
	'/:policyId',
	authClientCms(['CMS', 'ADMIN', 'USER', 'INSURER', 'BROKER']),
	validate('updatePolicy'),
	errorHandler(updateCmsPolicy)
);
router.post(
	'/add-inital-amend-values',
	authCvnAdmin,
	errorHandler(setInitalAmendValues)
);

router.post('/premium-fix', errorHandler(premiumFix));

module.exports = router;
