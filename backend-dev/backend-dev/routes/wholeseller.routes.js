const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const {
	validate,
} = require('../middleware/validators/wholeseller.controller.validator');
const {
	createWholeseller,
	logInWholesellerAdmin,
	getCurrentWholeseller,
	updateWholeSellerPassword,
	resetPassword,
	getWholeSellersSalesStatement,
	getAllAgencies,
	getEmailWholeSeller,
	updateForgottenPassword,
	getSinleWholeSeller,
	getAllAgenciesforAdmin,
	getWholesellerByEmail,
	getUserByAgencyId,
	updateProfile,
	getUserAgents,
	addMaxBalanceKey,
	getAgencies,
	getSingleWholeSeller,
} = require('../controllers/wholeseller.controller');
const authCvnAdmin = require('../middleware/authCvnAdmin');
const authWholesellerAdmin = require('../middleware/authWholesellerAdmin');
const authClient = require('../middleware/authClient');

//POST routes
router.post(
	'/log-in',
	validate('logInWholesellerAdmin'),
	errorHandler(logInWholesellerAdmin)
);
router.post('/add-maxbalance-key', errorHandler(addMaxBalanceKey));
router.post(
	'/',
	authCvnAdmin,
	validate('createWholeseller'),
	errorHandler(createWholeseller)
);
router.post(
	'/update-password',
	authWholesellerAdmin,
	errorHandler(updateWholeSellerPassword)
);
router.patch(
	'/update-profile',
	authClient(['ADMIN', 'WHOLESELLER']),
	errorHandler(updateProfile)
);
router.post(
	'/forgot-password-update',
	// validate('updateForgottenPassword'),
	updateForgottenPassword
);
router.post('/reset-password', errorHandler(resetPassword));

//GET routes
router.get('/me', authWholesellerAdmin, errorHandler(getCurrentWholeseller));
router.get('/userbyagencyId', errorHandler(getUserByAgencyId));
router.get('/wholesellerbyemail', errorHandler(getWholesellerByEmail));
router.get(
	'/sales-statement',
	authClient(['WHOLESELLER']),
	errorHandler(getWholeSellersSalesStatement)
);
router.get('/single-wholeseller', errorHandler(getSinleWholeSeller));

router.get(
	'/agencies',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),
	errorHandler(getAllAgencies)
);

router.get(
	'/get-user-agents',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),

	errorHandler(getUserAgents)
);

router.get(
	'/allagencies',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),
	errorHandler(getAllAgenciesforAdmin)
);

router.get(
	'/single-adminwholeseller',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),
	errorHandler(getSingleWholeSeller)
);

router.get(
	'/get-users',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),
	errorHandler(getUserByAgencyId)
);
router.get(
	'/get-agencies',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),
	errorHandler(getAgencies)
);

module.exports = router;
