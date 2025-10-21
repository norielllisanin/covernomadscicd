const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');

const Broker = getCollection('brokers');

const brokerPremiumBreakdown = async ({ premium, brokerId }) => {
	let cvnPercentage = 7,
		brokerPercentage = 0;
	let cvnShare = 0,
		brokerShare = 0;

	const foundBroker = await Broker.findOne({
		_id: new ObjectId(brokerId),
	});
	brokerPercentage = foundBroker.commissionPercentage;
	cvnPercentage = 7;

	cvnShare = premium * (cvnPercentage / 100);
	brokerShare = premium * (brokerPercentage / 100);

	return {
		cvn: {
			percentage: cvnPercentage,
			value: cvnShare,
		},
		broker: {
			percentage: brokerPercentage,
			value: brokerShare,
		},

		netPremium: premium - (cvnShare + brokerShare),
	};
};

module.exports = brokerPremiumBreakdown;
