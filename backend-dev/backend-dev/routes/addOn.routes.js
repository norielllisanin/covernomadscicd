const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const { getAddOns } = require('../controllers/addOn.controller');

const authClient = require('../middleware/authClient');

//GET routes
router.get(
	'/',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),
	errorHandler(getAddOns)
);

module.exports = router;
