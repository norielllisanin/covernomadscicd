const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const {
	validate,
} = require('../middleware/validators/agency.controller.validator');
const {
	getAllAgencies,
	getSingleAgency,
	updateAgency,
	setInitalBalance,
	createBrokerAgency,
	createPolicy,
	getPolicyIhoCoi,
	getPolicyIhoInvoice,
	getPolicyIhoReceipt,
} = require('../controllers/agencyBroker.controller');
const authCvnAdmin = require('../middleware/authCvnAdmin');
const authClient = require('../middleware/authClient');
//POST routes
router.post(
	'/broker',
	authClient(['BROKER']),
	errorHandler(createBrokerAgency)
);
router.post(
	'/issue-policy',
	authClient(['USER', 'BROKER', 'INSURER', 'WHOLESELLER', 'ADMIN']),
	errorHandler(createPolicy)
);
router.patch(
	'/update-agency',
	authClient(['BROKER']),
	validate('updateAgency'),
	errorHandler(updateAgency)
);
router.get('/single-agency', authClient(['BROKER']), getSingleAgency);
router.get(
	'/:page',
	authClient(['BROKER', 'INSURER', 'USER']),
	errorHandler(getAllAgencies)
);
router.post('/set-status', errorHandler(setInitalBalance));
router.post(
	'/set-inital-balance',
	authCvnAdmin,
	errorHandler(setInitalBalance)
);
router.get('/coi/iho/:policyId', errorHandler(getPolicyIhoCoi));
router.get('/invoice/iho/:policyId', errorHandler(getPolicyIhoInvoice));
router.get('/receipt/iho/:policyId', errorHandler(getPolicyIhoReceipt));
module.exports = router;
