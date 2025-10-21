const { getCollection } = require('../db');

const Quote = getCollection('quote');

const generateQuotationNumber = async ({ agencyCode, productCode, date }) => {
	// const totalPolicies = await Quote.countDocuments();
	// let numberStr = (totalPolicies + 1).toString().padStart(9, '0');

	const lastQuote = await Quote.findOne({}, { sort: { createdAt: -1 } });

	const lastQuoteNumber = lastQuote?.code || 0;
	const match = lastQuoteNumber.match(/(\d{9})$/);
	const lastNumber = match ? parseInt(match[1], 10) : 0;

	const numberStr = (lastNumber + 1).toString().padStart(9, '0');

	let result = `${
		process.env.ENVIRONMENT === 'development' ? 'TEST/' : ''
	}${agencyCode}/${productCode}/${date}/${numberStr}`;
	return result;
};

module.exports = { generateQuotationNumber };
