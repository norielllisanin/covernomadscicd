const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const {
	validate,
} = require('../middleware/validators/partner.controller.validator');
const {
	createPartner,
	getAllPartners,
	getPartnerById,
	updatePartner,
} = require('../controllers/partner.controller');
const authCvnAdmin = require('../middleware/authCvnAdmin');

// Get Routes

router.get('/all-partners', authCvnAdmin, errorHandler(getAllPartners));
//POST routes
router.post(
	'/',
	authCvnAdmin,
	validate('createPartner'),
	errorHandler(createPartner)
);

router.get('/:partnerId', authCvnAdmin, errorHandler(getPartnerById));
//POST routes

router.put('/:partnerId', authCvnAdmin, errorHandler(updatePartner));

module.exports = router;
