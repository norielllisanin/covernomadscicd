const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const bcrypt = require('bcryptjs');
const Insurer = getCollection('insurers');
const InsurerAdmin = getCollection('insurerAdmins');
const Broker = getCollection('brokers');
const Agency = getCollection('agencies');
const User = getCollection('users');

const BrokerAdmin = getCollection('brokerAdmins');
const XLSX = require('xlsx');
const moment = require('moment');
const momentTz = require('moment-timezone');
const {
	generateRandomString,
	formatIds,
	roundToThreeDecimals,
} = require('../utils.js');
const Policy = getCollection('policies');
const { generateUsername } = require('../helpers/generateUsername.js');
const jwt = require('jsonwebtoken');
// @desc    Creates a new broker
// @route   POST /api/brokers
// @access  Insurer
const createBroker = async (req, res) => {
	try {
		const {
			insurerId,
			name,
			code,
			firstName,
			lastName,
			email,
			dob,
			status,
			commissionPercentage,
			balance,
			maxBalance,
			partner,
		} = req.body;

		if (maxBalance > 99999999) {
			return res.status(400).json({
				msg: 'Max balance must be less then 8 digits',
			});
		}

		if (commissionPercentage > 60) {
			return res.status(400).json({
				msg: 'Broker commission must not be greater then 60%',
			});
		}
		let insurerid;
		if (req.InsurerAdmin) {
			insurerid = req.InsurerAdmin.insurer;
		} else {
			insurerid = insurerId;
		}
		const foundInsurer = await Insurer.findOne({
			_id: new ObjectId(insurerId),
		});

		if (!foundInsurer)
			return res.status(404).json({ msg: 'No insurer found with provided ID' });

		const foundSuperUser = await BrokerAdmin.findOne({
			email: email,
			permission: 'SUPER',
		});

		if (foundSuperUser)
			return res
				.status(404)
				.json({ msg: 'Broker super user already exist with this email' });

		const foundinsurer = await Insurer.findOne({
			_id: new ObjectId(insurerid),
		});
		if (!foundinsurer)
			return res.status(404).json({ msg: 'insurer not found.' });
		const brokerExists = await Broker.findOne({ code });
		if (brokerExists)
			return res.status(409).json({
				msg: 'Broker with provided code already exists. Please select another code.',
			});

		const createdBroker = await Broker.insertOne({
			insurerId: new ObjectId(insurerId),
			name: name,
			code: code,
			status: status,
			commissionPercentage,
			maxBalance: maxBalance,
			balance: balance,
			iho: false,
			createdAt: new Date(),
		});
		const generatedPassword = generateRandomString(10);
		const hashedPassword = await bcrypt.hash(generatedPassword, 6);
		const numOfBrokerAdmins = await BrokerAdmin.countDocuments({});
		const generatedUsername = await generateUsername({
			brokerId: createdBroker.insertedId,
			firstName,
		});
		const brokerusername = `b_${generatedUsername}`;
		const createdBrokerAdmin = await BrokerAdmin.insertOne({
			broker: createdBroker.insertedId,
			firstName,
			lastName,
			username: brokerusername,
			email: email,
			password: hashedPassword,
			dob: new Date(dob),
			permission: 'SUPER',
			isActive: true,
			createdAt: new Date(),
		});

		const foundBrokerAdmin = await BrokerAdmin.findOne({
			_id: createdBrokerAdmin.insertedId,
		});

		const foundBroker = await Broker.findOne({ _id: createdBroker.insertedId });
		return res.status(201).json({
			msg: 'Broker created with super user. Please make sure to copy user credentials as you will NOT be able to access these again!',
			broker: formatIds(foundBroker, 'broker'),
			user: formatIds(
				{ ...foundBrokerAdmin, password: generatedPassword },
				'user'
			),
		});
	} catch (error) {
		console.log('broker create error', JSON.stringify(error));
		return res.status(500).json({ msg: 'Internal server error' });
	}
};

// @desc   Returns all brokers of logged in Insurer
// @route   GET /api/brokers/:page
// @access  Insurer
const getAllBrokers = async (req, res) => {
	if (req.insurerAdmin) {
		const foundBrokers = await Broker.aggregate([
			{
				$lookup: {
					from: 'insurers',
					localField: 'insurerId',
					foreignField: '_id',
					as: 'insurer',
				},
			},
			{
				$sort: { name: 1 },
			},
		]).toArray();
		return res.status(200).json({ brokers: formatIds(foundBrokers, 'broker') });
	}
	const insurerId = req?.insurerAdmin?.insurerId;
	const page = parseInt(req.params.page);
	const PAGE_SIZE = 20;
	const skip = page * PAGE_SIZE;
	//generate query pipeline
	const queryPipeline = [
		{
			$match: {
				insurerId: new ObjectId(insurerId),
			},
		},
	];

	//count total number of docs that fit query
	const brokerCount = await Broker.aggregate([
		...queryPipeline,
		{
			$group: {
				_id: null,
				count: { $sum: 1 },
			},
		},
		{
			$project: {
				_id: 0,
				totalBrokers: '$count',
			},
		},
	]).toArray();
	//calculate pagination vars
	const totalBrokers = brokerCount.pop()?.totalBrokers || 0;
	const totalPages = Math.ceil(totalBrokers / PAGE_SIZE);
	const nextPage = page + 1 >= totalPages ? null : page + 1;
	const prevPage = page - 1 < 0 ? null : page - 1;

	//retrieve paginated documents
	const foundBrokers = await Broker.aggregate([
		...queryPipeline,
		{ $sort: { name: 1 } },
		// { $skip: skip },
		// { $limit: PAGE_SIZE },
	]).toArray();

	return res.status(200).json({
		brokers: formatIds(foundBrokers, 'broker'),
		pagination: {
			totalRecords: totalBrokers,
			totalPages,
			currentPage: page,
			nextPage,
			prevPage,
		},
	});
};

// @desc   Returns single broker of logged in Insurer
// @route   GET /api/brokers/single-broker
// @access  Insurer and ADMIN
const getSingleBroker = async (req, res) => {
	const { brokerId } = req.query;
	const foundBroker = await Broker.findOne({ _id: new ObjectId(brokerId) });

	const foundSuperUser = await BrokerAdmin.findOne({
		broker: new ObjectId(brokerId),
		permission: 'SUPER',
	});
	if (!foundSuperUser) {
		return res.status(404).json({ msg: 'No super user found for broker' });
	}
	foundBroker.superUser = foundSuperUser;
	if (!foundBroker) {
		return res.status(404).json({ msg: 'Broker not found with this id.' });
	}
	return res.status(200).json({ broker: formatIds(foundBroker, 'broker') });
};

// Update broker
const updateProfile = async (req, res) => {
	const {
		email,
		firstName,
		lastName,
		name,
		brokerId,
		brokerAdminId,
		isActive,
	} = req.body;
	const foundBroker = await Broker.findOne({
		_id: new ObjectId(brokerId),
	});
	const foundBrokerAdmin = await BrokerAdmin.findOne({
		_id: new ObjectId(brokerAdminId),
	});
	if (!foundBroker || !foundBrokerAdmin)
		return res.status(404).json({ msg: 'broker or broker admin not found.' });
	const foundBrokerAdminByEmail = await BrokerAdmin.findOne({
		email,
		broker: { $ne: foundBroker._id },
	});
	if (foundBrokerAdminByEmail)
		return res
			.status(409)
			.json({ msg: 'Email already used by another broker.' });
	await Broker.updateOne({ _id: foundBroker._id }, { $set: { name } });
	const updateData = { email, firstName, lastName };
	if (isActive !== undefined) {
		updateData.isActive = isActive;
	}
	await BrokerAdmin.updateOne(
		{ _id: foundBrokerAdmin._id },
		{ $set: updateData }
	);

	return res.status(200).json({ msg: 'Profile updated successfully.' });
};

// @desc   Returns all agencies of logged in broker or insurer
// @route   GET /api/brokers/:page
// @access  BROKER,INSURER
const getAllAgencies = async (req, res) => {
	if (req.insurerAdmin) {
		const foundAgencies = await Agency.aggregate([
			{
				$lookup: {
					from: 'brokers',
					localField: 'broker',
					foreignField: '_id',
					as: 'broker',
				},
			},
			{
				$match: {
					broker: { $ne: [] }, // Only include agencies that have brokers
				},
			},
			{
				$project: {
					_id: 1,
					insurer: 1,
					name: 1,
					code: 1,
					status: 1,
					commissionPercentage: 1,
					createdAt: 1,
					broker: { $arrayElemAt: ['$broker._id', 0] },
				},
			},
			{
				$sort: { name: 1 }, // Sort by name
			},
		]).toArray();

		return res
			.status(200)
			.json({ agencies: formatIds(foundAgencies, 'agency') });
	}
	const brokerId = req?.brokerAdmin?.brokerId;
	const page = parseInt(req.params.page);
	const PAGE_SIZE = 20;
	const skip = page * PAGE_SIZE;
	//generate query pipeline
	const queryPipeline = [
		{
			$match: {
				broker: new ObjectId(brokerId),
			},
		},
	];
	//count total number of docs that fit query
	const agencyCount = await Agency.aggregate([
		...queryPipeline,
		{
			$group: {
				_id: null,
				count: { $sum: 1 },
			},
		},
		{
			$project: {
				_id: 0,
				totalAgencies: '$count',
			},
		},
	]).toArray();

	//calculate pagination vars
	const totalAgencies = agencyCount.pop()?.totalAgencies || 0;
	const totalPages = Math.ceil(totalAgencies / PAGE_SIZE);
	const nextPage = page + 1 >= totalPages ? null : page + 1;
	const prevPage = page - 1 < 0 ? null : page - 1;
	//retrieve paginated documents
	const foundAgencies = await Agency.aggregate([
		...queryPipeline,
		{ $sort: { name: 1 } },
		// { $skip: skip },
		// { $limit: PAGE_SIZE },
	]).toArray();
	return res.status(200).json({
		agencies: formatIds(foundAgencies, 'agency'),
		pagination: {
			totalRecords: totalAgencies,
			totalPages,
			currentPage: page,
			nextPage,
			prevPage,
		},
	});
};
const updateBroker = async (req, res) => {
	const {
		status,
		brokerId,
		user,
		maxBalance,
		balance,
		name,
		commissionPercentage,
	} = req.body;

	let dob = new Date(user.dob);
	user.dob = dob;
	// const insurerId = req.insurerAdmin.insurerId;
	const foundBroker = await Broker.findOne({ _id: new ObjectId(brokerId) });
	if (!foundBroker)
		return res.status(404).json({ msg: 'Broker not found with provided ID' });
	const foundUser = await BrokerAdmin.findOne({
		broker: new ObjectId(brokerId),
		permission: 'SUPER',
	});
	if (!foundUser)
		return res
			.status(404)
			.json({ msg: 'Super user not found with provided broker' });

	const updateBrokerData = {
		$set: {
			name: name,
			status: status,
			maxBalance: Number(maxBalance),
			balance: parseFloat(balance),
			commissionPercentage: Number(commissionPercentage),
		},
	};
	await Broker.updateOne({ _id: new ObjectId(brokerId) }, updateBrokerData);
	await BrokerAdmin.updateOne(
		{ _id: new ObjectId(foundUser._id) },
		{ $set: user }
	);
	return res.status(201).json({
		msg: 'Broker Updated.',
	});
};
// api/brokers/me
const logInBroker = async (req, res) => {
	const { username, password } = req.body;
	const broker = await BrokerAdmin.findOne({ username });

	if (broker) {
		//no broker found
		if (!broker)
			return res
				.status(400)
				.send({ msg: 'No Broker found with this username.' });
		//insurerAdmin inActive
		if (!broker.isActive)
			return res.status(400).send({
				msg: 'Your account has been de-activated. Please contact your admin.',
			});

		//incorrect password
		const isMatch = await bcrypt.compare(password, broker.password);
		if (!isMatch) return res.status(400).send({ msg: 'Incorrect password.' });

		//all good;
		const constructedUser = {
			brokerAdminId: broker._id,
			brokerId: broker.broker,
			firstName: broker.firstName,
			lastName: broker.lastName,
			username: broker.username,
			email: broker.email,
		};

		const accessToken = jwt.sign(constructedUser, process.env.JWT_SECRET, {
			expiresIn: '24h',
		});

		return res.status(200).json({
			accessToken: accessToken,
			brokerAdmin: constructedUser,
			role: 'broker',
		});
	} else {
		const user = await User.findOne({ username });

		//no user found
		if (!user)
			return res
				.status(400)
				.send({ msg: 'No Broker found with this username.' });

		//user in active
		if (!user.isActive)
			return res.status(400).send({
				msg: 'Your account has been de-activated. Please contact your admin.',
			});

		let userAgency;
		if (user.broker && user.broker !== undefined) {
			userAgency = await Broker.findOne({ _id: new ObjectId(user.broker) });
		}

		if (!userAgency) return res.status(400).send({ msg: `Broker not found` });

		//agency status check either active or in-active
		if (!userAgency.status)
			return res.status(400).send({
				msg: `Your Broker is currently inactive. Please contact your admin.`,
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
		}

		const constructedUser = {
			userId: user._id,
			firstName: user.firstName,
			lastName: user.lastName,
			username: user.username,
			email: user.email,
			dob: user.dob,
			permission: user.permission,

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
			role: 'user',
		});
	}
};

const deleteBroker = async (req, res) => {
	const { brokerId } = req.params;
	try {
		const foundBroker = await Broker.findOne({ _id: new ObjectId(brokerId) });

		if (!foundBroker)
			return res.status(404).json({ msg: 'Broker not found with provided ID' });
		const foundUser = await BrokerAdmin.findOne({
			broker: new ObjectId(brokerId),
			permission: 'SUPER',
		});

		if (!foundUser)
			return res
				.status(404)
				.json({ msg: 'Super user not found with provided broker' });
		await Broker.deleteOne({ _id: new ObjectId(brokerId) });
		await BrokerAdmin.deleteOne({ _id: new ObjectId(foundUser._id) });

		return res.status(200).json({ msg: 'Broker deleted.' });
	} catch (error) {
		console.log('broker delete error', JSON.stringify(error));
		res
			.status(500)
			.json({ msg: 'Something went wrong. Please try again later.', error });
	}
};
// @desc    Gets the current logged Insurer
// @route   GET /api/insurers/me
// @access  INSURER
const getCurrentBroker = async (req, res) => {
	const brokerId = req.brokerAdmin
		? req.brokerAdmin?.brokerId
		: req.user?.broker?.brokerId;

	const [currentBroker] = await Broker.aggregate([
		{ $match: { _id: new ObjectId(brokerId) } },
		{
			$lookup: {
				from: 'brokerAdmins',
				localField: '_id', // corrected from 'brokerId'
				foreignField: 'broker', // this field exists in brokerAdmins collection
				as: 'brokerAdmin',
			},
		},
		{
			$addFields: {
				brokerAdmin: { $arrayElemAt: ['$brokerAdmin', 0] },
			},
		},
		{ $limit: 1 },
	]).toArray();

	const brokerAdminData = {
		brokerAdminId: currentBroker?.brokerAdmin?._id,
		brokerId: currentBroker?._id,
		firstName: currentBroker?.brokerAdmin?.firstName,
		lastName: currentBroker?.brokerAdmin?.lastName,
		username: currentBroker?.brokerAdmin?.username,
		email: currentBroker?.brokerAdmin?.email,
	};

	const [brokerAdmin] = await BrokerAdmin.aggregate([
		{ $match: { _id: new ObjectId(brokerAdminData.brokerAdminId) } },
		{
			$lookup: {
				from: 'brokers',
				localField: 'broker',
				foreignField: '_id',
				as: 'broker',
			},
		},
		{ $addFields: { broker: { $arrayElemAt: ['$broker', 0] } } },
		{ $unset: ['password'] },
		{ $limit: 1 },
	]).toArray();
	if (!brokerAdmin) return res.status(404).json({ msg: 'User not found.' });

	return res.status(200).json({
		brokerAdmin: formatIds(brokerAdmin, 'brokerAdmin'),
		user: req.brokerAdmin ? req.brokerAdmin : brokerAdminData,
	});
};
const getSinleBroker = async (req, res) => {
	const { brokerId } = req.query;
	await Broker.findOne({ _id: new ObjectId(brokerId) })
		.then((broker) => res.json({ broker }))
		.catch((err) => res.status(404).json({ msg: 'Broker not found.' }));
};
const getBrokersSalesStatement = async (req, res) => {
	const { startDate, endDate, timezone } = req.query;
	const agencyId = req.query.agencyId;
	const brokerId = req.brokerAdmin.brokerId || req.query.brokerId;
	const dateRange = {
		start: momentTz.tz(startDate, timezone).startOf('day').toDate(),
		end: momentTz.tz(endDate, timezone).endOf('day').toDate(),
	};

	const foundPolicies = await Policy.aggregate([
		{
			$match: {
				...(agencyId ? { agency: new ObjectId(agencyId) } : {}),
				...(brokerId ? { broker: new ObjectId(brokerId) } : {}), // Conditionally add agency filter
				createdAt: {
					$gte: dateRange.start,
					$lte: dateRange.end,
				},
			},
		},
		{
			$lookup: {
				from: 'brokers', // Assuming the collection name for agencies is 'agencies'
				localField: 'broker', // Field in policies collection that links to agencies
				foreignField: '_id', // Field in agencies collection (usually _id)
				as: 'brokerDetails',
			},
		},
		{
			$unwind: '$brokerDetails',
		},
		...(agencyId && [
			{
				$lookup: {
					from: 'agencies', // Assuming the collection name for agencies is 'agencies'
					localField: 'agency', // Field in policies collection that links to agencies
					foreignField: '_id', // Field in agencies collection (usually _id)
					as: 'agencyDetails',
				},
			},
			{
				$unwind: '$agencyDetails',
			},
			{
				$match: {
					'agencyDetails.broker': new ObjectId(brokerId),
					createdAt: {
						$gte: dateRange.start,
						$lte: dateRange.end,
					},
				},
			},
		]),
		{
			$lookup: {
				from: 'users',
				localField: 'createdBy',
				foreignField: '_id',
				as: 'createdBy',
			},
		},
		{ $addFields: { createdBy: { $arrayElemAt: ['$createdBy', 0] } } },
		{
			$lookup: {
				from: 'priceFactors',
				localField: 'priceFactor',
				foreignField: '_id',
				as: 'priceFactor',
			},
		},
		{ $addFields: { priceFactor: { $arrayElemAt: ['$priceFactor', 0] } } },
		{
			$lookup: {
				from: 'products',
				localField: 'priceFactor.product',
				foreignField: '_id',
				as: 'product',
			},
		},
		{ $addFields: { product: { $arrayElemAt: ['$product', 0] } } },
		{
			$lookup: {
				from: 'passengers',
				localField: '_id',
				foreignField: 'policy',
				as: 'passengers',
			},
		},
		{ $addFields: { policyHolder: { $arrayElemAt: ['$passengers', 0] } } },
	]).toArray();

	const policiesToWrite = foundPolicies.length == 0 ? [null] : foundPolicies;
	const dataToWrite = policiesToWrite.map((policy) => {
		const passengers = policy?.passengers;
		const namesString = passengers
			?.map((pax) => `${pax.firstName} ${pax.lastName}`) // Extract and format the names
			.join(', '); // Join them with commas
		return {
			Channel: policy && 'B2B',
			// 'Booked Country': policy && 'UAE',
			...(agencyId && {
				'Agency Name': policy && policy.agencyDetails.name,
				'Booked By':
					policy &&
					`${policy?.createdBy?.firstName} ${policy?.createdBy?.lastName}`,
			}),
			...(policy?.brokerDetails && {
				'Broker Name': policy && policy.brokerDetails.name,
			}),

			'Booking Date': policy && moment(policy?.createdAt).format('DD-MM-YYYY'),
			'Certificate No.': policy && policy?.number,
			'Plan Type': policy && `Travel Insurance ${policy?.productName}`,
			passengers: `${namesString}`,
			'Number of Insureds': passengers?.length,
			// 'Full Name':
			// 	policy &&
			// 	`${policy?.policyHolder?.firstName} ${policy?.policyHolder?.lastName}`,
			Gender: policy && policy?.policyHolder?.gender,
			'Date of Birth':
				policy && moment(policy?.policyHolder?.dob).format('DD-MM-YYYY'),
			'Pax Type': policy && policy?.policyHolder?.type,
			Nationality: policy && policy?.policyHolder?.nationality,
			'Passport No': policy && policy?.policyHolder?.passportNumber,
			// 'Origin Country': policy && policy?.from,
			'Destination Country': policy && policy?.to,
			'Departure Date':
				policy && moment(policy?.departureDate)?.format('DD-MM-YYYY'),
			'Return Date': policy
				? policy?.returnDate
					? moment(policy?.returnDate).format('DD-MM-YYYY')
					: 'N/A'
				: '',
			'Travel Days': policy
				? policy?.returnTrip
					? moment(policy?.returnDate).diff(
							moment(policy?.departureDate),
							'days'
					  ) + 1
					: 1
				: '',
			'Pax No': policy && policy?.passengers?.length,
			'Policy Type': policy && policy?.product?.type,
			Currency: policy && 'AED',
			'Gross Premium':
				policy && roundToThreeDecimals(policy?.totalPremium?.AED),
			'Base Premium':
				policy && roundToThreeDecimals(policy?.premiumExclVat?.AED),
			'VAT Amount': policy && roundToThreeDecimals(policy?.vat?.AED),
			...(policy && policy.brokerDetails
				? {
						'Marketing fee':
							policy && roundToThreeDecimals(policy?.breakdown?.broker?.value),
						'NET Payable':
							policy &&
							roundToThreeDecimals(
								policy?.totalPremium?.AED - policy?.breakdown?.broker?.value
							),
				  }
				: {
						'Marketing fee':
							policy && roundToThreeDecimals(policy?.breakdown?.agency?.value),
						'NET Payable':
							policy &&
							roundToThreeDecimals(
								policy?.totalPremium?.AED -
									policy?.breakdown?.agency?.value -
									policy?.breakdown?.broker?.value
							),
				  }),
			broker: roundToThreeDecimals(policy?.breakdown?.broker?.value),
			Status: policy && policy?.status,
			'LPO/Remarks': policy && policy?.remarks ? policy.remarks : 'N/A',
		};
	});
	const worksheet = XLSX.utils.json_to_sheet(dataToWrite);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, `Sales Sheet`);
	const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
	res.setHeader(
		'Content-Disposition',
		'attachment; filename="sales-statement.xlsx"'
	);
	res.setHeader(
		'Content-Type',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	);
	return res.send(buffer);
};

const getAdminBroker = async (req, res) => {
	try {
		const foundBrokers = await Broker.aggregate([
			{
				$lookup: {
					from: 'insurers',
					localField: 'insurerId',
					foreignField: '_id',
					as: 'insurer',
				},
			},
			{
				$sort: { name: 1 },
			},
		]).toArray();
		return res.status(200).json({ brokers: formatIds(foundBrokers, 'broker') });
	} catch (error) {
		console.log('broker get error', JSON.stringify(error));
		return res.status(500).json({ msg: 'Internal server error' });
	}
};

module.exports = {
	createBroker,
	getAllBrokers,
	getSingleBroker,
	updateProfile,
	updateBroker,
	logInBroker,
	getCurrentBroker,
	getSinleBroker,
	getAllAgencies,
	getBrokersSalesStatement,
	getAdminBroker,
	deleteBroker,
};
