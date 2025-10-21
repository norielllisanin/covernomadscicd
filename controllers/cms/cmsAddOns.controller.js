const { ObjectId } = require('mongodb');
const { getCollection } = require('../../db');
const { formatIds } = require('../../utils');

const AddOns = getCollection('addOns');

// @desc    Returns all offered add ons for CMS and USER
// @route   GET /api/cms-add-ons
const getCmsAddOns = async (req, res) => {
	let query = {
		insurer: new ObjectId('67c05823c70d834e1335dadc'),
		cms: { $exists: true },
	};

	const addOns = await AddOns.find(query).toArray();

	return res.status(200).json({
		addOns: formatIds(addOns, 'addOn'),
	});
};

module.exports = {
	getCmsAddOns,
};
