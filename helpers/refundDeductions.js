const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');

const Agency = getCollection('agencies');
const Wholeseller = getCollection('wholesellers');
const Broker = getCollection('brokers');

const refundDeductions = async ({ agencyId, deduction }) => {
	let updatedValues = {
		wholeseller: { balance: null },
		agency: { balance: null },
	};
	let brokerupdatedValues = {
		broker: { balance: null },
		agency: { balance: null },
	};

	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	if (foundAgency.broker) {
		const foundBroker = await Broker.findOne({
			_id: new ObjectId(foundAgency.broker),
		});

		// Refund broker balance
		const brokerBalance = foundBroker.balance || 0;
		brokerupdatedValues.broker.balance = brokerBalance - deduction.broker;

		// Get agency balance addition
		const agencyBalance = foundAgency.balance || 0;
		brokerupdatedValues.agency.balance = agencyBalance - deduction.agency;
		// Make updates
		const brokerValues = brokerupdatedValues.broker;
		const brokerAgencyValues = brokerupdatedValues.agency;

		await Broker.findOneAndUpdate(
			{ _id: new ObjectId(foundAgency.broker) },
			{
				$set: {
					balance: parseFloat(Number(brokerValues.balance).toFixed(2)),
				},
			}
		);

		await Agency.findOneAndUpdate(
			{ _id: new ObjectId(foundAgency._id) },
			{
				$set: {
					balance: parseFloat(Number(brokerAgencyValues.balance).toFixed(2)),
				},
			}
		);
	} else {
		const foundWholeseller = await Wholeseller.findOne({
			_id: new ObjectId(foundAgency.wholeseller),
		});

		//refund wholeseller balance
		const wholesellerBalance = foundWholeseller.balance || 0;
		updatedValues.wholeseller.balance =
			wholesellerBalance - deduction.wholeseller;

		//get agency balance addition
		const agencyBalance = foundAgency.balance || 0;
		updatedValues.agency.balance = agencyBalance - deduction.agency;

		//make updates
		const wholesellerValues = updatedValues.wholeseller;
		const agencyValues = updatedValues.agency;
		await Wholeseller.findOneAndUpdate(
			{
				_id: new ObjectId(foundAgency.wholeseller),
			},
			{
				$set: {
					...(wholesellerValues.balance != null && {
						balance: parseFloat(Number(wholesellerValues.balance).toFixed(2)),
					}),
				},
			}
		);
		await Agency.findOneAndUpdate(
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
	}
	return { success: true };
};

module.exports = refundDeductions;
