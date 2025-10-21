const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
	generateRandomString,
	formatIds,
	generateRandomNumber,
	roundToThreeDecimals,
} = require('../utils.js');
const { getCollection } = require('../db');
const { sendEmail } = require('../services/emailingService.js');
const fs = require('fs');
const { compile } = require('handlebars');
const XLSX = require('xlsx');
const moment = require('moment');
const momentTz = require('moment-timezone');
const { ObjectId } = require('mongodb');

const Wholeseller = getCollection('wholesellers');
const WholesellerAdmin = getCollection('wholesellerAdmins');
const Agency = getCollection('agencies');
const Policy = getCollection('policies');
const CreditHistory = getCollection('creditHistories');
const User = getCollection('users');

// @desc    Creates a new wholeseller
// @route   POST /api/wholesellers
// @access  CVNADMIN
const createWholeseller = async (req, res) => {
	const {
		name,
		code,
		fixedCommission,
		wholesellerAdmin,
		balance,
		maxBalance,
		email,
	} = req.body;
	const wholesellerExists = await Wholeseller.findOne({ code });
	const wholesellerAdminExists = await WholesellerAdmin.findOne({
		email: req.body.wholesellerAdmin.email,
	});
	if (wholesellerAdminExists) {
		return res
			.status(409)
			.json({ msg: `Email alreay used for wholeseller admin` });
	}
	if (wholesellerExists)
		return res
			.status(409)
			.json({ msg: `Wholeseller with code ${code} already exists.` });

	const generatedPassword = generateRandomString(10);
	const hashedPassword = await bcrypt.hash(generatedPassword, 6);
	const numOfWholesellerAdmins = await WholesellerAdmin.countDocuments({});
	const wholesellerCreationRes = await Wholeseller.insertOne({
		name: name,
		code: code,
		...(fixedCommission && { fixedCommission }),
		maxBalance: maxBalance,
		balance: balance,
		createdAt: new Date(),
		payment: false,
	});
	const wholesellerAdminCreationRes = await WholesellerAdmin.insertOne({
		wholeseller: wholesellerCreationRes.insertedId,
		firstName: wholesellerAdmin.firstName,
		lastName: wholesellerAdmin.lastName,
		email: wholesellerAdmin.email,
		password: hashedPassword,
		username: `w_${wholesellerAdmin.firstName.toLowerCase()}_${numOfWholesellerAdmins}`,
		isActive: true,
		payment: false,
		createdAt: new Date(),
	});

	//retrive created data
	const createdWholeseller = await Wholeseller.findOne({
		_id: wholesellerCreationRes.insertedId,
	});
	const createdWholesellerAdmin = await WholesellerAdmin.findOne({
		_id: wholesellerAdminCreationRes.insertedId,
	});

	return res.status(201).json({
		msg: 'Wholeseller created.',
		wholeseller: formatIds(createdWholeseller, 'wholeseller'),
		wholesellerAdmin: formatIds(
			{ ...createdWholesellerAdmin, password: generatedPassword },
			'wholesellerAdmin'
		),
	});
};

// @desc    Logs in a wholeseller admin
// @route   POST /api/wholesellers/log-in
// @access  PUBLIC
const logInWholesellerAdmin = async (req, res) => {
	const { username, password } = req.body;

	const wholesellerAdmin = await WholesellerAdmin.findOne({ username });

	//no wholesellerAdmin found
	if (!wholesellerAdmin)
		return res.status(400).send({ msg: 'No admin found with this username.' });
	//wholesellerAdmin in active
	if (!wholesellerAdmin.isActive)
		return res.status(400).send({
			msg: 'Your account has been de-activated. Please contact your admin.',
		});

	//incorrect password
	const isMatch = await bcrypt.compare(password, wholesellerAdmin.password);
	if (!isMatch) return res.status(400).send({ msg: 'Incorrect password.' });

	//all good;
	const constructedUser = {
		wholesellerAdminId: wholesellerAdmin._id,
		wholesellerId: wholesellerAdmin.wholeseller,
		firstName: wholesellerAdmin.firstName,
		lastName: wholesellerAdmin.lastName,
		username: wholesellerAdmin.username,
		email: wholesellerAdmin.email,
	};

	const accessToken = jwt.sign(constructedUser, process.env.JWT_SECRET, {
		expiresIn: '24h',
	});

	return res.status(200).json({
		accessToken: accessToken,
		user: req.user,
		wholesellerAdmin: constructedUser,
	});
};

const addMaxBalanceKey = async () => {
	const wholesellers = Wholeseller.find({
		maxBalance: { $exists: false },
	});
	const agencies = Agency.find({ maxBalance: { $exists: false } });

	await Wholeseller.updateMany(
		{ _id: { $in: wholesellers.map((w) => w._id) } },
		{ $set: { maxBalance: 0 } }
	);

	await Agency.updateMany(
		{ _id: { $in: agencies.map((a) => a._id) } },
		{ $set: { maxBalance: 0 } }
	);
};
// @desc    Gets the current logged wholeseller
// @route   GET /api/wholesellers/me
// @access  WHOLESELLER
const getCurrentWholeseller = async (req, res) => {
	const [wholesellerAdmin] = await WholesellerAdmin.aggregate([
		{ $match: { _id: new ObjectId(req.wholesellerAdmin.wholesellerAdminId) } },
		{
			$lookup: {
				from: 'wholesellers',
				localField: 'wholeseller',
				foreignField: '_id',
				as: 'wholeseller',
			},
		},
		{ $addFields: { wholeseller: { $arrayElemAt: ['$wholeseller', 0] } } },
		{ $unset: ['password'] },
		{ $limit: 1 },
	]).toArray();
	if (!wholesellerAdmin)
		return res.status(404).json({ msg: 'User not found.' });

	return res.status(200).json({
		wholesellerAdmin: formatIds(wholesellerAdmin, 'wholesellerAdmin'),
		user: req.wholesellerAdmin,
	});
};
const getEmailWholeSeller = async (req, res) => {
	const { email } = req.query;
	const wholesellerAdmin = await WholesellerAdmin.findOne({ email: email });

	return res.status(200).json({ wholesellerAdmin });
};

const updateWholeSellerPassword = async (req, res) => {
	const { wholesellerAdminId, newPassword, confirmPassword } = req.body;
	const user = await WholesellerAdmin.findOne({
		_id: new ObjectId(wholesellerAdminId),
	});
	if (!user) {
		return res.status(404).send('User not found');
	}
	try {
		if (newPassword === confirmPassword) {
			const hashedNewPassword = await bcrypt.hash(newPassword, 6);

			await WholesellerAdmin.updateOne(
				{ _id: new ObjectId(wholesellerAdminId) },
				{ $set: { password: hashedNewPassword } }
			);

			res.status(200).send({ msg: 'Password updated successfully' });
		} else res.status(400).send({ msg: 'Passwords do not match' });
	} catch (error) {
		console.error(error);
		res.status(500).send('Internal Server Error');
	}
};
const updateForgottenPassword = async (req, res) => {
	const { email, newPassword, confirmPassword } = req.body;
	const user = await WholesellerAdmin.findOne({
		email: email,
	});
	if (!user) {
		return res.status(404).send('User not found');
	}
	try {
		if (newPassword === confirmPassword) {
			const hashedNewPassword = await bcrypt.hash(newPassword, 6);

			await WholesellerAdmin.updateOne(
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
const resetPassword = async (req, res) => {
	const { email } = req.body;
	const wholesellerAdmin = await WholesellerAdmin.findOne({ email: email });

	if (!wholesellerAdmin) {
		return res
			.status(400)
			.send({ msg: 'No whole seller found with this email.', found: false });
	}
	const source = fs.readFileSync(
		`${process.cwd()}/templates/orient/OrientOTPVerification.html`,
		'utf8'
	);

	const template = compile(source);
	let otp = generateRandomNumber(6);
	const replacements = {
		firstName: wholesellerAdmin.firstName,
		lastName: wholesellerAdmin.lastName,
		otp: otp,
		username: wholesellerAdmin.username,
	};

	const html = template(replacements);

	await WholesellerAdmin.updateOne(
		{ _id: wholesellerAdmin?._id },
		{ $set: { otp } }
	);
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

const getAllAgencies = async (req, res) => {
	const { wholesellerID } = req.query;
	let wholesellerId;
	if (req.wholesellerAdmin) {
		wholesellerId = req.wholesellerAdmin.wholesellerId;
	}
	wholesellerId = wholesellerID;
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
		// { $sort: { name: 1 } },
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

const getUserByAgencyId = async (req, res) => {
	const { agencyId } = req.query;
	const foundUsers = await User.find({
		agency: new ObjectId(agencyId),
	}).toArray();
	if (!foundUsers) return res.status(404).json({ msg: 'User not found.' });
	return res.status(200).json({ users: formatIds(foundUsers, 'user') });
};

// @desc    Gets all agencies of a wholeseller
// @route   GET /api/wholesellers/me
// @access  WHOLESELLER

const getAllAgenciesforAdmin = async (req, res) => {
	const userType = req.user
		? 'USER'
		: req.wholesellerAdmin
		? 'WHOLESELLER'
		: 'ADMIN';
	var wholesellerId;
	if (userType === 'WHOLESELLER') {
		wholesellerId = req.wholesellerAdmin.wholesellerId;
	} else if (userType === 'ADMIN') {
		wholesellerId = req.query.wholesellerId;
	}

	const page = parseInt(req.params.page);
	const PAGE_SIZE = 20;
	const skip = 1 * PAGE_SIZE;
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

const getSingleWholeSeller = async (req, res) => {
	const { wholesellerAdminId } = req.query;
	const foundWholesellerAdmin = await WholesellerAdmin.findOne({
		_id: new ObjectId(wholesellerAdminId),
	});
	const foundWholeseller = await Wholeseller.findOne({
		_id: foundWholesellerAdmin.wholeseller,
	});

	if (!foundWholesellerAdmin || !foundWholeseller) {
		return res
			.status(404)
			.json({ msg: 'Wholeseller or wholeseller admin not found.' });
	}
	return res.status(200).json({
		wholeseller: formatIds(foundWholeseller, 'wholeseller'),
		wholesellerAdmin: formatIds(foundWholesellerAdmin, 'wholesellerAdmin'),
	});
};
const updateProfile = async (req, res) => {
	const {
		email,
		firstName,
		lastName,
		name,
		wholesellerId,
		wholesellerAdminId,
		isActive,
		maxBalance,
	} = req.body;
	const foundWholeseller = await Wholeseller.findOne({
		_id: new ObjectId(wholesellerId),
	});
	const foundWholesellerAdmin = await WholesellerAdmin.findOne({
		_id: new ObjectId(wholesellerAdminId),
	});
	if (!foundWholeseller || !foundWholesellerAdmin)
		return res
			.status(404)
			.json({ msg: 'Wholeseller or wholeseller admin not found.' });
	const foundWholesellerAdminByEmail = await WholesellerAdmin.findOne({
		email,
		wholeseller: { $ne: foundWholeseller._id },
	});
	const newBalance = Number(maxBalance);
	if (foundWholesellerAdminByEmail)
		return res
			.status(409)
			.json({ msg: 'Email already used by another wholesaler.' });
	await Wholeseller.updateOne(
		{ _id: foundWholeseller._id },
		{ $set: { name, maxBalance: newBalance } }
	);
	const updateData = { email, firstName, lastName };
	if (isActive !== undefined) {
		updateData.isActive = isActive;
	}
	await WholesellerAdmin.updateOne(
		{ _id: foundWholesellerAdmin._id },
		{ $set: updateData }
	);

	// updateAllRelatedAgenciesStatus
	await Agency.updateMany(
		{ wholeseller: foundWholeseller._id },
		{ $set: { status: isActive } }
	);

	// Find all agencies under this wholeseller
	const foundAgencies = await Agency.find({
		wholeseller: new ObjectId(wholesellerId),
	}).toArray();

	// Get array of agency IDs
	const agencyIds = foundAgencies.map((agency) => agency._id);

	// Update all users under these agencies
	await User.updateMany(
		{ agency: { $in: agencyIds } },
		{ $set: { isActive: isActive } }
	);

	return res.status(200).json({ msg: 'Profile updated successfully.' });
};
const getWholesellerByEmail = async (req, res) => {
	const { email } = req.query;

	const foundWholeseller = await WholesellerAdmin.findOne({ email });
	if (!foundWholeseller)
		return res.status(404).json({ msg: 'Wholeseller not found.' });
	return res
		.status(200)
		.json({ wholeseller: formatIds(foundWholeseller, 'wholeseller') });
};
const getWholeSellersSalesStatement = async (req, res) => {
	const { startDate, endDate, timezone } = req.query;
	let wholesellerId;
	let agencyId;
	if (req.user) {
		agencyId = req.user.agency.agencyId;
	} else {
		agencyId = req.query.agencyId;
		wholesellerId = req.wholesellerAdmin.wholesellerId;
	}
	const dateRange = {
		start: momentTz.tz(startDate, timezone).startOf('day').toDate(),
		end: momentTz.tz(endDate, timezone).endOf('day').toDate(),
	};

	const foundPolicies = await Policy.aggregate([
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
					{
						$match: {
							'agencyDetails.wholeseller': new ObjectId(wholesellerId), // Match agencies belonging to the specific wholeseller
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
			'Agency Name': policy && policy.agencyDetails.name,
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
			'Gross Premium':
				policy && roundToThreeDecimals(policy?.totalPremium?.AED),
			'Base Premium':
				policy && roundToThreeDecimals(policy?.premiumExclVat?.AED),
			'VAT Amount': policy && roundToThreeDecimals(policy?.vat?.AED),
			'Marketing fee':
				policy && roundToThreeDecimals(policy?.breakdown?.agency?.value),
			'NET Payable':
				policy &&
				roundToThreeDecimals(
					policy?.totalPremium?.AED -
						policy?.breakdown?.agency?.value -
						policy?.breakdown?.wholeseller?.value
				),
			Wholesaler: roundToThreeDecimals(policy?.breakdown?.wholeseller?.value),
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

const getUserAgents = async (req, res) => {
	const { wholesellerId } = req.query;
	const foundAgencies = await Agency.find({
		wholeseller: new ObjectId(wholesellerId),
	}).toArray();

	const foundUsers = await User.find({
		agency: { $in: foundAgencies.map((agency) => agency._id) },
	}).toArray();

	res.status(200).json({ users: formatIds(foundUsers, 'user') });
};

// @desc    Gets all agencies of a wholeseller, sorted with name
// @route   GET /api/wholesellers/get-agencies
// @access  ADMIN
const getAgencies = async (req, res) => {
	const { wholesellerId } = req.query;

	const foundAgencies = await Agency.find({
		wholeseller: new ObjectId(wholesellerId),
	})
		.sort({ name: 1 })
		.toArray();

	if (!foundAgencies.length)
		return res
			.status(404)
			.json({ msg: 'No agency found for this whole seller.' });

	res.status(200).json({ agencies: formatIds(foundAgencies, 'agency') });
};

const getSinleWholeSeller = async (req, res) => {
	const { wholesellerId } = req.query;
	const foundWholeseller = await Wholeseller.findOne({
		_id: new ObjectId(wholesellerId),
	});
	if (!foundWholeseller)
		return res.status(404).json({ msg: 'Whole Seller not found.' });
	return res
		.status(200)
		.json({ wholeseller: formatIds(foundWholeseller, 'wholeseller') });
};

module.exports = {
	createWholeseller,
	logInWholesellerAdmin,
	getCurrentWholeseller,
	updateWholeSellerPassword,
	resetPassword,
	getWholeSellersSalesStatement,
	getAllAgencies,
	getEmailWholeSeller,
	updateForgottenPassword,
	getSinleWholeSeller,
	getAllAgenciesforAdmin,
	getWholesellerByEmail,
	getUserByAgencyId,
	updateProfile,
	getUserAgents,
	getAgencies,
	getSingleWholeSeller,
	addMaxBalanceKey,
};
