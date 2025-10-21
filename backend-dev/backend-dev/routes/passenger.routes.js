const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const {
	validate,
} = require('../middleware/validators/partner.controller.validator');

const authCvnAdmin = require('../middleware/authCvnAdmin');
const { getAllPassengers } = require('../controllers/passenger.controller');

router.get('/:policyId', authCvnAdmin, errorHandler(getAllPassengers));

module.exports = router;
