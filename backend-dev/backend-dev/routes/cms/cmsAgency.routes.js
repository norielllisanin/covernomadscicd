const express = require('express');
const router = express.Router();
const { errorHandler } = require('../../middleware/errorHandler');
const {
	validate,
} = require('../../middleware/validators/agency.controller.validator');
const {
	createCmsAgency,
	logInCmsAgencyUser,
	getSingleAgencyCms,
	updateCmsAgency,
	getAllCmsAgenciesWithType,
	getAllAgencyUsers,
	getCmsAgencySalesStatement,
	getAllCmsAgencies,
} = require('../../controllers/cms/cmsAgency.controller');
const {
	setInitalBalance,
	InsurerGetSingleAgency,
	InsurerUpdateAgency,
} = require('../../controllers/agency.controller');
const authCvnAdmin = require('../../middleware/authCvnAdmin');
const authClient = require('../../middleware/authClient');
const authClientCms = require('../../middleware/validators/cms/authClientCms');

//POST routes
router.post(
	'/createcmsagency',
	authClientCms(['CMS', 'ADMIN']),
	errorHandler(createCmsAgency)
);
router.post('/login-cmsagency-user', errorHandler(logInCmsAgencyUser));

router.patch(
	'/cms-update-agency',
	authClientCms(['CMS', 'ADMIN']),
	validate('updateAgency'),
	errorHandler(updateCmsAgency)
);
router.patch(
	'/update-agency/insurer',
	authClient(['INSURER']),
	validate('updateAgency'),
	errorHandler(InsurerUpdateAgency)
);
//GET routes
router.get('/getall-agency-users', errorHandler(getAllAgencyUsers));
router.get(
	'/getcms-single-agency',
	authClientCms(['ADMIN', 'USER']),
	errorHandler(getSingleAgencyCms)
);
router.get(
	'/single-agency/insurer',
	authClient(['ADMIN', 'WHOLESELLER', 'USER', 'INSURER', 'BROKER']),
	InsurerGetSingleAgency
);
router.get(
	'/getall-agencies/:page',
	authClientCms(['ADMIN', 'USER']),
	errorHandler(getAllCmsAgencies)
);
router.get(
	'/getall-cmstype-agencies/:page',
	authClientCms(['ADMIN', 'CMS', 'USER']),
	errorHandler(getAllCmsAgenciesWithType)
);

router.post('/set-status', errorHandler(setInitalBalance));
router.post(
	'/set-inital-balance',
	authCvnAdmin,
	errorHandler(setInitalBalance)
);
module.exports = router;
