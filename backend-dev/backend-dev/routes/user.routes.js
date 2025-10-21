const express = require('express');
const router = express.Router();
const {
	logInUser,
	createUser,
	getCurrentUser,
	getAllUsers,
	getSingleUser,
	updateUser,
	getAllUsersForAdmin,
	resetPassword,
	getUserByEmail,
	updateForgottenPassword,
	getUserByAgencyId,
	getUserbalance,
	getAgencyUsers,
} = require('../controllers/user.controller');
const { errorHandler } = require('../middleware/errorHandler');
const {
	validate,
} = require('../middleware/validators/user.controller.validator');
const { authToken } = require('../middleware/authToken');
const permissionManager = require('../middleware/permissionManager');
const authCvnAdmin = require('../middleware/authCvnAdmin');
const authClient = require('../middleware/authClient');

//POST routes
router.post('/log-in', validate('logInUser'), errorHandler(logInUser));
router.post(
	'/',
	authClient(['USER', 'BROKER', 'ADMIN']),
	// permissionManager(['SUPER']),
	validate('createUser'),
	errorHandler(createUser)
);
router.post('/reset-password', resetPassword);

router.post('/forgot-password-update', updateForgottenPassword);

//PATCH routes
router.patch(
	'/:userId',
	authClient(['USER', 'BROKER', 'ADMIN']),
	// permissionManager(['SUPER']),
	validate('updateUser'),
	errorHandler(updateUser)
);

//GET routes
router.get('/userbyemail', getUserByEmail);

router.get(
	'/me',
	authClient(['USER', 'WHOLESELLER', 'INSURER', 'BROKER', 'ADMIN']),
	errorHandler(getCurrentUser)
);
router.get(
	'/',
	authClient(['USER', 'BROKER', 'ADMIN']),
	// permissionManager(['SUPER']),
	errorHandler(getAllUsers)
);
router.get('/getuserbalance', getUserbalance);
router.get(
	'/allusersforadmin',
	// authCvnAdmin,
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),
	errorHandler(getAgencyUsers)
);
router.get(
	'/:userId',
	authClient(['ADMIN', 'USER', 'BROKER']),
	// permissionManager(['SUPER']),
	errorHandler(getSingleUser)
);
router.get('/get-users', authClient(['ADMIN', 'BROKER']), getUserByAgencyId);
module.exports = router;
