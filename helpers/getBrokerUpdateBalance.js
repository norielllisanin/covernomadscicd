const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');

const Borker = getCollection('brokers');

const getBrokerUpdatedBalance = async ({
	brokerId,
	totalPremium,
	premiumExclVat,
}) => {
	let deduction = { broker: 0 };
	let updatedValues = {
		broker: { balance: null },
	};

	const foundBroker = await Borker.findOne({
		_id: new ObjectId(brokerId),
	});

	//calculate wholeseller deduction amount
	deduction.broker =
		totalPremium - (foundBroker?.commissionPercentage * premiumExclVat) / 100;

	//get wholeseller balance addition
	const currentBrokerBalance = foundBroker.balance || 0;
	updatedValues.broker.balance = currentBrokerBalance + deduction.broker;
	if (updatedValues.broker.balance > foundBroker.maxBalance)
		return { success: false, error: 'Broker max balance has exceeded.' };

	return { success: true, updatedValues, deduction };
};

module.exports = getBrokerUpdatedBalance;
