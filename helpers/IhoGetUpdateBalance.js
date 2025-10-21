const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');

const Agency = getCollection('agencies');
const Borker = getCollection('brokers');

const IhoGetUpdatedBalance = async ({
	agencyId,
	totalPremium,
	premiumExclVat,
}) => {
	let deduction = { agency: 0, broker: 0 };
	let updatedValues = {
		broker: { balance: null },
		agency: { balance: null },
	};

	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });

	const foundBroker = await Borker.findOne({
		_id: new ObjectId(foundAgency.broker),
	});

	//calculate agency deduction amount
	deduction.agency =
		totalPremium - (foundAgency.commissionPercentage * premiumExclVat) / 100;
	//calculate wholeseller deduction amount
	deduction.broker =
		totalPremium - (foundBroker?.commissionPercentage * premiumExclVat) / 100;

	//get wholeseller balance addition
	const currentBrokerBalance = foundBroker.balance || 0;
	updatedValues.broker.balance = currentBrokerBalance + deduction.broker;
	if (updatedValues.broker.balance > foundBroker.maxBalance)
		return { success: false, error: 'Wholeseller max balance has exceeded.' };

	//get agency balance addition
	const currentAgencyBalance = foundAgency.balance || 0;
	updatedValues.agency.balance = currentAgencyBalance + deduction.agency;
	if (updatedValues.agency.balance > foundAgency.maxBalance)
		return { success: false, error: 'Agency max balance has exceeded.' };
	return { success: true, updatedValues, deduction };
};

module.exports = IhoGetUpdatedBalance;
