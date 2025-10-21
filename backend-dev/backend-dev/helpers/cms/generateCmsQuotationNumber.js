const { getCollection } = require('../../db');

const Quote = getCollection('quote');

const generateCmsQuotationNumber = async ({
	agencyCode,
	productCode,
	date,
}) => {
	const totalPolicies = await Quote.countDocuments();
	let numberStr = (totalPolicies + 1).toString().padStart(9, '0');
	let result = `${
		process.env.ENVIRONMENT === 'development' ? 'TEST/' : ''
	}${agencyCode}/${productCode}/${date}/${numberStr}`;
	return result;
};

module.exports = { generateCmsQuotationNumber };
