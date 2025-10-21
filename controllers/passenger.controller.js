const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const Passenger = getCollection('passengers');

// @desc    Logs in a CVN admin
// @route   GET /api/passengers/
// @access  PUBLIC
const getAllPassengers = async (req, res) => {
	try {
		const { policyId } = req.params;
		const passengers = await Passenger.findOne({
			policy: new ObjectId(policyId),
		});
		res.status(200).json({
			msg: 'All passengers',
			passengers,
		});
	} catch (error) {
		console.log('passenger get error', JSON.stringify(error));
		res.status(500).json({
			msg: 'Something went wrong',
			error: error.message,
		});
	}
};
module.exports = {
	getAllPassengers,
};
