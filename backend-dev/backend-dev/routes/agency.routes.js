const express = require('express');
const router = express.Router();
const { errorHandler } = require('../middleware/errorHandler');
const {
	validate,
} = require('../middleware/validators/agency.controller.validator');
const {
	createAgency,
	getAgencySalesStatement,
	getAllAgencies,
	getSingleAgency,
	updateAgency,
	setInitalBalance,
	createBrokerAgency,
	InsurerCreateAgency,
	InsurerGetAllAgencies,
	InsurerGetSingleAgency,
	InsurerUpdateAgency,
} = require('../controllers/agency.controller');
const { authToken } = require('../middleware/authToken');
const authCvnAdmin = require('../middleware/authCvnAdmin');
const authClient = require('../middleware/authClient');

//POST routes
router.post(
	'/',
	authClient(['WHOLESELLER', 'ADMIN']),
	validate('createAgency'),
	errorHandler(createAgency)
);
router.post(
	'/insurer-create',
	authClient(['INSURER']),
	validate('createAgency'),
	errorHandler(InsurerCreateAgency)
);
router.post(
	'/broker',
	authClient(['BROKER']),
	errorHandler(createBrokerAgency)
);
router.patch(
	'/update-agency',
	authClient(['WHOLESELLER', 'ADMIN']),
	validate('updateAgency'),
	errorHandler(updateAgency)
);
router.patch(
	'/update-agency/insurer',
	authClient(['INSURER']),
	validate('updateAgency'),
	errorHandler(InsurerUpdateAgency)
);
//GET routes
router.get(
	'/sales-statement',
	authToken,
	errorHandler(getAgencySalesStatement)
);
router.get(
	'/single-agency',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),
	errorHandler(getSingleAgency)
);
router.get(
	'/single-agency/insurer',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),
	InsurerGetSingleAgency
);
router.get(
	'/:page',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),
	errorHandler(getAllAgencies)
);

router.post('/set-status', errorHandler(setInitalBalance));
router.post(
	'/set-inital-balance',
	authCvnAdmin,
	errorHandler(setInitalBalance)
);
module.exports = router;
