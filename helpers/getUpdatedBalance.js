const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');

const Agency = getCollection('agencies');
const Wholeseller = getCollection('wholesellers');

const getUpdatedBalance = async ({
	agencyId,
	totalPremium,
	premiumExclVat,
}) => {
	let deduction = { agency: 0, wholeseller: 0 };
	let updatedValues = {
		wholeseller: { balance: null },
		agency: { balance: null },
	};

	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	const foundWholeseller = await Wholeseller.findOne({
		_id: new ObjectId(foundAgency.wholeseller),
	});

	//calculate agency deduction amount
	deduction.agency =
		totalPremium - (foundAgency.commissionPercentage * premiumExclVat) / 100;
	//calculate wholeseller deduction amount
	deduction.wholeseller = totalPremium - (60 * premiumExclVat) / 100;

	//get wholeseller balance addition
	const currentWholesellerBalance = foundWholeseller.balance || 0;
	updatedValues.wholeseller.balance =
		currentWholesellerBalance + deduction.wholeseller;
	if (updatedValues.wholeseller.balance > foundWholeseller.maxBalance)
		return { success: false, error: 'Wholeseller max balance has exceeded.' };

	//get agency balance addition
	const currentAgencyBalance = foundAgency.balance || 0;
	updatedValues.agency.balance = currentAgencyBalance + deduction.agency;
	if (updatedValues.agency.balance > foundAgency.maxBalance)
		return { success: false, error: 'Agency max balance has exceeded.' };
	return { success: true, updatedValues, deduction };
};

module.exports = getUpdatedBalance;
