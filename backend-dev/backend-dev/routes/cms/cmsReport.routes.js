const express = require('express');
const {
	createCmsReport,
	getAllCmsAgencySalesStatement,
	getCmsAgencySalesStatementWithType,
	getCmsAgencySalesStatement,
	getMISSalesStatement,
} = require('../../controllers/cms/cmsReport.controller');
const { errorHandler } = require('../../middleware/errorHandler');
const router = express.Router();

router.post('/create-cms-report', createCmsReport);
router.get(
	'/get-all-cms-agency-sales-statement',
	getAllCmsAgencySalesStatement
);
router.get(
	'/get-cms-agency-sales-statement-with-type',
	getCmsAgencySalesStatementWithType
);
router.get(
	'/sales-statement',
	// authToken,
	errorHandler(getCmsAgencySalesStatement)
);

module.exports = router;
