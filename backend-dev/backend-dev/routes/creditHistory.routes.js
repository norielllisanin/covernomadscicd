const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const { authToken } = require('../middleware/authToken');
const permissionManager = require('../middleware/permissionManager');
const { getCreditHistory } = require('../controllers/creditHistory.controller');
const authClient = require('../middleware/authClient');

//GET routes
router.get(
	'/',
	authClient(['USER', 'WHOLESELLER']),
	// permissionManager(['SUPER']),
	errorHandler(getCreditHistory)
);

module.exports = router;
