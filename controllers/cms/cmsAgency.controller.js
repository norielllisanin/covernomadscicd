const { ObjectId } = require('mongodb');
const { getCollection } = require('../../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
	generateRandomString,
	formatIds,
	roundToThreeDecimals,
} = require('../../utils.js');
const { generateUsername } = require('../../helpers/generateUsername.js');
const XLSX = require('xlsx');
const moment = require('moment');
const momentTz = require('moment-timezone');

const CmsAgency = getCollection('cmsAgency');
const User = getCollection('users');
const Report = getCollection('report');

const createCmsAgency = async (req, res) => {
	const {
		role,
		type,
		name,
		firstName,
		lastName,
		email,
		dob,
		code,
		commissionPercentage,
		isCreditApplicable,
		credit,
		balance,
		maxBalance,
		permission,
		isActive,
		city,
		state,
	} = req.body;

	try {
		if (role === 'indirect' && commissionPercentage > 70) {
			return res
				.status(400)
				.json({ msg: 'Commission percentage should be less than 70%' });
		}
		// Validate balance and maxBalance
		if (role === 'indirect' && Number(balance) > Number(maxBalance)) {
			return res.status(400).json({
				msg: 'Balance should be less than the maximum balance allowed',
			});
		}

		// Check if agency code already exists
		const agencyExists = await CmsAgency.findOne({ code });
		if (agencyExists) {
			return res.status(409).json({
				msg: 'Agency with provided code already exists. Please select another code.',
			});
		}

		// Insert agency
		const createdAgency = await CmsAgency.insertOne({
			type,
			name,
			code: code.toUpperCase(),
			status: isActive || true,
			...(role === 'indirect' && {
				commissionPercentage: Number(commissionPercentage),
			}),
			isCreditApplicable: isCreditApplicable || false,
			credit,
			role: role,
			...(role === 'indirect' && { balance: Number(balance) }),
			...(role === 'indirect' && { maxBalance: Number(maxBalance) }),
			city,
			state,
			insurer: new ObjectId('67c05823c70d834e1335dadc'),
			createdAt: new Date(),
		});

		// Create user for the agency
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
			email,
			password: hashedPassword,
			dob: new Date(dob),
			permission: permission || 'SUPER',
			isActive: isActive || true,
			createdAt: new Date(),
		});

		const foundUser = await User.findOne({ _id: createdUser.insertedId });
		const foundAgency = await CmsAgency.findOne({
			_id: createdAgency.insertedId,
		});

		return res.status(201).json({
			msg: 'User created successfully. Please make sure to copy user credentials as you will NOT be able to access these again!',
			agency: formatIds(foundAgency, 'agency'),
			user: formatIds({ ...foundUser, password: generatedPassword }, 'user'),
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			error: error,
			msg: `Internal Server Error : ${error}`,
		});
	}
};

const logInCmsAgencyUser = async (req, res) => {
	const { username, password, roles } = req.body;

	try {
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
		const userAgency = await CmsAgency.findOne({
			_id: new ObjectId(user.agency),
		});
		if (!userAgency) return res.status(400).send({ msg: 'Agency not found.' });

		//agency status check either active or in-active
		if (!userAgency.status)
			return res.status(400).send({
				msg: 'Your agency is currently inactive. Please contact your admin.',
			});

		//incorrect password
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) return res.status(400).send({ msg: 'Incorrect password.' });

		//all good
		const foundAgency = await CmsAgency.findOne({
			_id: new ObjectId(user?.agency),
		});

		if (foundAgency.type !== roles) {
			return res.status(400).send({ msg: 'Incorrect Role.' });
		}

		const constructedUser = {
			userId: user._id,
			firstName: user.firstName,
			lastName: user.lastName,
			username: user.username,
			email: user.email,
			dob: user.dob,
			permission: user.permission,
			type: foundAgency.type,
			role: foundAgency.role,
			agency: {
				...foundAgency,
				agencyId: foundAgency._id,
			},
		};

		const accessToken = jwt.sign(constructedUser, process.env.JWT_SECRET, {
			expiresIn: '24h',
		});

		return res.status(200).json({
			accessToken: accessToken,
			user: constructedUser,
		});
	} catch (error) {
		return res
			.status(500)
			.json({ error: error.message, msg: 'Internal Sever Error' });
	}
};

const updateCmsAgency = async (req, res) => {
	const {
		status,
		agencyId,
		user,
		maxBalance,
		name,
		commissionPercentage,
		role,
	} = req.body;

	try {
		// Convert DOB to Date object if present
		if (user?.dob) {
			user.dob = new Date(user.dob);
		}
		if (role === 'indirect' && commissionPercentage > 60) {
			return res
				.status(400)
				.json({ msg: 'Commission percentage should be less than 60%' });
		}
		// Validate Agency
		const foundAgency = await CmsAgency.findOne({
			_id: new ObjectId(agencyId),
		});
		if (!foundAgency) {
			return res.status(404).json({ msg: 'Agency not found with provided ID' });
		}

		// Validate Super User
		const foundUser = await User.findOne({
			agency: new ObjectId(agencyId),
		});
		if (!foundUser) {
			return res.status(404).json({ msg: 'Super user not found for agency' });
		}

		// Update Agency status and maxBalance
		await CmsAgency.updateOne(
			{ _id: new ObjectId(agencyId) },
			{
				$set: {
					status: status,
					...(role === 'indirect' && { maxBalance: maxBalance }),
					name: name,
					...(role === 'indirect' && {
						commissionPercentage: Number(commissionPercentage),
					}),
				},
			}
		);

		// Update Super User details
		await User.updateOne({ _id: new ObjectId(foundUser._id) }, { $set: user });
		// update all user status
		await User.updateMany(
			{ agency: new ObjectId(agencyId) },
			{ $set: { isActive: status } }
		);

		return res.status(200).json({ msg: 'Agency updated successfully.' });
	} catch (error) {
		return res.status(500).json({ msg: 'Internal Server Error', error: error });
	}
};

// @desc   Returns all agencies of logged in wholeseller or CVN admin
// @route   GET /api/agencies/:page
// @access  WHOLESELLER, ADMIN
const getAllCmsAgenciesWithType = async (req, res) => {
	if (req.cmsAdmin || req.cvnAdmin) {
		const { agencyType } = req.query;
		const foundCmsAgencies = await CmsAgency.aggregate([
			{
				$match: {
					type: String(agencyType),
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: '_id',
					foreignField: 'agency',
					as: 'user',
				},
			},
			{ $addFields: { user: { $arrayElemAt: ['$user', 0] } } },
			{
				$sort: { name: 1 },
			},
		]).toArray();
		return res
			.status(200)
			.json({ cmsAgencies: formatIds(foundCmsAgencies, 'agency') });
	}
	const cmsId = req.cmsAdmin?.cmsId;
	const page = parseInt(req.params.page);
	const PAGE_SIZE = 20;
	const skip = page * PAGE_SIZE;
	//generate query pipeline
	const queryPipeline = [
		{
			$match: {
				cms: new ObjectId(cmsId),
			},
		},
	];

	//count total number of docs that fit query
	const cmsAgencyCount = await CmsAgency.aggregate([
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
				totalCmsAgencies: '$count',
			},
		},
	]).toArray();
	//calculate pagination vars
	const totalCmsAgencies = cmsAgencyCount.pop()?.totalCmsAgencies || 0;
	const totalPages = Math.ceil(totalCmsAgencies / PAGE_SIZE);
	const nextPage = page + 1 >= totalPages ? null : page + 1;
	const prevPage = page - 1 < 0 ? null : page - 1;
	//retrieve paginated documents
	const foundCmsAgencies = await CmsAgency.aggregate([
		...queryPipeline,
		{ $sort: { name: 1 } },
		// { $skip: skip },
		// { $limit: PAGE_SIZE },
	]).toArray();

	return res.status(200).json({
		cmsAgencies: formatIds(foundCmsAgencies, 'agency'),
		pagination: {
			totalRecords: totalCmsAgencies,
			totalPages,
			currentPage: page,
			nextPage,
			prevPage,
		},
	});
};

const getAllAgencyUsers = async (req, res) => {
	const { agencyId } = req.query;
	if (!agencyId) {
		return res.status(400).json({ msg: 'Agency ID is required.' });
	}
	try {
		const foundUsers = await User.find({
			agency: new ObjectId(agencyId),
		}).toArray();
		if (!foundUsers) return res.status(404).json({ msg: 'No users found.' });
		return res.status(200).json({ users: formatIds(foundUsers, 'user') });
	} catch (error) {
		return res
			.status(500)
			.json({ error: error.message, msg: 'Internal Server Error' });
	}
};

const getSingleAgencyCms = async (req, res) => {
	const { agencyId, permission } = req.query;

	try {
		const foundAgency = await CmsAgency.findOne({
			_id: new ObjectId(agencyId),
		});
		const foundSuperUser = await User.findOne({
			agency: new ObjectId(agencyId),
		});
		if (!foundSuperUser) {
			return res.status(404).json({ msg: 'No super user found for agency' });
		}
		foundAgency.superUser = foundSuperUser;
		if (!foundAgency)
			return res.status(404).json({ msg: 'Agency not found with this id.' });
		return res.status(200).json({ agency: formatIds(foundAgency, 'agency') });
	} catch (error) {
		return res.status(200).json({ error, msg: 'Internal Server Error' });
	}
};

const setInitalBalance = async (req, res) => {
	const { code, balance, mba } = req.body;
	// return res.status(200).json({ agency: 'Done' });

	const agency = await CmsAgency.updateOne(
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

const getAllCmsAgencies = async (req, res) => {
	if (req?.cmsAdmin || req?.cvnAdmin || req?.user) {
		const foundCmsAgencies = await CmsAgency.aggregate([
			{
				$lookup: {
					from: 'users',
					localField: '_id',
					foreignField: 'agency',
					as: 'user',
				},
			},
			{ $addFields: { user: { $arrayElemAt: ['$user', 0] } } },
			{
				$sort: { name: 1 },
			},
		]).toArray();
		return res
			.status(200)
			.json({ cmsAgencies: formatIds(foundCmsAgencies, 'agency') });
	}
	const cmsId = req?.cmsAdmin?.cmsId || req?.user?.agency?.cmsId;
	const page = parseInt(req.params.page);
	const PAGE_SIZE = 20;
	const skip = page * PAGE_SIZE;
	//generate query pipeline
	const queryPipeline = [
		{
			$match: {
				cms: new ObjectId(cmsId),
			},
		},
	];

	//count total number of docs that fit query
	const cmsAgencyCount = await CmsAgency.aggregate([
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
				totalCmsAgencies: '$count',
			},
		},
	]).toArray();
	//calculate pagination vars
	const totalCmsAgencies = cmsAgencyCount.pop()?.totalCmsAgencies || 0;
	const totalPages = Math.ceil(totalCmsAgencies / PAGE_SIZE);
	const nextPage = page + 1 >= totalPages ? null : page + 1;
	const prevPage = page - 1 < 0 ? null : page - 1;
	//retrieve paginated documents
	const foundCmsAgencies = await CmsAgency.aggregate([
		...queryPipeline,
		{ $sort: { name: 1 } },
		// { $skip: skip },
		// { $limit: PAGE_SIZE },
	]).toArray();

	return res.status(200).json({
		cmsAgencies: formatIds(foundCmsAgencies, 'agency'),
		pagination: {
			totalRecords: totalCmsAgencies,
			totalPages,
			currentPage: page,
			nextPage,
			prevPage,
		},
	});
};

module.exports = {
	createCmsAgency,
	logInCmsAgencyUser,
	getAllCmsAgenciesWithType,
	getSingleAgencyCms,
	getAllAgencyUsers,
	getAllCmsAgencies,
	updateCmsAgency,
	setInitalBalance,
};
