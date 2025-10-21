const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const generateIhoCoi = require('../helpers/iho/generateIhoCoi.js');
const fs = require('fs');
const { compile } = require('handlebars');
const generateIhoInvoice = require('../helpers/iho/generateIhoInvice.js');
const generateIhoReceipt = require('../helpers/iho/generateIhoReceipt.js');
const {
	generateRandomString,
	formatIds,
	roundToTwoDecimals,
	getCountryName,
	capitalizeWord,
	ORT_HowtoClaim,
} = require('../utils.js');
const getAddOnPrice = require('../helpers/getAddOnPrice.js');
const { sendEmail } = require('../services/emailingService.js');
const { generateUsername } = require('../helpers/generateUsername.js');
const XLSX = require('xlsx');
const moment = require('moment');
const momentTz = require('moment-timezone');
const getIhoProducts = require('../helpers/getIhoProducts.js');
const { generatePolicyNumber } = require('../helpers/generatePolicyNumber.js');
const ihoPremiumBreakdown = require('../helpers/ihoPremiumBreakdown.js');
const IhoGetUpdatedBalance = require('../helpers/IhoGetUpdateBalance.js');
const Insurer = getCollection('insurers');
const Agency = getCollection('agencies');
const User = getCollection('users');
const Wholeseller = getCollection('wholesellers');
const Policy = getCollection('policies');
const Passenger = getCollection('passengers');
const Broker = getCollection('brokers');
const Quote = getCollection('quote');
const AddOn = getCollection('addOns');

// @desc    Creates a new agency for broker
// @route   POST /api/agencies-broker
// @access  BROKER
const createBrokerAgency = async (req, res) => {
	const {
		name,
		code,
		commissionPercentage,
		firstName,
		lastName,
		email,
		dob,
		balance,
		maxBalance,
		status,
	} = req.body;
	if (balance > maxBalance) {
		return res
			.status(404)
			.json({ msg: 'Balance should be less then maximum balance allowed' });
	}
	const foundbrokerId = req.brokerAdmin.brokerId;
	const foundBroker = await Broker.findOne({
		_id: new ObjectId(foundbrokerId),
	});
	if (commissionPercentage > foundBroker.commissionPercentage) {
		return res.status(404).json({
			msg: 'Agency commission must not be great then Broker commission.',
		});
	}
	if (maxBalance > foundBroker.maxBalance) {
		return res
			.status(404)
			.json({ msg: 'Max balance should be less then broker max balance' });
	}
	if (foundBroker.commissionPercentage < commissionPercentage) {
		return res.status(404).json({
			msg: 'Agency commission must not be great then Broker commission.',
		});
	}

	const foundInsurer = await Insurer.findOne({
		_id: new ObjectId(foundBroker.insurerId),
	});
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

	if (!foundBroker) return res.status(404).json({ msg: 'Broker  not found.' });

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
		{ _id: new ObjectId(foundbrokerId) },
		{
			$set: {
				balance: foundBroker.balance - balance,
				maxBalance: foundBroker.maxBalance - maxBalance,
			},
		}
	);

	const createdAgency = await Agency.insertOne({
		insurer: new ObjectId(foundBroker.insurerId),
		broker: new ObjectId(foundbrokerId),
		name: name,
		code: code,
		status: status,
		balance: 0,
		maxBalance: maxBalance,
		commissionPercentage,
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
	const { status, agencyId, user } = req.body;

	const brokerId = req.brokerAdmin.brokerId;
	let dob = new Date(user.dob);
	user.dob = dob;
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

	const updateAgencyData = {
		$set: {
			status: status,
		},
	};
	await Agency.updateOne({ _id: new ObjectId(agencyId) }, updateAgencyData);
	await User.updateOne({ _id: new ObjectId(foundUser._id) }, { $set: user });

	return res.status(201).json({
		msg: 'Agency Updated.',
	});
};

// @desc    Creates a new policy
// @route   POST /api/broker-agency/issue-policy
// @access  PRIVATE - SUPER, STANDARD
const createPolicy = async (req, res) => {
	const baseUrl = 'https://' + req.get('host');
	let agencyId;
	let userId;
	if (req.user) {
		agencyId = req.user.agency.agencyId;
		userId = req.user.userId;
	} else {
		agencyId = req.body.agencyId;
		userId = req.body.userId;
	}
	// const agencyId = req.user.agency.agencyId;
	// const userId = req.user.userId;
	let totalPremium, premiumExclVat, vat;
	const {
		returnTrip,
		from,
		to,
		departureDate,
		returnDate,
		priceFactorId,
		remarks,
		addOns,
		passengers,
		family,
		quoteId,
	} = req.body;
	const duration =
		returnTrip == true
			? moment(returnDate).diff(moment(departureDate), 'days') + 1
			: 1;
	let foundQuote;
	if (quoteId) {
		foundQuote = await Quote.findOne({ _id: new ObjectId(quoteId) });
	}
	if (foundQuote.policyId) {
		return res
			.status(400)
			.json({ msg: 'Policy already Create with this Quote' });
	}
	const numOfPax = { children: 0, adults: 0, seniors: 0, superSeniors: 0 };
	//calculate number of passengers
	passengers.map((passenger) => {
		if (passenger.type === 'CHILD') numOfPax.children++;
		else if (passenger.type === 'ADULT') numOfPax.adults++;
		else if (passenger.type === 'SENIOR') numOfPax.seniors++;
		else if (passenger.type === 'SUPER SENIOR') numOfPax.superSeniors++;
	});
	//get product
	const { products } = await getIhoProducts({
		agencyId,
		returnTrip,
		priceFactorId,
		duration,
		destinationCountry: to,
		numOfPax,
		family,
	});

	const foundProduct = products[0];
	if (!foundProduct)
		return res.status(400).json({
			msg: 'Price factor not found. Make sure all the entered details satisfy the provided price factor.',
		});
	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	//set price values
	totalPremium = foundProduct.price.AED;
	premiumExclVat = foundProduct.priceExclVat.AED;
	vat = foundProduct.vat.AED;

	//if addons are provided, add their price to premiums
	if (addOns && addOns.length > 0) {
		const foundAddOns = await AddOn.find({
			_id: { $in: addOns.map((addOn) => new ObjectId(addOn)) },
		}).toArray();
		//some add on is not valid
		if (foundAddOns.length != addOns.length)
			return res.status(400).json({ msg: 'Incorrect add on(s) provided.' });

		premiumExclVat += getAddOnPrice({
			premium: premiumExclVat,
			addOns: foundAddOns,
		});
		// premiumExclVat = totalPremium / 1.05;

		// vat += getAddOnPrice({ premium: vat, addOns: foundAddOns });
		vat = premiumExclVat * 0.05;

		totalPremium = premiumExclVat + vat;
	}
	const deductionResponse = await IhoGetUpdatedBalance({
		agencyId,
		totalPremium,
		premiumExclVat,
	});
	if (deductionResponse.error)
		return res.status(402).json({ msg: deductionResponse.error });

	let generatedPolicyNumber = await generatePolicyNumber({
		agencyId,
		productCode: foundProduct.product.code,
	});

	const breakdown = await ihoPremiumBreakdown({
		premium: premiumExclVat,
		agencyId,
		userId,
	});
	const insertedPolicy = await Policy.insertOne({
		agency: new ObjectId(agencyId),
		createdBy: new ObjectId(userId),

		number: generatedPolicyNumber,
		returnTrip: returnTrip,
		from,
		to,
		departureDate: moment(departureDate).toDate(),
		...(returnDate && { returnDate: moment(returnDate).toDate() }),
		priceFactor: new ObjectId(foundProduct._id),
		...(remarks && { remarks }),
		productName: foundProduct.product.name,
		totalPremium: {
			AED: totalPremium,
		},
		premiumExclVat: {
			AED: premiumExclVat,
		},
		vat: {
			AED: vat,
		},
		netPremium: {
			AED: breakdown.netPremium,
		},
		breakdown: {
			cvn: breakdown.cvn,
			broker: breakdown.broker,
			agency: breakdown.agency,
		},
		deduction: deductionResponse.deduction,
		...(addOns && { addOns: addOns?.map((addOnId) => new ObjectId(addOnId)) }),
		status: 'confirmed',
		amend: {
			departureDate: false,
			returnDate: false,
		},
		createdAt: new Date(),
		expiresAt: returnTrip
			? new Date(returnDate)
			: moment(departureDate).add(72, 'hours').toDate(),
	});
	try {
		await Passenger.insertMany(
			passengers.map((passenger) => {
				return {
					policy: insertedPolicy.insertedId,
					type: passenger.type,
					firstName: passenger.firstName,
					lastName: passenger.lastName,
					gender: passenger.gender,
					nationality: passenger.nationality,
					dob: moment(passenger.dob).toDate(),
					passportNumber: passenger.passportNumber,
					countryOfResidence: passenger.countryOfResidence,
					email: passenger.email,
					...(passenger.mobileNumber
						? { mobileNumber: passenger.mobileNumber }
						: {}),
					...(passenger.cityOfResidence && {
						cityOfResidence: passenger.cityOfResidence,
					}),
				};
			})
		);
	} catch (error) {
		console.log('Passenger Error', JSON.stringify(error));
	}

	//update balance values
	const BrokerValues = deductionResponse.updatedValues.broker;
	const agencyValues = deductionResponse.updatedValues.agency;
	await Broker.findOneAndUpdate(
		{
			_id: new ObjectId(foundAgency.broker),
		},
		{
			$set: {
				...(BrokerValues.balance != null && {
					balance: parseFloat(Number(BrokerValues.balance).toFixed(2)),
				}),
			},
		}
	);
	await Agency.findOneAndUpdate(
		{
			_id: new ObjectId(foundAgency._id),
		},
		{
			$set: {
				...(agencyValues.balance != null && {
					balance: parseFloat(Number(agencyValues.balance).toFixed(2)),
				}),
			},
		}
	);

	if (quoteId) {
		await Quote.findOneAndUpdate(
			{ _id: new ObjectId(quoteId) },
			{
				$set: {
					status: 'created',
					policyId: insertedPolicy.insertedId, // Ensure this is the correct type
					updatedAt: new Date(), // Also update timestamps
				},
			}
		);
	}

	//return created policy
	const [createdPolicy] = await Policy.aggregate([
		{
			$match: {
				_id: insertedPolicy.insertedId,
			},
		},
		{
			$lookup: {
				from: 'passengers',
				localField: '_id',
				foreignField: 'policy',
				as: 'passengers',
			},
		},
		{
			$limit: 1,
		},
	]).toArray();

	// create policy report
	await fetch(
		`${
			baseUrl === 'https://localhost:4000' ? 'http://localhost:4000' : baseUrl
		}/api/reports/create-report?policy=${insertedPolicy.insertedId}`,
		{
			method: 'POST',
		}
	);

	const coiLink = encodeURI(
		`${baseUrl}/api/agency-broker/coi/iho/${insertedPolicy.insertedId}`
	);
	const invoiceLink = encodeURI(
		`${baseUrl}/api/agency-broker/invoice/iho/${insertedPolicy.insertedId}`
	);
	const receiptLink = encodeURI(
		`${baseUrl}/api/agency-broker/receipt/iho/${insertedPolicy.insertedId}`
	);

	const termsAndConditionsLink = foundProduct.product.termsAndConditions;
	//send res to close req
	res.status(200).json({
		msg: 'Policy created.',
		policy: {
			...createdPolicy,
			coi: coiLink,
			invoice: invoiceLink,
			receipt: receiptLink,
			termsAndConditions: termsAndConditionsLink,
		},
	});

	//construct and send email
	const source = fs.readFileSync(
		`${process.cwd()}/templates/orient/OrientPolicyCreationEmail.html`,
		'utf8'
	);
	const template = compile(source);
	const replacements = {
		firstName: createdPolicy.passengers[0].firstName,
		lastName: createdPolicy.passengers[0].lastName,
		productName: createdPolicy.productName,
		policyNumber: createdPolicy.number,
		policyStartDate: moment(createdPolicy.departureDate).format('DD/MM/YYYY'),
		policyEndDate: moment(createdPolicy.expiresAt).format('DD/MM/YYYY'),
		ORT_HowtoClaim: ORT_HowtoClaim,
		coiLink,
		invoiceLink,
		receiptLink,
		termsAndConditionsLink,
	};
	const html = template(replacements);
	const { error } = await sendEmail({
		to: [...new Set(passengers.map((p) => p.email))],
		cc: ['contact@covernomads.com'],
		subject: `Your Travel Insurance Confirmation - No. ${createdPolicy.number}`,
		text: `You're covered!`,
		html,
	});
	if (error) console.error(error);
	return;
};

// @desc   Returns all agencies of logged in broker
// @route   GET /api/agency-broker/:page
// @access  BROKER
const getAllAgencies = async (req, res) => {
	const brokerId = req.brokerAdmin?.brokerId;
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

// API ROUTE    api/agency-broker/agency/:agencyId
// ACCESS BROKER
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

const setInitalBalance = async (req, res) => {
	const { code, balance, mba } = req.body;

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

const getPolicyIhoCoi = async (req, res) => {
	const baseUrl = 'https://' + req.get('host');
	const { policyId } = req.params;
	const [foundPolicy] = await Policy.aggregate([
		{
			$match: {
				_id: new ObjectId(policyId),
			},
		},
		{
			$lookup: {
				from: 'agencies',
				localField: 'agency',
				foreignField: '_id',
				as: 'agency',
			},
		},
		{ $addFields: { agency: { $arrayElemAt: ['$agency', 0] } } },
		{
			$lookup: {
				from: 'insurers',
				localField: 'agency.insurer',
				foreignField: '_id',
				as: 'insurer',
			},
		},
		{ $addFields: { insurer: { $arrayElemAt: ['$insurer', 0] } } },
		{
			$lookup: {
				from: 'passengers',
				localField: '_id',
				foreignField: 'policy',
				as: 'passengers',
			},
		},
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
				from: 'coverages',
				localField: 'priceFactor.coverage',
				foreignField: '_id',
				as: 'coverage',
			},
		},
		{ $addFields: { coverage: { $arrayElemAt: ['$coverage', 0] } } },
		{
			$lookup: {
				from: 'addOns',
				localField: 'addOns',
				foreignField: '_id',
				as: 'addOns',
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
			$limit: 1,
		},
	]).toArray();
	if (!foundPolicy) return res.status(404).json({ msg: 'Policy not found.' });

	const qrCodeBuffer = await QRCode.toDataURL(
		`${baseUrl}/api/policies/verify/${foundPolicy._id}`
	);

	const addOnsArray = foundPolicy.addOns;

	const pdfBuffer = await generateIhoCoi({
		insurerCode: foundPolicy?.insurer?.code,
		data: {
			policyQr: qrCodeBuffer,
			policyType: `Travel Insurance - ${foundPolicy.product.name}`,
			productCode: `${foundPolicy?.product?.code}`,
			addOns: addOnsArray,
			policyNumber: foundPolicy.number,
			status: foundPolicy.status,
			totalPremium: foundPolicy.totalPremium,
			agencyCode: foundPolicy?.agency?.code,
			issuedBy: `${foundPolicy.createdBy.firstName} ${foundPolicy.createdBy.lastName}`,
			issueDate: moment(foundPolicy.createdAt).format('DD/MM/YYYY'),
			returnTrip: foundPolicy.returnTrip,
			// duration: foundPolicy.priceFactor.duration.max,
			duration: foundPolicy.returnTrip
				? moment(foundPolicy.returnDate).diff(
						moment(foundPolicy.departureDate),
						'days'
				  ) + 1
				: 'NA',
			coverage: foundPolicy.coverage.name,
			destinationCountry: `${foundPolicy.to} - ${getCountryName(
				foundPolicy.to
			)}`,
			policyStartDate: moment(foundPolicy.departureDate).format('DD/MM/YYYY'),
			policyEndDate: moment(foundPolicy.returnDate).format('DD/MM/YYYY'),
			passengers: foundPolicy.passengers.map((passenger) => {
				return {
					...passenger,
					dob: moment(passenger.dob).format('DD/MM/YYYY'),
					gender: capitalizeWord(passenger.gender),
					nationality: `${passenger.nationality} - ${getCountryName(
						passenger.nationality
					)}`,
					countryOfResidence: `${
						passenger.countryOfResidence
					} - ${getCountryName(passenger.countryOfResidence)}`,
				};
			}),
			benefits: foundPolicy.product.benefits,
		},
	});
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', 'attachment; filename=certificate.pdf');
	return res.send(Buffer.from(pdfBuffer));
};

// @desc    Return tax invoice pdf file
// @route   GET /api/policies/invoice/:policyId
// @access  PUBLIC
const getPolicyIhoInvoice = async (req, res) => {
	const { policyId } = req.params;

	const [foundPolicy] = await Policy.aggregate([
		{
			$match: {
				_id: new ObjectId(policyId),
			},
		},
		{
			$lookup: {
				from: 'agencies',
				localField: 'agency',
				foreignField: '_id',
				as: 'agency',
			},
		},
		{ $addFields: { agency: { $arrayElemAt: ['$agency', 0] } } },
		{
			$lookup: {
				from: 'insurers',
				localField: 'agency.insurer',
				foreignField: '_id',
				as: 'insurer',
			},
		},
		{ $addFields: { insurer: { $arrayElemAt: ['$insurer', 0] } } },
		{
			$lookup: {
				from: 'passengers',
				localField: '_id',
				foreignField: 'policy',
				as: 'passengers',
			},
		},
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
			$limit: 1,
		},
	]).toArray();
	if (!foundPolicy) return res.status(404).json({ msg: 'Policy not found.' });

	const pdfBuffer = await generateIhoInvoice({
		insurerCode: foundPolicy.insurer.code,
		data: {
			policyNumber: foundPolicy.number,
			issueDate: moment(foundPolicy.createdAt).format('DD/MM/YYYY'),
			expiryDate: moment(foundPolicy.expiresAt).format('DD/MM/YYYY'),
			policyHolder: {
				...foundPolicy.passengers[0],
				dob: moment(foundPolicy.passengers[0]?.dob).format('DD/MM/YYYY'),
			},
			productName: foundPolicy.product.name,
			unitPremium: roundToTwoDecimals(
				foundPolicy.totalPremium.AED - foundPolicy.vat.AED
			),
			totalPremium: roundToTwoDecimals(foundPolicy.totalPremium.AED),
			totalVat: roundToTwoDecimals(foundPolicy.vat.AED),
			taxRate: '5%',
		},
	});
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
	return res.send(Buffer.from(pdfBuffer));
};

// @desc    Return receipt pdf file
// @route   GET /api/policies/receipt/:policyId
// @access  PUBLIC
const getPolicyIhoReceipt = async (req, res) => {
	const { policyId } = req.params;

	const [foundPolicy] = await Policy.aggregate([
		{
			$match: {
				_id: new ObjectId(policyId),
			},
		},
		{
			$lookup: {
				from: 'agencies',
				localField: 'agency',
				foreignField: '_id',
				as: 'agency',
			},
		},
		{ $addFields: { agency: { $arrayElemAt: ['$agency', 0] } } },
		{
			$lookup: {
				from: 'insurers',
				localField: 'agency.insurer',
				foreignField: '_id',
				as: 'insurer',
			},
		},
		{ $addFields: { insurer: { $arrayElemAt: ['$insurer', 0] } } },
		{
			$lookup: {
				from: 'passengers',
				localField: '_id',
				foreignField: 'policy',
				as: 'passengers',
			},
		},
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
				from: 'coverages',
				localField: 'priceFactor.coverage',
				foreignField: '_id',
				as: 'coverage',
			},
		},
		{ $addFields: { coverage: { $arrayElemAt: ['$coverage', 0] } } },
		{
			$limit: 1,
		},
	]).toArray();
	if (!foundPolicy) return res.status(404).json({ msg: 'Policy not found.' });

	const pdfBuffer = await generateIhoReceipt({
		insurerCode: foundPolicy.insurer.code,
		data: {
			policyNumber: foundPolicy.number,
			policyHolder: {
				...foundPolicy.passengers[0],
				dob: moment(foundPolicy.passengers[0]?.dob).format('DD/MM/YYYY'),
			},
			issueDate: moment(foundPolicy.createdAt).format('DD/MM/YYYY'),
			totalPremium: roundToTwoDecimals(foundPolicy.totalPremium.AED),
		},
	});
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', 'attachment; filename=receipt.pdf');
	return res.send(Buffer.from(pdfBuffer));
};

module.exports = {
	// getAgencySalesStatement,
	getAllAgencies,
	createPolicy,
	getSingleAgency,
	updateAgency,
	setInitalBalance,
	createBrokerAgency,
	getPolicyIhoCoi,
	getPolicyIhoInvoice,
	getPolicyIhoReceipt,
};
