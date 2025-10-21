const { getCollection } = require('../db');
const bcrypt = require('bcryptjs');
const {
	generateRandomString,
	formatIds,
	generateRandomNumber,
} = require('../utils.js');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const Insurer = getCollection('insurers');
const InsurerAdmin = getCollection('insurerAdmins');
const Broker = getCollection('brokers');
const Agency = getCollection('agencies');
const momentTz = require('moment-timezone');
const moment = require('moment');
const { roundToThreeDecimals, roundToTwoDecimals } = require('../utils');
const Policy = getCollection('policies');
const XLSX = require('xlsx');
const sendOtp = require('../services/sendOtp.js');
// @desc    Creates a new insurance company
// @route   POST /api/insurers
// @access  INTERNAL
const createInsurer = async (req, res) => {
	const { name, code, email, firstName, lastName } = req.body;

	if (!name || !code) {
		return res.status(400).json({ msg: 'Name and code are required.' });
	}

	const foundInsurer = await Insurer.findOne({ code, name });
	if (foundInsurer) {
		return res.status(409).json({ msg: 'Insurer already exists.' });
	}

	const generatedPassword = generateRandomString(10);
	const hashedPassword = await bcrypt.hash(generatedPassword, 6);
	const numOfInsurerAdmins = await InsurerAdmin.countDocuments({});

	const { insertedId } = await Insurer.insertOne({ name, code });

	const insurerAdmin = await InsurerAdmin.insertOne({
		insurer: insertedId,
		firstName: firstName,
		lastName: lastName,
		email: email,
		password: hashedPassword,
		username: `i_${firstName.toLowerCase()}_${numOfInsurerAdmins + 1}`,
		isActive: true,
		createdAt: new Date(),
	});

	const createdInsurer = await Insurer.findOne({ _id: insertedId });

	const createdinsurerAdmin = await InsurerAdmin.findOne({
		_id: insurerAdmin.insertedId,
	});
	return res.status(201).json({
		msg: 'Insurer created.',
		insurer: formatIds(createdInsurer, 'insurer'),
		insurerAdmin: formatIds(
			{ ...createdinsurerAdmin, password: generatedPassword },
			'insurerAdmin'
		),
	});
};

const updateInsurer = async (req, res) => {
	const { name, code, email, firstName, lastName } = req.body;
	const { insurerId } = req.params;
	const foundInsurerAdmin = await InsurerAdmin.findOne({
		_id: new ObjectId(insurerId),
	});
	const foundInsurer = await Insurer.findOne({
		_id: foundInsurerAdmin.insurer,
	});

	if (!foundInsurer) {
		return res.status(404).json({ msg: 'Insurer not found.' });
	}
	if (!foundInsurerAdmin) {
		return res.status(404).json({ msg: 'Insurer Admin not found.' });
	}

	const udpate = await Insurer.updateOne(
		{ _id: foundInsurer._id },
		{ $set: { name, code } }
	);

	const updateInsurerAdmin = await InsurerAdmin.updateOne(
		{ _id: foundInsurerAdmin._id },
		{ $set: { firstName, lastName, email } }
	);

	if (!udpate) {
		return res.status(404).json({ msg: 'Insurer not udpate.' });
	}
	if (!updateInsurerAdmin) {
		return res.status(404).json({ msg: 'Insurer admin not update.' });
	}
	return res.status(200).json({ msg: 'Insurer updated.' });
};

const logInInsurerAdmin = async (req, res) => {
	const { username, password } = req.body;

	const insurerAdmin = await InsurerAdmin.findOne({ username });

	//no insurerAdmin found
	if (!insurerAdmin)
		return res
			.status(400)
			.send({ msg: 'No Insurer found with this username.' });

	//insurerAdmin inActive
	if (!insurerAdmin.isActive)
		return res.status(400).send({
			msg: 'Your account has been de-activated. Please contact your admin.',
		});

	//incorrect password
	const isMatch = await bcrypt.compare(password, insurerAdmin.password);
	if (!isMatch) return res.status(400).send({ msg: 'Incorrect password.' });

	//all good;

	let otp = generateRandomNumber(6);

	await sendOtp(
		insurerAdmin.firstName,
		insurerAdmin.lastName,
		insurerAdmin.username,
		insurerAdmin.email,
		otp
	);
	await InsurerAdmin.findOneAndUpdate(
		{ _id: insurerAdmin._id },
		{ $set: { otp: otp } }
	);

	// const constructedUser = {
	// 	insurerAdminId: insurerAdmin._id,
	// 	insurerId: insurerAdmin.insurer,
	// 	firstName: insurerAdmin.firstName,
	// 	lastName: insurerAdmin.lastName,
	// 	username: insurerAdmin.username,
	// 	email: insurerAdmin.email,
	// };

	// const accessToken = jwt.sign(constructedUser, process.env.JWT_SECRET, {
	// 	expiresIn: '24h',
	// });

	// return res.status(200).json({
	// 	accessToken: accessToken,
	// 	insurerAdmin: constructedUser,
	// });
	return res.status(200).json({
		msg: 'OTP sent successfully.',
	});
};

const verifyOtp = async (req, res) => {
	const { otp, username } = req.body;
	const insurerAdmin = await InsurerAdmin.findOne({ username });

	if (!insurerAdmin)
		return res
			.status(400)
			.send({ msg: 'No Insurer found with this username.' });

	if (insurerAdmin.otp !== otp)
		return res.status(400).send({ msg: 'Invalid OTP.' });

	const constructedUser = {
		insurerAdminId: insurerAdmin._id,
		insurerId: insurerAdmin.insurer,
		firstName: insurerAdmin.firstName,
		lastName: insurerAdmin.lastName,
		username: insurerAdmin.username,
		email: insurerAdmin.email,
	};

	const accessToken = jwt.sign(constructedUser, process.env.JWT_SECRET, {
		expiresIn: '24h',
	});

	return res.status(200).json({
		accessToken: accessToken,
		insurerAdmin: constructedUser,
	});
};

// @desc    Gets the current logged Insurer
// @route   GET /api/insurers/me
// @access  INSURER
const getCurrentInsurer = async (req, res) => {
	const [insurerAdmin] = await InsurerAdmin.aggregate([
		{ $match: { _id: new ObjectId(req.insurerAdmin.insurerAdminId) } },
		{
			$lookup: {
				from: 'insurers',
				localField: 'insurer',
				foreignField: '_id',
				as: 'insurer',
			},
		},
		{ $addFields: { insurer: { $arrayElemAt: ['$insurer', 0] } } },
		{ $unset: ['password'] },
		{ $limit: 1 },
	]).toArray();
	if (!insurerAdmin) return res.status(404).json({ msg: 'User not found.' });

	return res.status(200).json({
		insurerAdmin: formatIds(insurerAdmin, 'insurerAdmin'),
		user: req.insurerAdmin,
	});
};

// @desc    Get All Insurers
// @route   GET /api/insurers/insurers
// @access  INSURER
const getAllInsurers = async (req, res) => {
	const insurersAdmins = await InsurerAdmin.aggregate([
		{
			$lookup: {
				from: 'insurers',
				localField: 'insurer',
				foreignField: '_id',
				as: 'insurer',
			},
		},
		{
			$unwind: '$insurer',
		},
	])
		.sort({ name: 1 })
		.toArray();
	const insurers = await Insurer.find({}).sort({ name: 1 }).toArray();

	return res.status(200).json({ insurersAdmins, insurers });
};

const getInsurerById = async (req, res) => {
	const insurerId = req.params.insurerId;

	const foundInsurerAdmins = await InsurerAdmin.findOne(
		{ _id: new ObjectId(insurerId) },
		{ insurer: 1 } // This includes only the 'insurer' field along with '_id'
	);
	const foundInsurer = await Insurer.findOne({
		_id: foundInsurerAdmins.insurer,
	});
	return res.status(200).json({
		insurer: formatIds(foundInsurer, 'insurer'),
		insurerAdmins: formatIds(foundInsurerAdmins, 'insurerAdmin'),
	});
};

// @desc    Gets all brokers of a Insurer
// @route   GET /api/insurer/me
// @access  INSURER

const getAllBrokersForInsurer = async (req, res) => {
	const insurerId = req.insurerAdmin?.insurerId;
	const page = parseInt(req.params.page);
	const PAGE_SIZE = 20;
	const skip = 1 * PAGE_SIZE;
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
const InsurerGetAllAgencies = async (req, res) => {
	const brokerId = '677c12e19dc6660a56095a73';
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

// @desc    Updates the Insurer profile
// @route   POST /api/insurers/update-profile
// @access  INSURER
const updateProfile = async (req, res) => {
	const { firstName, lastName, email } = req.body;
	const foundInsurer = await InsurerAdmin.findOne({
		_id: new ObjectId(req.insurerAdmin.insurerAdminId),
	});
	if (!foundInsurer) return res.status(404).json({ msg: 'User not found.' });
	const foundInsurerWithSameEmail = await InsurerAdmin.findOne({
		email: email,
		_id: { $ne: foundInsurer._id },
	});
	if (foundInsurerWithSameEmail)
		return res.status(409).json({ msg: 'Email already exists.' });

	await InsurerAdmin.updateOne(
		{ _id: foundInsurer._id },
		{ $set: { firstName, lastName, email } }
	);
	return res.status(200).send({ msg: 'Profile updated.' });
};
// @desc    Generate Sales Statment
// @route   GET /api/insurers/sales-statement
// @access  INSURER
const salesStatement = async (req, res) => {
	const { startDate, endDate, timezone, agencyId, brokerId, adminReportTwo } =
		req.query;

	const partners = req.query.partners === 'true';

	const dateRange = {
		start: momentTz.tz(startDate, timezone).startOf('day').toDate(),
		end: momentTz.tz(endDate, timezone).endOf('day').toDate(),
	};
	var query;
	if (partners) {
		query = [
			{
				$match: {
					partner: { $exists: true },
					createdAt: {
						$gte: dateRange.start,
						$lte: dateRange.end,
					},
				},
			},
			{
				$lookup: {
					from: 'partners', // Assuming the collection name for agencies is 'agencies'
					localField: 'partner', // Field in policies collection that links to agencies
					foreignField: '_id', // Field in agencies collection (usually _id)
					as: 'partnerDetails',
				},
			},
			{
				$unwind: '$partnerDetails',
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
		];
	} else {
		query = [
			{
				$match: {
					...(agencyId ? { agency: new ObjectId(agencyId) } : {}), // Conditionally add agency filter
					createdAt: {
						$gte: dateRange.start,
						$lte: dateRange.end,
					},
				},
			},
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
			...(agencyId
				? []
				: [
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
						...(brokerId
							? [
									{
										$match: {
											'agencyDetails.broker': new ObjectId(brokerId),
										},
									},
							  ]
							: []),
				  ]),
			{
				$match: {
					'agencyDetails.broker': { $exists: true, $ne: null },
					$or: [
						{ 'agencyDetails.wholeseller': { $exists: false } },
						{ 'agencyDetails.wholeseller': null },
					],
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
		];
	}

	const foundPolicies = await Policy.aggregate(query).toArray();

	const policiesToWrite = foundPolicies.length == 0 ? [null] : foundPolicies;
	let dataToWrite;
	if (!adminReportTwo) {
		dataToWrite = policiesToWrite.map((policy) => {
			const passengers = policy?.passengers;
			const namesString = passengers
				?.map((pax) => `${pax.firstName} ${pax.lastName}`) // Extract and format the names
				.join(', '); // Join them with commas
			return {
				Channel: policy && 'B2B',
				'Agency Name': partners ? 'MMT' : policy && policy.agencyDetails.name,
				'Booked By': partners
					? 'Make My Trip'
					: policy &&
					  `${policy?.createdBy?.firstName} ${policy?.createdBy?.lastName}`,
				'Booking Date':
					policy && moment(policy?.createdAt).format('DD-MM-YYYY'),
				'Certificate No.': policy && policy?.number,
				'Plan Type': policy && `Travel Insurance ${policy?.productName}`,
				Passengers: `${namesString}`,
				'Number of Insureds': passengers?.length,
				Gender: policy && policy?.policyHolder?.gender,
				'Date of Birth':
					policy && moment(policy?.policyHolder?.dob).format('DD-MM-YYYY'),
				'Pax Type': partners
					? 'Standard'
					: policy && policy?.policyHolder?.type,
				Nationality: policy && policy?.policyHolder?.nationality,
				'Passport No': policy && policy?.policyHolder?.passportNumber,
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
					policy && roundToThreeDecimals(policy?.totalPremium?.AED, 3),
				'Base Premium':
					policy && roundToThreeDecimals(policy?.premiumExclVat?.AED, 3),
				'VAT Amount':
					policy &&
					roundToThreeDecimals(roundToThreeDecimals(policy?.vat?.AED, 3), 3),
				'Marketing fee': partners
					? roundToThreeDecimals(
							0.7 * roundToThreeDecimals(policy?.premiumExclVat?.AED),
							3
					  )
					: policy && roundToThreeDecimals(policy?.breakdown?.agency?.value, 3),
				'NET Premium': partners
					? roundToThreeDecimals(policy?.premiumExclVat?.AED, 3) -
					  roundToThreeDecimals(0.7 * policy?.premiumExclVat?.AED, 3)
					: policy && roundToThreeDecimals(policy?.netPremium?.AED, 3),
				// PSP: roundToThreeDecimals(policy?.breakdown?.psp?.value, 3),
				// Wholesaler: roundToThreeDecimals(
				// 	policy?.breakdown?.wholeseller?.value,
				// 	3
				// ),
				// CVN: partners
				// 	? 'N/A'
				// 	: roundToThreeDecimals(policy?.breakdown?.cvn?.value),
				Status: policy && policy?.status,
				'LPO/Remarks': policy && policy?.remarks ? policy.remarks : 'N/A',
			};
		});
	} else {
		dataToWrite = policiesToWrite.map((policy) => {
			const passengers = policy?.passengers;
			const namesString = passengers
				?.map((pax) => `${pax.firstName} ${pax.lastName}`) // Extract and format the names
				.join(', '); // Join them with commas
			return {
				Channel: policy && 'B2B',
				'Agency Name': partners ? 'MMT' : policy && policy.agencyDetails.name,
				'Booked By': partners
					? 'Make My Trip'
					: policy &&
					  `${policy?.createdBy?.firstName} ${policy?.createdBy?.lastName}`,
				'Booking Date':
					policy && moment(policy?.createdAt).format('DD-MM-YYYY'),
				'Certificate No.': policy && policy?.number,
				'Plan Type': policy && `Travel Insurance ${policy?.productName}`,
				Passengers: `${namesString}`,
				'Number of Insureds': passengers?.length,
				Gender: policy && policy?.policyHolder?.gender,
				'Date of Birth':
					policy && moment(policy?.policyHolder?.dob).format('DD-MM-YYYY'),
				'Pax Type': partners
					? 'Standard'
					: policy && policy?.policyHolder?.type,
				Nationality: policy && policy?.policyHolder?.nationality,
				'Passport No': policy && policy?.policyHolder?.passportNumber,
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
				'Agency Fee': policy && `${policy?.breakdown?.agency?.percentage}%`,
				'Marketing fee': partners
					? roundToThreeDecimals(0.7 * policy?.premiumExclVat?.AED)
					: policy && roundToThreeDecimals(policy?.breakdown?.agency?.value),
				// 'Wholesaler Fee':
				// 	policy && `${policy?.breakdown?.wholeseller?.percentage}%`,
				// Wholesaler: roundToThreeDecimals(
				// 	policy?.breakdown?.wholeseller?.value,
				// 	3
				// ),
				'Net Payable': partners
					? roundToThreeDecimals(policy?.premiumExclVat?.AED) -
					  0.7 * roundToThreeDecimals(policy?.premiumExclVat?.AED)
					: policy && roundToThreeDecimals(policy?.netPremium?.AED),
				Status: policy && policy?.status,
				'LPO/Remarks': policy && policy?.remarks ? policy.remarks : 'N/A',
				'SOA Month': 0,
				'Payment Status': 'N/A',
				'Payment Details': 'N/A',
			};
		});
	}
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

module.exports = {
	createInsurer,
	getAllInsurers,
	logInInsurerAdmin,
	getCurrentInsurer,
	getAllBrokersForInsurer,
	updateProfile,
	InsurerGetAllAgencies,
	salesStatement,
	getInsurerById,
	// createInsurerAdmin,
	updateInsurer,
	verifyOtp,
};
