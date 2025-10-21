const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const { formatIds } = require('../utils');
const Agency = getCollection('agencies');
const AddOn = getCollection('addOns');

// @desc    Returns all offered add ons for an insurer
// @route   GET /api/add-ons
// @access  SUPER, STANDARD, ADMIN, WHOLESELLER
const getAddOns = async (req, res) => {
	const { productId, broker } = req.query;
	const userType = req.user
		? 'USER'
		: req.cvnAdmin
		? 'ADMIN'
		: req.brokerAdmin
		? 'BROKER'
		: req.insurerAdmin
		? 'INSURER'
		: 'WHOLESELLER';
	let foundAgency = '';
	if (userType === 'WHOLESELLER') {
		const wholesellerId = req?.wholesellerAdmin?.wholesellerId;
		foundAgency = await Agency?.findOne({
			wholeseller: new ObjectId(wholesellerId),
		});
	}
	console.log(userType);
	let insurerId;
	if (userType === 'USER')
		insurerId = req.user.broker
			? req.user.broker?.insurerId
			: req?.user?.agency?.insurer || '6644925ed4077c58b817158a';
	if (userType === 'WHOLESELLER')
		insurerId = foundAgency?.insurer || '6644925ed4077c58b817158a';
	if (userType === 'ADMIN') insurerId = '6644925ed4077c58b817158a';
	if (userType === 'BROKER') insurerId = '6644925ed4077c58b817158a';
	if (userType === 'INSURER') insurerId = '6644925ed4077c58b817158a';
	let query;
	if (productId) {
		query = {
			insurer: new ObjectId(insurerId),
			productId: new ObjectId(productId),
		};
	} else {
		query = {
			insurer: new ObjectId(insurerId),
		};
	}

	const brokerRoles = new Set(['BROKER', 'INSURER']);
	const isBrokerUser = userType === 'USER' && req?.user?.agency?.broker;

	if ((brokerRoles.has(userType) || isBrokerUser) && broker === 'false') {
		query.iho = { $exists: true, $ne: null };
	} else if (req?.user?.agency?.wholeseller || broker === 'true') {
		query = {
			insurer: new ObjectId(insurerId),
			iho: { $exists: false },
		};
	} else {
		query.iho = { $exists: false };
	}
	const addOns = await AddOn.find(query).toArray();
	return res.status(200).json({
		addOns: formatIds(addOns, 'addOn'),
	});
};
module.exports = {
	getAddOns,
};
