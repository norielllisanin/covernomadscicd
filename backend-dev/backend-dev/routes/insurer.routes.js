const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const {
	createInsurer,
	getAllInsurers,
	logInInsurerAdmin,
	getCurrentInsurer,
	getAllBrokersForInsurer,
	updateProfile,
	InsurerGetAllAgencies,
	salesStatement,
	getInsurerById,
	updateInsurer,
	verifyOtp,
} = require('../controllers/insurer.controller');
const {
	validate,
} = require('../middleware/validators/insurer.controller.validator');
const authCvnAdmin = require('../middleware/authCvnAdmin');
const authClient = require('../middleware/authClient');

router.post(
	'/',
	authCvnAdmin,
	validate('createInsurer'),
	errorHandler(createInsurer)
);

// verify Insurer with otp
router.post(
	'/vertify-otp',
	validate('logInInsurerAdmin'),
	errorHandler(verifyOtp)
);
// LoginIn Insurer
router.post(
	'/log-in',
	validate('logInInsurerAdmin'),
	errorHandler(logInInsurerAdmin)
);

router.get('/me', authClient('INSURER'), errorHandler(getCurrentInsurer));
//GET routes
router.get('/get-insurers', errorHandler(getAllInsurers));
router.get('/get-by-id/:insurerId', errorHandler(getInsurerById));

router.get(
	'/allbrokers',
	authClient(['INSURER', 'ADMIN', 'BROKER']),
	errorHandler(getAllBrokersForInsurer)
);
router.get(
	'/:page/insurer',
	authClient(['INSURER']),
	errorHandler(InsurerGetAllAgencies)
);
router.post(
	'/update-profile',
	authClient(['INSURER']),
	errorHandler(updateProfile)
);
router.put('/update/:insurerId', authCvnAdmin, errorHandler(updateInsurer));
router.get(
	'/sales-statement',
	authClient(['INSURER', 'ADMIN']),
	errorHandler(salesStatement)
);

module.exports = router;
