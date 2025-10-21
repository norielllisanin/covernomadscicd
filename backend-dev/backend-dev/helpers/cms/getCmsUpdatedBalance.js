const { ObjectId } = require('mongodb');
const { getCollection } = require('../../db');

const CmsAgency = getCollection('cmsAgency');

const getCmsUpdatedBalance = async ({
	agencyId,
	totalPremium,
	// premiumExclVat,
}) => {
	let deduction = { agency: 0 };
	let updatedValues = {
		agency: { balance: null },
	};

	const foundAgency = await CmsAgency.findOne({ _id: new ObjectId(agencyId) });

	//calculate agency deduction amount
	deduction.agency =
		totalPremium -
		(foundAgency?.commissionPercentage || 0 * totalPremium) / 100;

	//get agency balance addition
	const currentAgencyBalance = foundAgency?.balance || 0;
	updatedValues.agency.balance = currentAgencyBalance + deduction.agency;
	if (updatedValues.agency.balance > foundAgency?.maxBalance)
		return { success: false, error: 'Agency max balance has exceeded.' };
	return { success: true, updatedValues, deduction };
};

module.exports = getCmsUpdatedBalance;
