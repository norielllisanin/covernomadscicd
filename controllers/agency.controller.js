const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const bcrypt = require('bcryptjs');
const {
	generateRandomString,
	formatIds,
	roundToThreeDecimals,
} = require('../utils.js');
const { generateUsername } = require('../helpers/generateUsername.js');
const XLSX = require('xlsx');
const moment = require('moment');
const momentTz = require('moment-timezone');

const Insurer = getCollection('insurers');
const Agency = getCollection('agencies');
const User = getCollection('users');
const Wholeseller = getCollection('wholesellers');
const Policy = getCollection('policies');
const Broker = getCollection('brokers');

// @desc    Creates a new agency
// @route   POST /api/agencies
// @access  WHOLESELLER
const createAgency = async (req, res) => {
	const {
		insurerId,
		name,
		code,
		commissionPercentage,
		firstName,
		lastName,
		email,
		dob,
		status,
		balance,
		maxBalance,
		wholesalerId,
		// offeredProducts,
	} = req.body;

	if (balance > maxBalance) {
		return res
			.status(404)
			.json({ msg: 'Balance should be less then maximum balance allowed' });
	}
	let wholesellerId;
	if (req.wholesellerAdmin) {
		wholesellerId = req.wholesellerAdmin.wholesellerId;
	} else {
		wholesellerId = wholesalerId;
	}
	const foundInsurer = await Insurer.findOne({ _id: new ObjectId(insurerId) });
	if (!foundInsurer)
		return res.status(404).json({ msg: 'No insurer found with provided ID' });
	const foundSuperUser = await User.findOne({
		email: email,
		permission: 'SUPER',
	});
	if (foundSuperUser)
		return res
			.status(404)
			.json({ msg: 'Agency super user already exist with this email' });

	const foundWholeseller = await Wholeseller.findOne({
		_id: new ObjectId(wholesellerId),
	});
	if (!foundWholeseller)
		return res.status(404).json({ msg: 'Wholeseller not found.' });

	if (!foundWholeseller.maxBalance)
		return res.status(404).json({ msg: 'Max balance is not set' });
	if (foundWholeseller.maxBalance < maxBalance)
		return res.status(404).json({ msg: 'Not enough max balance' });
	const agencyExists = await Agency.findOne({ code });
	if (agencyExists)
		return res.status(409).json({
			msg: 'Agency with provided code already exists. Please select another code.',
		});

	if (foundWholeseller?.balance < balance) {
		return res.status(404).json({ msg: 'Not enough balance' });
	}
	await Wholeseller.updateOne(
		{ _id: new ObjectId(wholesellerId) },
		{
			$set: {
				balance: foundWholeseller.balance - balance,
				maxBalance: foundWholeseller.maxBalance - maxBalance,
			},
		}
	);

	const createdAgency = await Agency.insertOne({
		insurer: new ObjectId(insurerId),
		wholeseller: new ObjectId(wholesellerId),
		name: name,
		code: code,
		status: status,
		commissionPercentage,
		balance: 0,
		maxBalance: maxBalance,
		createdAt: new Date(),
	});

	const generatedPassword = generateRandomString(10);
	const hashedPassword = await bcrypt.hash(generatedPassword, 6);
	const generatedUsername = await generateUsername({
		agencyId: createdAgency.insertedId,
		firstName,
	});

	const createdUser = await User.insertOne({
		agency: createdAgency.insertedId,
		firstName,
		lastName,
		username: generatedUsername,
		email: email,
		password: hashedPassword,
		dob: new Date(dob),
		permission: 'SUPER',
		isActive: true,
		createdAt: new Date(),
	});
	const foundUser = await User.findOne({ _id: createdUser.insertedId });
	const foundAgency = await Agency.findOne({ _id: createdAgency.insertedId });

	return res.status(201).json({
		msg: 'Agency created with super user. Please make sure to copy user credentials as you will NOT be able to access these again!',
		agency: formatIds(foundAgency, 'agency'),
		user: formatIds({ ...foundUser, password: generatedPassword }, 'user'),
	});
};
// @desc    Creates a new agency
// @route   POST /api/agencies/insurer
// @access  INSURER
const InsurerCreateAgency = async (req, res) => {
	const {
		name,
		code,
		commissionPercentage,
		firstName,
		lastName,
		email,
		dob,
		status,
		balance,
		maxBalance,
	} = req.body;

	if (balance > maxBalance) {
		return res
			.status(404)
			.json({ msg: 'Balance should be less then maximum balance allowed' });
	}
	const insurerId = req.insurerAdmin.insurerId;
	const brokerId = '6799e484ffd580f6e7c862f8';
	const foundInsurer = await Insurer.findOne({ _id: new ObjectId(insurerId) });
	if (!foundInsurer)
		return res.status(404).json({ msg: 'No insurer found with provided ID' });
	const foundSuperUser = await User.findOne({
		email: email,
		permission: 'SUPER',
	});
	if (foundSuperUser)
		return res
			.status(404)
			.json({ msg: 'Agency super user already exist with this email' });

	const foundBroker = await Broker.findOne({
		_id: new ObjectId(brokerId),
	});
	if (!foundBroker) return res.status(404).json({ msg: 'Broker not found.' });

	if (!foundBroker.maxBalance)
		return res.status(404).json({ msg: 'Max balance is not set' });
	if (foundBroker.maxBalance < maxBalance)
		return res.status(404).json({ msg: 'Not enough max balance' });
	const agencyExists = await Agency.findOne({ code });
	if (agencyExists)
		return res.status(409).json({
			msg: 'Agency with provided code already exists. Please select another code.',
		});

	if (foundBroker?.balance < balance) {
		return res.status(404).json({ msg: 'Not enough balance' });
	}
	await Broker.updateOne(
		{ _id: new ObjectId(brokerId) },
		{
			$set: {
				balance: foundBroker.balance - balance,
				maxBalance: foundBroker.maxBalance - maxBalance,
			},
		}
	);
	if (commissionPercentage > 35) {
		return res
			.status(404)
			.json({ msg: 'Commission percentage should be less then 35%' });
	}
	const createdAgency = await Agency.insertOne({
		insurer: new ObjectId(insurerId),
		broker: new ObjectId(brokerId),
		name: name,
		code: code,
		status: status,
		commissionPercentage,
		balance: 0,
		maxBalance: maxBalance,
		createdAt: new Date(),
	});

	const generatedPassword = generateRandomString(10);
	const hashedPassword = await bcrypt.hash(generatedPassword, 6);
	const generatedUsername = await generateUsername({
		agencyId: createdAgency.insertedId,
		firstName,
	});

	const createdUser = await User.insertOne({
		agency: createdAgency.insertedId,
		firstName,
		lastName,
		username: generatedUsername,
		email: email,
		password: hashedPassword,
		dob: new Date(dob),
		permission: 'SUPER',
		isActive: true,
		createdAt: new Date(),
	});
	const foundUser = await User.findOne({ _id: createdUser.insertedId });
	const foundAgency = await Agency.findOne({ _id: createdAgency.insertedId });

	return res.status(201).json({
		msg: 'Agency created with super user. Please make sure to copy user credentials as you will NOT be able to access these again!',
		agency: formatIds(foundAgency, 'agency'),
		user: formatIds({ ...foundUser, password: generatedPassword }, 'user'),
	});
};

const updateAgency = async (req, res) => {
	const { status, agencyId, user, maxBalance, wholesalerId, brokerId } =
		req.body;
	let dob = new Date(user.dob);
	user.dob = dob;
	let wholesellerId = req.wholesellerAdmin
		? req.wholesellerAdmin.wholesellerId
		: wholesalerId;

	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	if (!foundAgency)
		return res.status(404).json({ msg: 'Agency not found with provided ID' });
	let foundRecord;
	if (wholesellerId) {
		foundRecord = await Wholeseller.findOne({
			_id: new ObjectId(wholesellerId),
		});
		if (!foundRecord) {
			return res.status(404).json({ msg: 'Wholesaler not found' });
		}
	} else if (brokerId) {
		foundRecord = await Broker.findOne({ _id: new ObjectId(brokerId) });
		if (!foundRecord) {
			return res.status(404).json({ msg: 'Broker not found.' });
		}
	}

	const foundUser = await User.findOne({
		agency: new ObjectId(agencyId),
		permission: 'SUPER',
	});
	if (!foundUser)
		return res
			.status(404)
			.json({ msg: 'Super user not found with provided agency' });

	if (!foundRecord.maxBalance) {
		return res.status(404).json({ msg: 'Max balance not set' });
	}

	if (
		maxBalance > foundAgency.maxBalance &&
		foundRecord.maxBalance < maxBalance - foundAgency.maxBalance
	) {
		return res.status(404).json({ msg: 'Not enough balance' });
	}

	let newBalance;
	if (maxBalance > foundAgency.maxBalance) {
		newBalance = foundRecord.maxBalance - (maxBalance - foundAgency.maxBalance);
	} else {
		newBalance = foundRecord.maxBalance + (foundAgency.maxBalance - maxBalance);
	}

	if (newBalance === undefined || newBalance < 0) {
		return res.status(404).json({ msg: 'Invalid balance set' });
	}

	if (wholesellerId) {
		await Wholeseller.updateOne(
			{ _id: new ObjectId(wholesellerId) },
			{ $set: { maxBalance: newBalance } }
		);
	} else {
		await Broker.updateOne(
			{ _id: new ObjectId(brokerId) },
			{ $set: { maxBalance: newBalance } }
		);
	}

	const updateAgencyData = {
		$set: {
			status: status,
			maxBalance: maxBalance,
		},
	};
	await Agency.updateOne({ _id: new ObjectId(agencyId) }, updateAgencyData);

	// Update the Super User details
	await User.updateOne({ _id: new ObjectId(foundUser._id) }, { $set: user });

	// update all user status
	await User.updateMany(
		{ agency: new ObjectId(agencyId) },
		{ $set: { isActive: status } }
	);

	return res.status(201).json({
		msg: 'Agency Updated.',
	});
};

const InsurerUpdateAgency = async (req, res) => {
	const { status, agencyId, user, maxBalance } = req.body;
	let dob = new Date(user.dob);
	user.dob = dob;

	const brokerId = '677c12e19dc6660a56095a73';
	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	if (!foundAgency)
		return res.status(404).json({ msg: 'Agency not found with provided ID' });
	const foundBroker = await Broker.findOne({
		_id: new ObjectId(brokerId),
	});

	if (!foundBroker) {
		return res.status(404).json({ msg: 'Broker not found' });
	}
	const foundUser = await User.findOne({
		agency: new ObjectId(agencyId),
		permission: 'SUPER',
	});
	if (!foundUser)
		return res
			.status(404)
			.json({ msg: 'Super user not found with provided agency' });

	if (!foundBroker.maxBalance) {
		return res.status(404).json({ msg: 'Max balance not set' });
	}
	if (
		maxBalance > foundAgency.maxBalance &&
		foundBroker.maxBalance < maxBalance - foundAgency.maxBalance
	)
		return res.status(404).json({ msg: 'Not enough balance' });
	if (maxBalance > foundAgency.maxBalance) {
		let newBalance =
			foundBroker.maxBalance - (maxBalance - foundAgency.maxBalance);
		if (!newBalance) {
			return res.status(404).json({ msg: 'Invalid balance set' });
		}
		await Broker.updateOne(
			{ _id: new ObjectId(brokerId) },
			{ $set: { maxBalance: newBalance } }
		);
	} else {
		let newBalance =
			foundBroker.maxBalance + (foundAgency.maxBalance - maxBalance);
		if (!newBalance) {
			return res.status(404).json({ msg: 'Invalid balance set' });
		}

		await Broker.updateOne(
			{ _id: new ObjectId(brokerId) },
			{ $set: { maxBalance: newBalance } }
		);
	}
	const updateAgencyData = {
		$set: {
			status: status,
			maxBalance: maxBalance,
		},
	};
	await Agency.updateOne({ _id: new ObjectId(agencyId) }, updateAgencyData);
	await User.updateOne({ _id: new ObjectId(foundUser._id) }, { $set: user });

	return res.status(201).json({
		msg: 'Agency Updated.',
	});
};

// @desc   Returns all agencies of logged in wholeseller or CVN admin
// @route   GET /api/agencies/:page
// @access  WHOLESELLER, ADMIN
const getAllAgencies = async (req, res) => {
	if (req.cvnAdmin) {
		const foundAgencies = await Agency.aggregate([
			{
				$lookup: {
					from: 'wholesellers',
					localField: 'wholeseller',
					foreignField: '_id',
					as: 'wholeseller',
				},
			},
			{
				$sort: { name: 1 },
			},
		]).toArray();
		return res
			.status(200)
			.json({ agencies: formatIds(foundAgencies, 'agency') });
	}
	const wholesellerId = req.wholesellerAdmin.wholesellerId;
	const page = parseInt(req.params.page);
	const PAGE_SIZE = 20;
	const skip = page * PAGE_SIZE;
	//generate query pipeline
	const queryPipeline = [
		{
			$match: {
				wholeseller: new ObjectId(wholesellerId),
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
// @desc    Generate sales statement for agency
// @route   GET /api/agencies/sales-statement
// @access  PRIVATE - SUPER, STANDARD
const getAgencySalesStatement = async (req, res) => {
	const agencyId = req.user.agency.agencyId;
	const { startDate, endDate, timezone } = req.query;

	const dateRange = {
		start: momentTz.tz(startDate, timezone).startOf('day').toDate(),
		end: momentTz.tz(endDate, timezone).endOf('day').toDate(),
	};

	const foundPolicies = await Policy.aggregate([
		{
			$match: {
				agency: new ObjectId(agencyId),
				createdAt: {
					$gte: dateRange.start,
					$lte: dateRange.end,
				},
			},
		},
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
			'Agency Name': policy && req.user.agency.name,
			'Booked By':
				policy &&
				`${policy?.createdBy?.firstName} ${policy?.createdBy?.lastName}`,
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
			'Gross Premium': policy && policy?.totalPremium?.AED,
			'Base Premium':
				policy && roundToThreeDecimals(policy?.premiumExclVat?.AED),
			'VAT Amount': policy && roundToThreeDecimals(policy?.vat?.AED),
			'Marketing fee':
				policy && roundToThreeDecimals(policy?.breakdown?.agency?.value),
			'NET Payable': roundToThreeDecimals(
				policy?.totalPremium?.AED - policy?.breakdown?.agency?.value
			),
			'Staff Incentive':
				policy && roundToThreeDecimals(policy?.breakdown?.staff?.value),
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

const getSingleAgency = async (req, res) => {
	const { agencyId } = req.query;

	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	const foundSuperUser = await User.findOne({
		agency: new ObjectId(agencyId),
		permission: 'SUPER',
	});
	if (!foundSuperUser) {
		return res.status(404).json({ msg: 'No super user found for agency' });
	}
	foundAgency.superUser = foundSuperUser;
	if (!foundAgency)
		return res.status(404).json({ msg: 'Agency not found with this id.' });
	return res.status(200).json({ agency: formatIds(foundAgency, 'agency') });
};
// @desc    Get Single agency
// @route   POST /api/agencies/single-agency/insurer
// @access  INSURER
const InsurerGetSingleAgency = async (req, res) => {
	const { agencyId } = req.query;
	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	const foundSuperUser = await User.findOne({
		agency: new ObjectId(agencyId),
		permission: 'SUPER',
	});
	if (!foundSuperUser) {
		return res.status(404).json({ msg: 'No super user found for agency' });
	}
	foundAgency.superUser = foundSuperUser;
	if (!foundAgency)
		return res.status(404).json({ msg: 'Agency not found with this id.' });
	return res.status(200).json({ agency: formatIds(foundAgency, 'agency') });
};
const convertCreditToBalance = async (req, res) => {
	const wholesellerId = req.wholesellerAdmin.wholesellerId;
	//generate query pipeline
	const queryPipeline = [
		{
			$match: {
				wholeseller: new ObjectId(wholesellerId),
			},
		},
	];

	await Agency.updateMany(
		{
			wholeseller: new ObjectId(wholesellerId), // Match the wholeseller ID
		},
		[
			{
				$set: {
					balance: {
						$cond: {
							if: { $gt: [{ $ifNull: ['$balance', 0] }, 0] }, // Check if balance is greater than 0
							then: { $multiply: [{ $ifNull: ['$balance', 0] }, -1] }, // Multiply by -1 if positive
							else: { $ifNull: ['$balance', 0] }, // Otherwise, keep it unchanged
						},
					},
				},
			},
		]
	);
	const foundAgencies = await Agency.aggregate([...queryPipeline]).toArray();

	return res.status(200).json({ agency: foundAgencies });
};
const setInitalBalance = async (req, res) => {
	const { code, balance, mba } = req.body;
	// return res.status(200).json({ agency: 'Done' });

	const agency = await Agency.updateOne(
		{
			code: code, // Filter to update only documents where the status field exists
		},
		{
			$set: {
				balance: balance, // Set the status field to true
				maxBalance: mba, // Set the status field to true
			},
		}
	);

	return res.status(200).json({ agency: agency });
};

module.exports = {
	createAgency,
	getAgencySalesStatement,
	getAllAgencies,
	getSingleAgency,
	updateAgency,
	convertCreditToBalance,
	setInitalBalance,
	InsurerCreateAgency,
	InsurerGetSingleAgency,
	InsurerUpdateAgency,
};
