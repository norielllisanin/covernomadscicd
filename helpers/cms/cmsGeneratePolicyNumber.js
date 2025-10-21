const { ObjectId } = require('mongodb');
const { getCollection } = require('../../db');

const CmsAgency = getCollection('cmsAgency');
const Insurer = getCollection('insurers');
const Policy = getCollection('policies');

const cmsGeneratePolicyNumber = async ({ agencyId, productCode }) => {
	const foundAgency = await CmsAgency.findOne({ _id: new ObjectId(agencyId) });
	console.log(foundAgency);

	const foundInsurer = await Insurer.findOne({
		_id: new ObjectId(foundAgency.insurer),
	});
	const totalPolicies = await Policy.countDocuments({
		agency: { $exists: true },
	});
	let numberStr = (totalPolicies + 1).toString().padStart(9, '0');
	let result = `${
		process.env.ENVIRONMENT === 'development' ? 'TEST-' : ''
	}CVN-IND-${foundInsurer.code}-${productCode}-${numberStr}`;
	return result;
};

module.exports = {
	cmsGeneratePolicyNumber,
};
