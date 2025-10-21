const { getCollection } = require('../db');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
	generateRandomString,
	formatIds,
	generateRandomNumber,
} = require('../utils.js');
const { ObjectId, Double } = require('mongodb');
const { generateUsername } = require('../helpers/generateUsername.js');
const { sendEmail } = require('../services/emailingService.js');
const fs = require('fs');
const { compile } = require('handlebars');

const User = getCollection('users');
const Agency = getCollection('agencies');
const Broker = getCollection('brokers');
const BrokerAdmin = getCollection('brokerAdmins');

// @desc    Logs in users
// @route   POST /api/users/log-in
// @access  PUBLIC
const logInUser = async (req, res) => {
	const { username, password, role } = req.body;
	const user = await User.findOne({ username });

	//no user found
	if (!user)
		return res.status(400).send({ msg: 'No user found with this username.' });

	//user in active
	if (!user.isActive)
		return res.status(400).send({
			msg: 'Your account has been de-activated. Please contact your admin.',
		});
	//finding user agency

	let userAgency;
	if (user.broker && user.broker !== undefined && role === 'USER') {
		userAgency = await Broker.findOne({ _id: new ObjectId(user.broker) });
	} else if (role === 'AGENCY') {
		userAgency = await Agency.findOne({ _id: new ObjectId(user.agency) });
	}

	if (!userAgency)
		return res
			.status(400)
			.send({ msg: `${role === 'AGENCY' ? 'Agency' : 'Broker'} not found` });

	//agency status check either active or in-active
	if (!userAgency.status)
		return res.status(400).send({
			msg: `Your ${
				role === 'AGENCY' ? 'Agency' : 'Broker'
			} is currently inactive. Please contact your admin.`,
		});

	//incorrect password
	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) return res.status(400).send({ msg: 'Incorrect password.' });

	//all good
	let brokerAdmin;
	let foundAgency;
	if (user.broker) {
		foundAgency = await Broker.findOne({
			_id: new ObjectId(user?.broker),
		});
		brokerAdmin = await BrokerAdmin.findOne({
			brokerId: new ObjectId(user?.broker),
		});
	} else {
		foundAgency = await Agency.findOne({
			_id: new ObjectId(user?.agency),
		});
	}

	const constructedUser = {
		userId: user._id,
		firstName: user.firstName,
		lastName: user.lastName,
		username: user.username,
		email: user.email,
		dob: user.dob,
		permission: user.permission,
		...(user?.agency && {
			agency: {
				...foundAgency,
				agencyId: foundAgency._id,
			},
		}),
		...(user?.broker && {
			broker: {
				...foundAgency,
				brokerId: foundAgency._id,
				brokerAdmin: brokerAdmin,
			},
		}),
	};

	const accessToken = jwt.sign(constructedUser, process.env.JWT_SECRET, {
		expiresIn: '24h',
	});

	//updating latest login of user
	await User.findOneAndUpdate(
		{ _id: user._id },
		{ $set: { latestLoginTimestamp: new Date() } }
	);

	return res.status(200).json({
		accessToken: accessToken,
		user: constructedUser,
	});
};

// @desc    Creates a user
// @route   POST /api/users
// @access  PRIVATE - SUPER
const createUser = async (req, res) => {
	const agencyId = req?.user?.agency?.agencyId;
	const {
		firstName,
		lastName,
		email,
		permission,
		dob,
		landlineNumber,
		phoneNumber,
		location,
		incentivePercentage,
		brokerId,
	} = req.body;

	//user already exists with email
	const userExists = await User.findOne({
		email,
	});
	if (userExists)
		return res
			.status(409)
			.json({ msg: 'User with this email already exists.' });

	const generatedPassword = generateRandomString(10);
	const hashedPassword = await bcrypt.hash(generatedPassword, 6);
	const generatedUsername = await generateUsername({
		agencyId,
		firstName,
	});

	const createdUser = await User.insertOne({
		...(brokerId === '' ||
			(brokerId === undefined && { agency: new ObjectId(agencyId) })),
		...(req.brokerAdmin && { broker: new ObjectId(brokerId) }),
		firstName,
		lastName,
		username: generatedUsername,
		email: email,
		password: hashedPassword,
		dob: new Date(dob),
		permission,
		isActive: true,
		...(landlineNumber && { landlineNumber }),
		...(phoneNumber && { phoneNumber }),
		...(location && { location }),
		...(incentivePercentage != null && { incentivePercentage }),
		createdAt: new Date(),
	});
	const foundUser = await User.findOne({ _id: createdUser.insertedId });
	return res.status(200).json({
		msg: 'User created successfully. Please make sure to copy user credentials as you will NOT be able to access these again.',
		user: formatIds({ ...foundUser, password: generatedPassword }, 'user'),
	});
};
// @desc    Updates a user
// @route   PATCH /api/users/:userId
// @access  PRIVATE - SUPER
const updateUser = async (req, res) => {
	// const agencyId = req.user.agency.agencyId;
	const { userId } = req.params;
	const {
		firstName,
		lastName,
		email,
		permission,
		dob,
		isActive,
		landlineNumber,
		phoneNumber,
		location,
		incentivePercentage,
	} = req.body;

	const foundUser = await User.findOne({
		_id: new ObjectId(userId),
		// agency: new ObjectId(agencyId),
	});
	if (!foundUser) return res.status(404).json({ msg: 'User not found.' });

	//user already exists with email
	const userExists = await User.findOne({
		email,
	});
	if (userExists && email != foundUser.email)
		return res
			.status(409)
			.json({ msg: 'User with this email already exists.' });

	await User.updateOne(
		{ _id: foundUser._id },
		{
			$set: {
				...(firstName && { firstName }),
				...(lastName && { lastName }),
				...(email && { email }),
				...(dob && { dob: new Date(dob) }),
				...(permission && { permission }),
				...(isActive != null && { isActive }),
				...(landlineNumber && { landlineNumber }),
				...(phoneNumber && { phoneNumber }),
				...(location && { location }),
				...(incentivePercentage != null && { incentivePercentage }),
			},
		}
	);
	return res.status(200).json({
		msg: 'User updated successfully.',
	});
};

// @desc    Gets the current logged in user
// @route   GET /api/users/me
// @access  PRIVATE - SUPER, STANDARD
const getCurrentUser = async (req, res) => {
	const [user] = await User.aggregate([
		{ $match: { _id: new ObjectId(req.user?.userId) } },
		// {
		// 	$lookup: {
		// 		from: 'agencies',
		// 		localField: 'agency',
		// 		foreignField: '_id',
		// 		as: 'agency',
		// 	},
		// },

		// { $addFields: { agency: { $arrayElemAt: ['$agency', 0] } } },

		{
			$lookup: {
				from: 'agencies',
				localField: 'agency',
				foreignField: '_id',
				as: 'agencyData',
			},
		},
		// Lookup from cmsAgency
		{
			$lookup: {
				from: 'cmsAgency',
				localField: 'agency',
				foreignField: '_id',
				as: 'cmsAgencyData',
			},
		},
		// Add unified agency field from whichever is not empty
		{
			$addFields: {
				agency: {
					$cond: {
						if: { $gt: [{ $size: '$agencyData' }, 0] },
						then: { $arrayElemAt: ['$agencyData', 0] },
						else: { $arrayElemAt: ['$cmsAgencyData', 0] },
					},
				},
			},
		},
		// Optional: remove intermediate arrays
		{
			$project: {
				password: 0,
				agencyData: 0,
				cmsAgencyData: 0,
			},
		},
		// Step 1: Lookup broker
		{
			$lookup: {
				from: 'brokers',
				localField: 'broker',
				foreignField: '_id',
				as: 'broker',
			},
		},
		{
			$addFields: {
				broker: { $arrayElemAt: ['$broker', 0] },
			},
		},

		// Step 2: Lookup brokerAdmin using broker._id
		{
			$lookup: {
				from: 'brokerAdmins',
				localField: 'broker._id',
				foreignField: 'broker',
				as: 'brokerAdmin',
			},
		},

		// Step 3: Add brokerAdmin to broker as a nested field
		{
			$addFields: {
				'broker.brokerAdmin': {
					$arrayElemAt: ['$brokerAdmin', 0],
				},
			},
		},

		// Optional: Remove top-level brokerAdmin if not needed
		{
			$project: {
				brokerAdmin: 0,
			},
		},
		{ $addFields: { brokerAdmin: { $arrayElemAt: ['$brokerAdmin', 0] } } },
		{
			$lookup: {
				from: 'wholesellers', // The name of the wholesellers collection
				localField: 'agency.wholeseller', // Reference from agency to wholeseller
				foreignField: '_id',
				as: 'agency.wholeseller', // Embeds the wholeseller into agency
			},
		},
		{
			$addFields: {
				'agency.wholeseller': { $arrayElemAt: ['$agency.wholeseller', 0] },
			},
		},
		{ $unset: ['password'] },
		{ $limit: 1 },
	]).toArray();
	if (!user) return res.status(404).json({ msg: 'User not found.' });

	return res.status(200).json({ user: formatIds(user, 'user') });
};

// @desc    Get all users
// @route   GET /api/users
// @access  PRIVATE - SUPER
const getAllUsers = async (req, res) => {
	let agencyId;
	let brokerId;
	let allUsers;

	if (req.brokerAdmin) {
		brokerId = req?.brokerAdmin?.brokerId;
		allUsers = await User.find({
			broker: new ObjectId(brokerId),
		})
			.project({ password: 0 })
			.toArray();
	} else if (
		req.user.broker &&
		req.user.broker !== undefined &&
		req.user.permission === 'SUPER'
	) {
		brokerId = req?.user?.broker?.brokerId;
		allUsers = await User.find({
			broker: new ObjectId(brokerId),
		})
			.project({ password: 0 })
			.toArray();
	} else {
		agencyId = req?.user?.agency?.agencyId;
		allUsers = await User.find({
			agency: new ObjectId(agencyId),
		})
			.project({ password: 0 })
			.toArray();
	}

	return res.status(200).json({
		users: formatIds(allUsers, 'user'),
	});
};
const getAllUsersForAdmin = async (req, res) => {
	const allUsers = await User.find().project({ password: 0 }).toArray();

	return res.status(200).json({
		allUsers: formatIds(allUsers, 'user'),
	});
};

const getAgencyUsers = async (req, res) => {
	const { agencyID } = req.query;
	const foundUsers = await User.find({
		agency: new ObjectId(agencyID),
	}).toArray();
	if (!foundUsers) return res.status(404).json({ msg: 'No users found.' });
	return res.status(200).json({ users: formatIds(foundUsers, 'user') });
};

const getUserbalance = async (req, res) => {
	const { userId } = req.query;

	const foundUser = await User.findOne({ _id: new ObjectId(userId) });
	if (!foundUser) return res.status(404).json({ msg: 'User not found.' });
	return res.status(200).json({ balance: foundUser.balance });
};

// @desc    Get single user
// @route   GET /api/users/:userId
// @access  PRIVATE - SUPER
const getSingleUser = async (req, res) => {
	// const agencyId = req.user.agency.agencyId;
	const { userId } = req.params;

	const foundUser = await User.findOne(
		{
			_id: new ObjectId(userId),
			// agency: new ObjectId(agencyId),
		},
		{ projection: { password: 0 } }
	);
	if (!foundUser) return res.status(404).json({ msg: 'User not found.' });
	return res.status(200).json({
		user: formatIds(foundUser, 'user'),
	});
};

const getUserByEmail = async (req, res) => {
	const { email } = req.query;
	const user = await User.findOne({ email });
	if (!user) return res.status(404).json({ msg: 'User not found.' });
	return res.status(200).json({ user: formatIds(user, 'user') });
};
const resetPassword = async (req, res) => {
	const { email } = req.body;
	const user = await User.findOne({ email: email });
	if (!user) {
		return res
			.status(400)
			.send({ msg: 'No user found with this email.', found: false });
	}
	const source = fs.readFileSync(
		`${process.cwd()}/templates/orient/OrientOTPVerification.html`,
		'utf8'
	);

	const template = compile(source);
	let otp = generateRandomNumber(6);
	const replacements = {
		firstName: user.firstName,
		lastName: user.lastName,
		otp: otp,
		username: user.username,
	};

	const html = template(replacements);

	await User.updateOne({ _id: user?._id }, { $set: { otp } });
	const { error } = await sendEmail({
		to: email,
		subject: `otp verification`,
		text: `OTP Verification`,
		html,
	});
	if (error)
		return res.status(500).json({
			msg: 'Something went wrong while sending email.',
			details: error,
		});
	return res
		.status(200)
		.json({ msg: 'OTP emailed successfully.', found: true });
};

const updateForgottenPassword = async (req, res) => {
	const { email, newPassword, confirmPassword } = req.body;

	const user = await User.findOne({
		email: email,
	});

	if (!user) {
		return res.status(404).send('User not found');
	}
	try {
		if (newPassword === confirmPassword) {
			const hashedNewPassword = await bcrypt.hash(newPassword, 6);

			await User.updateOne(
				{ _id: user?._id },
				{ $set: { password: hashedNewPassword } }
			);

			res
				.status(200)
				.send({ msg: 'Password updated successfully', success: 'true' });
		} else
			res.status(400).send({ msg: 'Passwords do not match', success: 'false' });
	} catch (error) {
		console.error(error);
		res.status(500).send('Internal Server Error');
	}
};

const getUserByAgencyId = (req, res) => {
	const { agencyId } = req.query;

	const foundUsers = User.findOne({ agency: new ObjectId(agencyId) });
	if (!foundUsers) return res.status(404).json({ msg: 'User not found.' });
	return res.status(200).json({ users: formatIds(foundUsers, 'foundUsers') });
};

module.exports = {
	logInUser,
	createUser,
	updateUser,
	getCurrentUser,
	getAllUsers,
	getSingleUser,
	getAllUsersForAdmin,
	resetPassword,
	getUserByEmail,
	updateForgottenPassword,
	getUserbalance,
	getUserByAgencyId,
	getAgencyUsers,
};
