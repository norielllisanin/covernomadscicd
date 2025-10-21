const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');

const User = getCollection('users');

const generateUsername = async ({ agencyId, firstName }) => {
	const numOfUsers = await User.countDocuments({});
	return `${firstName?.toLowerCase()}_${numOfUsers + 1}`;
};

module.exports = { generateUsername };
