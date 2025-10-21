const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');

const Policy = getCollection('policies');
const Agency = getCollection('agencies');
const Insurer = getCollection('insurers');
const Broker = getCollection('brokers');

const generatePolicyNumber = async ({ agencyId, productCode }) => {
	// const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	// const foundInsurer = await Insurer.findOne({
	// 	_id: new ObjectId(foundAgency.insurer),
	// });
	// const totalPolicies = await Policy.countDocuments({
	// 	agency: { $exists: true },
	// });
	// let numberStr = (totalPolicies + 1).toString().padStart(9, '0');
	// let result = `${
	// 	process.env.ENVIRONMENT === 'development' ? 'TEST-' : ''
	// }CVN-AE-${foundInsurer.code}-${productCode}-${numberStr}`;
	// return result;

	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	const foundInsurer = await Insurer.findOne({
		_id: new ObjectId(foundAgency.insurer),
	});
	// const totalPolicies = await Policy.countDocuments({
	// 	agency: { $exists: true },
	// });

	const lastPolicy = await Policy.findOne(
		{ agency: { $exists: true } },
		{ sort: { createdAt: -1 } }
	);

	const lastPolicyNumber = lastPolicy?.number || 0;
	const match = lastPolicyNumber.match(/(\d{9})$/);
	const lastNumber = match ? parseInt(match[1], 10) : 0;

	const numberStr = (lastNumber + 1).toString().padStart(9, '0');
	let result = `${
		process.env.ENVIRONMENT === 'development' ? 'TEST-' : ''
	}CVN-AE-${foundInsurer.code}-${productCode}-${numberStr}`;

	return result;
};

const generateBrokerPolicyNumber = async ({ brokerId, productCode }) => {
	// const foundBroker = await Broker.findOne({ _id: new ObjectId(brokerId) });
	// const foundInsurer = await Insurer.findOne({
	// 	_id: new ObjectId(foundBroker.insurerId),
	// });
	// const totalPolicies = await Policy.countDocuments({
	// 	broker: { $exists: true },
	// });
	// let numberStr = (totalPolicies + 1).toString().padStart(9, '0');
	// let result = `${
	// 	process.env.ENVIRONMENT === 'development' ? 'TEST-' : ''
	// }CVN-AE-${foundInsurer.code}-${productCode}-${numberStr}`;
	// return result;

	const foundBroker = await Broker.findOne({ _id: new ObjectId(brokerId) });
	const foundInsurer = await Insurer.findOne({
		_id: new ObjectId(foundBroker.insurerId),
	});
	// const totalPolicies = await Policy.countDocuments({
	// 	agency: { $exists: true },
	// });

	const lastPolicy = await Policy.findOne(
		{ broker: { $exists: true } },
		{ sort: { createdAt: -1 } }
	);

	const lastPolicyNumber = lastPolicy?.number || 0;
	const match = lastPolicyNumber.match(/(\d{9})$/);
	const lastNumber = match ? parseInt(match[1], 10) : 0;

	const numberStr = (lastNumber + 1).toString().padStart(9, '0');
	let result = `${
		process.env.ENVIRONMENT === 'development' ? 'TEST-' : ''
	}CVN-AE-${foundInsurer.code}-${productCode}-${numberStr}`;

	return result;
};

const addPassangerNoInPolicyNumber = ({ policy, passangerNo }) => {
	if (!policy) {
		return;
	}
	const dev = process.env.ENVIRONMENT === 'development';
	const splitLength = policy.split('-').length;
	const parts = policy.split('-');
	const lastPart = parts.pop();

	if (dev ? splitLength === 6 : splitLength === 5) {
		return `${policy}-${passangerNo}-0`;
	} else if (dev ? splitLength === 7 : splitLength === 6) {
		return [...parts, passangerNo, lastPart].join('-');
	}
	return policy;
};

module.exports = {
	generatePolicyNumber,
	addPassangerNoInPolicyNumber,
	generateBrokerPolicyNumber,
};
