const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const {
	validate,
} = require('../middleware/validators/broker.controller.validator');
const authClient = require('../middleware/authClient');
const {
	createBroker,
	getAllBrokers,
	getSingleBroker,
	updateBroker,
	logInBroker,
	getCurrentBroker,
	getAllAgencies,
	updateProfile,
	getBrokersSalesStatement,
	getAdminBroker,
	deleteBroker,
} = require('../controllers/broker.controller');
const { createPolicy } = require('../controllers/agencyBroker.controller');
const permissionManager = require('../middleware/permissionManager');

// LoginIn Broker
router.post('/log-in', errorHandler(logInBroker));
router.get(
	'/me',
	authClient(['ADMIN', 'USER', 'INSURER', 'BROKER']),
	errorHandler(getCurrentBroker)
);
router.get('/single-broker', errorHandler(getSingleBroker));
router.patch(
	'/update-profile',
	authClient(['BROKER']),
	errorHandler(updateProfile)
);
router.get(
	'/all-brokers',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),

	errorHandler(getAdminBroker)
);
//POST routes
router.post(
	'/',
	authClient(['BROKER', 'INSURER', 'ADMIN']),
	validate('createBroker'),
	errorHandler(createBroker)
);
router.get(
	'/single-broker',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),

	getSingleBroker
);
router.get(
	'/allAgencies',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),

	getAllAgencies
);
router.get(
	'/:page',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),

	errorHandler(getAllBrokers)
);
router.patch(
	'/update-broker',
	authClient(['BROKER', 'INSURER', 'ADMIN']),
	errorHandler(updateBroker)
);
router.post(
	'/issue-policy',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),

	errorHandler(createPolicy)
);
router.delete(
	'/delete/:brokerId',
	authClient(['ADMIN']),

	errorHandler(deleteBroker)
);
router.get(
	'/all/sales-statement',
	authClient(['BROKER']),
	errorHandler(getBrokersSalesStatement)
);
module.exports = router;
