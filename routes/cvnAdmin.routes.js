const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const {
	logInCvnAdmin,
	getCurrentCVNAdmin,
	updateProfile,
	getAllWholeSellers,
	salesStatement,
	salesStatementAgency,
	resetPassword,
	updateForgottenPassword,
	getUserByEmail,
} = require('../controllers/cvnAdmin.controller');
const {
	validate,
} = require('../middleware/validators/cvnAdmin.controller.validator');
const authCvnAdmin = require('../middleware/authCvnAdmin');
router.get('/wholesellers', authCvnAdmin, errorHandler(getAllWholeSellers));
router.get('/sales-statement', authCvnAdmin, errorHandler(salesStatement));
router.get(
	'/sales-statement-agency',
	authCvnAdmin,
	errorHandler(salesStatementAgency)
);
//POST routes
router.post('/log-in', validate('logInCvnAdmin'), errorHandler(logInCvnAdmin));
// GET routes
router.get('/me', authCvnAdmin, errorHandler(getCurrentCVNAdmin));
// PATCH routes
router.post('/update-profile', authCvnAdmin, errorHandler(updateProfile));

router.post('/reset-password', resetPassword);
router.get('/userbyemail', getUserByEmail);

router.post('/forgot-password-update', updateForgottenPassword);

module.exports = router;
