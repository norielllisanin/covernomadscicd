const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');

const Agency = getCollection('agencies');
const Broker = getCollection('brokers');

const ihoPremiumBreakdown = async ({ premium, agencyId, userId }) => {
	let cvnPercentage = 7,
		brokerPercentage = 0,
		agencyPercentage = 0;
	let cvnShare = 0,
		brokerShare = 0,
		agencyShare = 0;

	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	const foundBroker = await Broker.findOne({
		_id: new ObjectId(foundAgency.broker),
	});
	agencyPercentage = foundAgency.commissionPercentage;
	brokerPercentage = foundBroker.commissionPercentage - agencyPercentage;
	cvnPercentage = 7;

	cvnShare = premium * (cvnPercentage / 100);
	brokerShare = premium * (brokerPercentage / 100);
	agencyShare = premium * (agencyPercentage / 100);

	return {
		cvn: {
			percentage: cvnPercentage,
			value: cvnShare,
		},
		broker: {
			percentage: brokerPercentage,
			value: brokerShare,
		},
		agency: {
			percentage: agencyPercentage,
			value: agencyShare,
		},
		netPremium: premium - (brokerShare + agencyShare),
	};
};

module.exports = ihoPremiumBreakdown;
