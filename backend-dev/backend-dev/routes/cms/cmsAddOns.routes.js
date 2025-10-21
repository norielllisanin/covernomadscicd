const express = require('express');
const router = express.Router();
const { errorHandler } = require('../../middleware/errorHandler');
const { getCmsAddOns } = require('../../controllers/cms/cmsAddOns.controller');
const authClientCms = require('../../middleware/validators/cms/authClientCms');

//GET routes
router.get(
	'/',
	// authClientCms(['ADMIN', 'CMS', 'USER', 'INSURER', 'BROKER']),
	errorHandler(getCmsAddOns)
);

module.exports = router;
