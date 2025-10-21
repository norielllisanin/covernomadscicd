const { ObjectId } = require('mongodb');
const { getCollection } = require('../../db');

const CmsAgency = getCollection('cmsAgency');

const refundCmsDeductions = async ({ agencyId, deduction }) => {
	let updatedValues = {
		cms: { balance: null },
		agency: { balance: null },
	};

	const foundAgency = await CmsAgency.findOne({ _id: new ObjectId(agencyId) });

	//get agency balance addition
	const agencyBalance = foundAgency.balance || 0;
	updatedValues.agency.balance = agencyBalance - deduction.agency;

	//make updates
	// const cmsValues = updatedValues.cms;
	const agencyValues = updatedValues.agency;
	await CmsAgency.findOneAndUpdate(
		{
			_id: new ObjectId(foundAgency?._id),
		},
		{
			$set: {
				...(agencyValues.balance != null && {
					balance: parseFloat(Number(agencyValues.balance).toFixed(2)),
				}),
			},
		}
	);

	return { success: true };
};

module.exports = refundCmsDeductions;
