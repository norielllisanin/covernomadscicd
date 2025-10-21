const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const moment = require('moment');
const momentTz = require('moment-timezone');
const {
	formatIds,
	getDateRange,
	capitalizeWord,
	getCountryName,
	roundToTwoDecimals,
	ORT_HowtoClaim,
	IHO_HowtoClaim,
	// roundToThreeDecimals,
} = require('../utils.js');
const getProducts = require('../helpers/getProducts.js');
const getIhoProducts = require('../helpers/getIhoProducts.js');
const {
	generatePolicyNumber,
	generateBrokerPolicyNumber,
} = require('../helpers/generatePolicyNumber.js');
const premiumBreakdown = require('../helpers/premiumBreakdown.js');
const getAddOnPrice = require('../helpers/getAddOnPrice.js');
const QRCode = require('qrcode');
const generateCoiOrient = require('../helpers/orient/generateCoiOrient.js');
// const generateQuotation = require('../helpers/generateQuotationReport.js');
const fs = require('fs');
const { compile } = require('handlebars');
const generateInvoiceOrient = require('../helpers/orient/generateInvoiceOrient.js');
const generateReceiptOrient = require('../helpers/orient/generateReceiptOrient.js');
const generateReceipt = require('../helpers/generateReceipt.js');
const { sendEmail } = require('../services/emailingService.js');
const generateUpdatedPolicyNumber = require('../helpers/generateUpdatedPolicyNumber.js');
// const calculateAgeFactor = require('../helpers/calculateAgeFactor.js');
const formidable = require('formidable');
const getUpdatedBalance = require('../helpers/getUpdatedBalance.js');
const refundDeductions = require('../helpers/refundDeductions.js');
const getBrokerUpdatedBalance = require('../helpers/getBrokerUpdateBalance.js');
const brokerPremiumBreakdown = require('../helpers/brokerPremiumBreakdown.js');
const generateInvoice = require('../helpers/generateInvoice.js');
const generateCoi = require('../helpers/generateCoi.js');

const Policy = getCollection('policies');
const User = getCollection('users');
const Passenger = getCollection('passengers');
const Agency = getCollection('agencies');
const AddOn = getCollection('addOns');
const Quote = getCollection('quote');
const Wholeseller = getCollection('wholesellers');
const Report = getCollection('report');
const Broker = getCollection('brokers');
// const Product = getCollection('products');
// const PriceFactor = getCollection('priceFactors');

// @desc    Gets the products based on parameters
// @route   POST /api/policies/get-products
// @access  PRIVATE - SUPER, STANDARD

const getPolicyProducts = async (req, res) => {
	let agencyId;
	let brokerId;
	if (req.user) {
		if (req?.user?.broker) {
			brokerId = req?.user?.broker?.brokerId || req.body.brokerId;
		} else {
			agencyId = req?.user?.agency?.agencyId;
		}
	} else {
		agencyId = req.body.agencyId;
	}

	if (req.brokerAdmin) {
		brokerId = req.brokerAdmin?.brokerId;
	} else {
		brokerId = req.body?.brokerId;
	}

	const { returnTrip, duration, destinationCountry, numOfPax, family } =
		req.body;

	const paxData = {
		children: Number(numOfPax.children),
		adults: Number(numOfPax.adults),
		seniors: Number(numOfPax.seniors),
		superSeniors: Number(numOfPax.superSeniors),
	};
	const { products } = await getProducts({
		agencyId,
		brokerId,
		returnTrip,
		duration,
		destinationCountry,
		numOfPax: paxData,
		family,
	});

	return res.status(200).json({
		products: formatIds(products, 'priceFactor'),
	});
};
// @desc    Gets the products based on parameters
// @route   POST /api/policies/get-products/agency-broker
// @access  PRIVATE - SUPER, STANDARD
const getPolicyProductsBrokerAgency = async (req, res) => {
	try {
		let agencyId;
		if (req.user) {
			agencyId = req.user.agency.agencyId;
		} else {
			agencyId = req.body.agencyId;
		}
		const {
			returnTrip,
			duration,
			destinationCountry,
			numOfPax,
			family,
			student,
			HUS,
			VIP,
		} = req.body;
		const paxData = {
			children: Number(numOfPax.children),
			adults: Number(numOfPax.adults),
			seniors: Number(numOfPax.seniors),
			superSeniors: Number(numOfPax.superSeniors),
		};
		const { products } = await getIhoProducts({
			agencyId,
			returnTrip,
			duration,
			destinationCountry,
			numOfPax: paxData,
			family,
			student,
			HUS,
			VIP,
		});
		return res.status(200).json({
			products: formatIds(products, 'priceFactor'),
		});
	} catch (error) {
		console.log('error', JSON.stringify(error));
	}
};

const getAllPolicyProducts = async (req, res) => {
	const {
		returnTrip,
		duration,
		destinationCountry,
		numOfPax,
		family,
		agencyId,
	} = req.body;
	const paxData = {
		children: Number(numOfPax.children),
		adults: Number(numOfPax.adults),
		seniors: Number(numOfPax.seniors),
		superSeniors: Number(numOfPax.superSeniors),
	};

	const { products } = await getProducts({
		agencyId,
		returnTrip,
		duration,
		destinationCountry,
		numOfPax: paxData,
		family,
	});
	return res.status(200).json({
		products: formatIds(products, 'priceFactor'),
	});
};
// @desc    Creates a new policy
// @route   POST /api/policies
// @access  PRIVATE - SUPER, STANDARD
const createPolicy = async (req, res) => {
	try {
		const baseUrl = 'https://' + req.get('host');
		let agencyId;
		let brokerId;
		let userId;
		if (req.brokerAdmin) {
			brokerId = req.brokerAdmin.brokerId;
		} else if (req.user && req.user.agency && req.user.agency !== undefined) {
			agencyId = req.user.agency.agencyId;
			userId = req.user.userId;
		} else if (req.user && req.user.broker && req.user.broker !== undefined) {
			brokerId = req.user.broker.brokerId;
			userId = req.user.userId;
		} else {
			agencyId = req.body.agencyId;
			userId = req.body.userId;
			brokerId = req.body.brokerId;
		}

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
		if (foundQuote?.policyId) {
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
		const { products } = await getProducts({
			agencyId,
			brokerId,
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

		let foundAgency;
		if (brokerId !== '' && brokerId !== undefined) {
			foundAgency = await Broker.findOne({ _id: new ObjectId(brokerId) });
		} else {
			foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
		}
		//set price values
		// totalPremium = foundProduct.priceExclVat.AED;
		premiumExclVat = foundProduct.priceExclVat.AED; // Calculate premium excluding VAT by taking 95% of price
		vat = premiumExclVat * 0.05; // Calculate VAT by taking 5% of totalPremium
		totalPremium = premiumExclVat + vat;

		// premiumExclVat = foundProduct.priceExclVat.AED;
		// vat = foundProduct.vat.AED;
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

			vat = premiumExclVat * 0.05;

			totalPremium = premiumExclVat + vat;
		}
		let deductionResponse;
		let generatedPolicyNumber;
		let breakdown;

		if (brokerId && brokerId !== '' && brokerId !== undefined) {
			deductionResponse = await getBrokerUpdatedBalance({
				brokerId,
				totalPremium,
				premiumExclVat,
			});
			generatedPolicyNumber = await generateBrokerPolicyNumber({
				brokerId,
				productCode: foundProduct.product.code,
			});
			breakdown = await brokerPremiumBreakdown({
				premium: premiumExclVat,
				brokerId,
			});
		} else {
			deductionResponse = await getUpdatedBalance({
				agencyId,
				totalPremium,
				premiumExclVat,
			});
			generatedPolicyNumber = await generatePolicyNumber({
				agencyId,
				productCode: foundProduct.product.code,
			});
			breakdown = await premiumBreakdown({
				premium: premiumExclVat,
				agencyId,
				userId,
			});
		}

		if (deductionResponse.error)
			return res.status(402).json({ msg: deductionResponse.error });

		const insertedPolicy = await Policy.insertOne({
			...(agencyId && { agency: new ObjectId(agencyId) }),
			...(brokerId && { broker: new ObjectId(brokerId) }),
			...(userId && { createdBy: new ObjectId(userId) }),
			number: generatedPolicyNumber,
			returnTrip: returnTrip,
			from,
			to,
			family: family || false,
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
				wholeseller: breakdown.wholeseller || 0,
				agency: breakdown.agency || 0,
				...(breakdown.broker && { broker: breakdown.broker || 0 }),
				ort: breakdown.ort || 0,
				cope: breakdown.cope || 0,
				staff: breakdown.staff || 0,
				// psp: breakdown.psp || 0,
			},
			deduction: deductionResponse.deduction,
			...(addOns && {
				addOns: addOns?.map((addOnId) => new ObjectId(addOnId)),
			}),
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
		console.log('insertedPolicy', insertedPolicy);
		const createPassenger = await Passenger.insertMany(
			passengers.map((passenger) => {
				return {
					policy: insertedPolicy.insertedId,
					type: passenger.type,
					firstName: passenger.firstName.toUpperCase() || '',
					lastName:
						passenger.lastName !== undefined
							? passenger.lastName.toUpperCase()
							: '',
					gender: passenger.gender,
					nationality: passenger.nationality,
					dob: moment(passenger.dob).toDate(),
					passportNumber: passenger.passportNumber,
					countryOfResidence: passenger.countryOfResidence,
					email: passenger.email,
					...(passenger.mobileNumber && {
						mobileNumber: passenger.mobileNumber,
					}),
					...(passenger.cityOfResidence && {
						cityOfResidence: passenger.cityOfResidence,
					}),
				};
			})
		);

		//update balance values

		if (brokerId !== '' && brokerId !== undefined) {
			const BrokerValues = deductionResponse.updatedValues.broker;
			await Broker.findOneAndUpdate(
				{
					_id: new ObjectId(brokerId),
				},
				{
					$set: {
						...(BrokerValues.balance != null && {
							balance: parseFloat(Number(BrokerValues.balance).toFixed(2)),
						}),
					},
				}
			);
		} else {
			const wholesellerValues = deductionResponse.updatedValues.wholeseller;
			const agencyValues = deductionResponse.updatedValues.agency;

			let wholesellerId = foundAgency.wholeseller;
			if (!(wholesellerId instanceof ObjectId)) {
				wholesellerId = new ObjectId(wholesellerId);
			}
			const wholesaler = await Wholeseller.findOneAndUpdate(
				{
					_id: wholesellerId,
				},
				{
					$set: {
						...(wholesellerValues.balance != null && {
							balance: parseFloat(Number(wholesellerValues.balance).toFixed(2)),
						}),
					},
				}
			);
			let agencyId = foundAgency._id;
			if (!(agencyId instanceof ObjectId)) {
				agencyId = new ObjectId(agencyId);
			}
			const updateAgency = await Agency.findOneAndUpdate(
				{
					_id: agencyId,
				},
				{
					$set: {
						...(agencyValues.balance != null && {
							balance: parseFloat(Number(agencyValues.balance).toFixed(2)),
						}),
					},
				}
			);
		}
		if (quoteId) {
			const quote = await Quote.findOneAndUpdate(
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
		const addReport = await fetch(
			`${
				baseUrl === 'https://localhost:4000' ? 'http://localhost:4000' : baseUrl
			}/api/reports/create-report?policy=${insertedPolicy.insertedId}`,
			{
				method: 'POST',
			}
		);
		const addReportResponse = await addReport.json();

		const coiLink = encodeURI(
			`${baseUrl}/api/policies/coi/${insertedPolicy.insertedId}`
		);
		const invoiceLink = encodeURI(
			`${baseUrl}/api/policies/invoice/${insertedPolicy.insertedId}`
		);
		const receiptLink = encodeURI(
			`${baseUrl}/api/policies/receipt/${insertedPolicy.insertedId}`
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
		if (error) {
			console.log('Error sending policy Mail:', JSON.stringify(error));
		}
		return;
	} catch (error) {
		console.log('Error creating policy:', error, JSON.stringify(error));
	}
};

const getPolicies = async (req, res) => {
	const baseUrl = `https://${req.get('host')}`;
	const userType = req.user
		? 'USER'
		: req.wholesellerAdmin
		? 'WHOLESELLER'
		: req.brokerAdmin
		? 'BROKER'
		: req.insurerAdmin
		? 'INSURER'
		: 'ADMIN';
	const page = parseInt(req.params.page) || 0;
	const {
		status,
		productCode,
		number,
		createdBy,
		returnTrip,
		from,
		to,
		leadFirstName,
		leadLastName,
		departureDateFrom,
		departureDateTo,
		bookingDateFrom,
		bookingDateTo,
		timezone,
		partners,
		agencyId,
		wholesellerId,
	} = req.query;
	const PAGE_SIZE = 20;
	const skip = page * PAGE_SIZE;

	const bookingDateRange = {
		start: momentTz.tz(bookingDateFrom, timezone).startOf('day').toDate(),
		end: momentTz.tz(bookingDateTo, timezone).endOf('day').toDate(),
	};
	const departureDateRange = getDateRange({
		from: departureDateFrom,
		to: departureDateTo,
	});

	// Base match conditions (optimized with indexes on status, product.code, number, etc.)
	const matchConditions = {
		...(status && { status }), // Index on status
		...(productCode && { 'product.code': productCode }), // Index on product.code
		...(number && { number: new RegExp(number, 'i') }), // Text index on number
		...(returnTrip != null && { returnTrip: returnTrip === 'true' }), // Index on returnTrip
		...(from && { from }), // Index on from
		...(to && { to }), // Index on to
		...(leadFirstName && {
			'policyHolder.firstName': new RegExp(leadFirstName, 'i'),
		}), // Text index on policyHolder.firstName
		...(leadLastName && {
			'policyHolder.lastName': new RegExp(leadLastName, 'i'),
		}), // Text index on policyHolder.lastName
		...((bookingDateFrom || bookingDateTo) && {
			createdAt: {
				...(bookingDateRange.start && { $gte: bookingDateRange.start }),
				...(bookingDateRange.end && { $lte: bookingDateRange.end }),
			},
		}), // Index on createdAt
		...((departureDateFrom || departureDateTo) && {
			departureDate: {
				...(departureDateRange.start && { $gte: departureDateRange.start }),
				...(departureDateRange.end && { $lte: departureDateRange.end }),
			},
		}), // Index on departureDate
	};

	// 🔥 force filter by insurer
	// matchConditions['product.insurer'] = new ObjectId('6644925ed4077c58b817158a');

	// User-type specific match conditions (optimized with compound indexes)
	if (userType === 'USER') {
		if (req.user?.broker?.brokerId) {
			matchConditions['createdBy._id'] = new ObjectId(req.user.userId); // Compound index on createdBy._id, broker
			matchConditions.broker = new ObjectId(req.user.broker.brokerId);
		}
		if (req.user?.agency?.agencyId) {
			matchConditions['agency._id'] = new ObjectId(req.user.agency.agencyId); // Index on agency._id
		}
		if (req.user?.permission === 'STANDARD') {
			matchConditions['createdBy._id'] = new ObjectId(req.user.userId); // Index on createdBy
		}
		if (req.user?.permission === 'SUPER' && createdBy) {
			matchConditions['createdBy._id'] = new ObjectId(createdBy); // Index on createdBy
		}
	} else if (userType === 'WHOLESELLER') {
		if (agencyId && agencyId !== 'all') {
			matchConditions['agency._id'] = new ObjectId(agencyId); // Compound index on agency._id, agency.wholeseller
		}
		matchConditions['agency.wholeseller'] = new ObjectId(
			req.wholesellerAdmin.wholesellerId
		);
		if (createdBy) {
			matchConditions['createdBy._id'] = new ObjectId(createdBy); // Index on createdBy
		}
	} else if (userType === 'BROKER') {
		if (agencyId && agencyId !== 'all') {
			matchConditions['agency._id'] = new ObjectId(agencyId); // Compound index on agency._id, agency.broker
		}
		matchConditions.$or = [
			{ 'agency.broker': new ObjectId(req.brokerAdmin.brokerId) },
			{ broker: new ObjectId(req.brokerAdmin.brokerId) },
		];
		if (createdBy) {
			matchConditions['createdBy._id'] = new ObjectId(createdBy); // Index on createdBy
		}
	} else if (userType === 'INSURER') {
		if (agencyId && agencyId !== 'all') {
			matchConditions['agency._id'] = new ObjectId(agencyId); // Compound index on agency.insurer, agency.broker
		}
		matchConditions['agency.insurer'] = new ObjectId(
			req.insurerAdmin.insurerId
		);
		matchConditions['agency.broker'] = { $exists: true, $ne: null };
		if (createdBy) {
			matchConditions['createdBy._id'] = new ObjectId(createdBy); // Index on createdBy
		}
	} else if (userType === 'ADMIN') {
		if (req.query.partners === 'true') {
			matchConditions.partner = { $exists: true }; // Index on partner
		} else if (agencyId && agencyId !== 'all') {
			matchConditions['agency._id'] = new ObjectId(agencyId); // Index on agency._id
		}
		if (wholesellerId && wholesellerId !== 'all') {
			matchConditions['agency.wholeseller'] = new ObjectId(wholesellerId); // Index on agency.wholeseller
		}
		if (createdBy) {
			matchConditions['createdBy._id'] = new ObjectId(createdBy); // Index on createdBy
		}
	}

	// Partner-specific conditions (optimized with indexes)
	if (partners) {
		if (partners === 'AMH') {
			matchConditions['agency.code'] = 'AMHT'; // Index on agency.code
		} else if (partners === 'RVS') {
			matchConditions['agency.wholeseller'] = new ObjectId(
				'66910677746260ec48379840'
			); // Index on agency.wholeseller
		} else if (partners === 'MMT') {
			matchConditions.partner = new ObjectId('665714e1dacf8e59ec947e46'); // Index on partner
		} else if (partners === 'IHO' || partners === 'ORT') {
			matchConditions['agency.broker'] = { $exists: true, $ne: null }; // Index on agency.broker
		} else if (partners === 'Success') {
			matchConditions['agency.wholeseller'] = { $exists: true, $ne: null }; // Index on agency.wholeseller
		}
	}

	// Lookup pipeline (optimized with indexes on related collections)
	const lookupPipeline = [
		{
			$lookup: {
				from: 'agencies',
				localField: 'agency',
				foreignField: '_id',
				as: 'agency',
			},
		}, // Index on agencies._id
		{
			$lookup: {
				from: 'users',
				localField: 'createdBy',
				foreignField: '_id',
				as: 'createdBy',
			},
		}, // Index on users._id
		{
			$lookup: {
				from: 'priceFactors',
				localField: 'priceFactor',
				foreignField: '_id',
				as: 'priceFactor',
			},
		}, // Index on priceFactors._id
		{
			$lookup: {
				from: 'products',
				localField: 'priceFactor.product',
				foreignField: '_id',
				as: 'product',
			},
		}, // Index on priceFactors.product, products._id
		{
			$lookup: {
				from: 'passengers',
				localField: '_id',
				foreignField: 'policy',
				as: 'passengers',
			},
		}, // Index on passengers.policy
		{
			$addFields: {
				agency: { $arrayElemAt: ['$agency', 0] },
				createdBy: { $arrayElemAt: ['$createdBy', 0] },
				priceFactor: { $arrayElemAt: ['$priceFactor', 0] },
				product: { $arrayElemAt: ['$product', 0] },
				policyHolder: '$passengers',
				associatedEntityType: {
					$cond: {
						if: { $ifNull: ['$partners', false] },
						then: 'partner',
						else: {
							$cond: {
								if: { $ifNull: ['$agency', false] },
								then: 'agency',
								else: 'broker',
							},
						},
					},
				},
				associatedEntity: {
					$cond: {
						if: { $ifNull: ['$partners', false] },
						then: '$partners',
						else: {
							$cond: {
								if: { $ifNull: ['$agency', false] },
								then: '$agency',
								else: '$broker',
							},
						},
					},
				},
			},
		},
	];
	// Main aggregation pipeline using $facet for count and data
	const results = await Policy.aggregate([
		...lookupPipeline,
		{
			$match: {
				...matchConditions,
			},
		},
		{
			$facet: {
				totalCount: [{ $count: 'totalPolicies' }],
				paginatedResults: [
					{
						$project: {
							breakdown: 0,
							addOns: 0,
							priceFactor: 0,
							productName: 0,
							passengers: 0,
							'createdBy.password': 0,
							'product.benefits': 0,
						},
					},
					{
						$addFields: {
							coi: {
								$concat: [
									{
										$cond: {
											if: { $eq: ['$associatedEntityType', 'partner'] },
											then: `${process.env.PARTNERS_BASE_URL}/api/policies/coi/`,
											else: `${baseUrl}/api/policies/coi/`,
										},
									},
									{ $toString: '$_id' },
								],
							},
							invoice: {
								$concat: [
									{
										$cond: {
											if: { $eq: ['$associatedEntityType', 'partner'] },
											then: `${process.env.PARTNERS_BASE_URL}/api/policies/invoice/`,
											else: `${baseUrl}/api/policies/invoice/`,
										},
									},
									{ $toString: '$_id' },
								],
							},
							receipt: {
								$concat: [
									{
										$cond: {
											if: { $eq: ['$associatedEntityType', 'partner'] },
											then: `${process.env.PARTNERS_BASE_URL}/api/policies/receipt/`,
											else: `${baseUrl}/api/policies/receipt/`,
										},
									},
									{ $toString: '$_id' },
								],
							},
						},
					},
					{ $sort: { createdAt: -1 } }, // Index on createdAt
					{ $skip: skip },
					{ $limit: PAGE_SIZE },
				],
			},
		},
	]).toArray();

	// Extract results
	const totalPolicies = results[0]?.totalCount[0]?.totalPolicies || 0;
	const totalPages = Math.ceil(totalPolicies / PAGE_SIZE);
	const nextPage = page + 1 >= totalPages ? null : page + 1;
	const prevPage = page - 1 < 0 ? null : page - 1;
	const policies = results[0]?.paginatedResults || [];

	return res.status(200).json({
		policies,
		pagination: {
			totalRecords: totalPolicies,
			totalPages,
			currentPage: page,
			nextPage,
			prevPage,
		},
	});
};

// @desc    Return COI pdf file
// @route   GET /api/policies/coi/:policyId
// @access  PUBLIC
const getPolicyCoi = async (req, res) => {
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
				from: 'brokers',
				localField: 'broker',
				foreignField: '_id',
				as: 'broker',
			},
		},
		{ $addFields: { broker: { $arrayElemAt: ['$broker', 0] } } },
		{
			$lookup: {
				from: 'partners',
				localField: 'partner',
				foreignField: '_id',
				as: 'partner',
			},
		},
		{ $addFields: { partner: { $arrayElemAt: ['$partner', 0] } } },
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

	let pdfBuffer;
	const givenDate = new Date(foundPolicy.createdAt);
	const cutoffDate = new Date('2025-08-01T00:00:00.000Z');

	if (givenDate < cutoffDate) {
		pdfBuffer = await generateCoi({
			insurerCode: foundPolicy?.insurer?.code || '',
			data: {
				policyQr: qrCodeBuffer,
				policyType: `Travel Insurance - ${foundPolicy?.product?.name || ''}`,
				productCode: `${foundPolicy?.product?.code}`,
				addOns: addOnsArray,
				policyNumber: foundPolicy.number,
				status: foundPolicy.status,
				totalPremium: foundPolicy.totalPremium,
				agencyCode:
					foundPolicy?.agency?.code ||
					foundPolicy?.broker?.code ||
					foundPolicy?.partner?.code ||
					'',
				issuedBy:
					`${
						foundPolicy?.createdBy?.firstName ||
						foundPolicy?.broker?.name ||
						foundPolicy?.partner?.name ||
						''
					} ${foundPolicy?.createdBy?.lastName || ''}` || '',
				issueDate: moment(foundPolicy.createdAt).format('DD/MM/YYYY'),
				returnTrip: foundPolicy.returnTrip,
				// duration: foundPolicy.priceFactor.duration.max,
				duration: foundPolicy.returnTrip
					? moment(foundPolicy.returnDate).diff(
							moment(foundPolicy.departureDate),
							'days'
					  ) + 1
					: 'NA',
				coverage: foundPolicy?.coverage?.name,
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
				benefits: foundPolicy?.product?.benefits,
			},
		});
	} else {
		pdfBuffer = await generateCoiOrient({
			insurerCode: foundPolicy?.insurer?.code || '',
			data: {
				policyQr: qrCodeBuffer,
				policyType: `Travel Insurance - ${foundPolicy?.product?.name || ''}`,
				productCode: `${foundPolicy?.product?.code}`,
				addOns: addOnsArray,
				policyNumber: foundPolicy.number,
				status: foundPolicy.status,
				totalPremium: foundPolicy.totalPremium,
				agencyCode:
					foundPolicy?.agency?.code ||
					foundPolicy?.broker?.code ||
					foundPolicy?.partner?.code ||
					'',
				issuedBy:
					`${
						foundPolicy?.createdBy?.firstName ||
						foundPolicy?.broker?.name ||
						foundPolicy?.partner?.name ||
						''
					} ${foundPolicy?.createdBy?.lastName || ''}` || '',
				issueDate: moment(foundPolicy.createdAt).format('DD/MM/YYYY'),
				returnTrip: foundPolicy.returnTrip,
				// duration: foundPolicy.priceFactor.duration.max,
				duration: foundPolicy.returnTrip
					? moment(foundPolicy.returnDate).diff(
							moment(foundPolicy.departureDate),
							'days'
					  ) + 1
					: 'NA',
				coverage: foundPolicy?.coverage?.name,
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
				benefits: foundPolicy?.product?.benefits,
			},
		});
	}

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', 'attachment; filename=certificate.pdf');
	return res.send(Buffer.from(pdfBuffer));
};

// @desc    Return tax invoice pdf file
// @route   GET /api/policies/invoice/:policyId
// @access  PUBLIC
const getPolicyInvoice = async (req, res) => {
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

	let pdfBuffer;
	const givenDate = new Date(foundPolicy.createdAt);
	const cutoffDate = new Date('2025-08-01T00:00:00.000Z');

	if (givenDate < cutoffDate) {
		pdfBuffer = await generateInvoice({
			insurerCode: foundPolicy?.insurer?.code | '',
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
	} else {
		pdfBuffer = await generateInvoiceOrient({
			insurerCode: foundPolicy?.insurer?.code | '',
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
	}

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
	return res.send(Buffer.from(pdfBuffer));
};

// @desc    Return receipt pdf file
// @route   GET /api/policies/receipt/:policyId
// @access  PUBLIC
const getPolicyReceipt = async (req, res) => {
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

	let pdfBuffer;
	const givenDate = new Date(foundPolicy.createdAt);
	const cutoffDate = new Date('2025-08-01T00:00:00.000Z');

	if (givenDate < cutoffDate) {
		pdfBuffer = await generateReceipt({
			insurerCode: foundPolicy?.insurer?.code || '',
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
	} else {
		pdfBuffer = await generateReceiptOrient({
			insurerCode: foundPolicy?.insurer?.code || '',
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
	}

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', 'attachment; filename=receipt.pdf');
	return res.send(Buffer.from(pdfBuffer));
};

// @desc   Verifies COI policy
// @route   GET /api/policies/verify/:policyId
// @access  PUBLIC
const verifyPolicyCoi = async (req, res) => {
	const { policyId } = req.params;

	const [foundPolicy] = await Policy.aggregate([
		{
			$match: {
				_id: new ObjectId(policyId),
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

	const givenDate = new Date(foundPolicy.createdAt);
	const cutoffDate = new Date('2025-08-01T00:00:00.000Z');
	let emailTemplete;
	if (givenDate < cutoffDate) {
		emailTemplete = 'PolicyVerification.html';
	} else {
		emailTemplete = 'orient/OrientPolicyVerification.html';
	}

	const source = fs.readFileSync(
		`${process.cwd()}/templates/${emailTemplete}`,
		'utf8'
	);

	const policyEndDate = foundPolicy.returnTrip
		? moment(foundPolicy.returnDate).format('DD MMMM YYYY')
		: moment(foundPolicy.createdAt).add(3, 'days').format('DD MMMM YYYY');

	const template = compile(source);
	const replacements = {
		isValid:
			!moment().isAfter(moment(policyEndDate)) &&
			foundPolicy.status !== 'cancelled',
		logo: 'https://storage.googleapis.com/coi_templates/UAE_portal/OT_Logo.png',
		policyType: `Travel Insurance - ${foundPolicy.product.name}`,
		policyNumber: foundPolicy.number,
		policyHolder: {
			...foundPolicy.passengers[0],
			dob: moment(foundPolicy.passengers[0]?.dob).format('DD/MM/YYYY'),
		},
		passengers: foundPolicy.passengers.slice(1).map((passenger, i) => {
			return {
				...passenger,
				number: i + 1,
				dob: moment(passenger.dob).format('DD/MM/YYYY'),
			};
		}),
		issueDate: moment(foundPolicy.createdAt).format('DD MMMM YYYY'),
		departureDate: moment(foundPolicy.departureDate).format('DD MMMM YYYY'),
		policyEndDate: moment(foundPolicy.expiresAt).format('DD MMMM YYYY'),
		coverage: foundPolicy.to === 'ARE' ? 'ARE' : foundPolicy.coverage.name,
		duration: foundPolicy.priceFactor.duration.max,
	};
	const html = template(replacements);

	return res.send(html);
};

// @desc   	Gets filtered policies for CVN Admin on behalf of Wholesaler, Agency or User
// @route   GET /api/policies/get-policies
// @access  ADMIN
const getFilteredPolicies = async (req, res) => {
	const { agencyId, wholesellerId } = req.query;

	if (wholesellerId && !agencyId) {
		const foundAgency = await Agency.find({
			wholeseller: new ObjectId(wholesellerId),
		}).toArray();
		if (!foundAgency) return res.status(404).json({ msg: 'No agency found.' });

		const foundPolicies = await Policy.find({
			agency: { $in: foundAgency.map((agency) => agency._id) },
		}).toArray();

		if (!foundPolicies)
			return res.status(404).json({ msg: 'No policy found.' });

		return res.status(200).json({ policies: foundPolicies });
	}

	if (wholesellerId && (agencyId || agencyId === 'all')) {
		const foundPolicies = await Policy.find({
			agency: new ObjectId(agencyId),
		}).toArray();

		if (!foundPolicies)
			return res.status(404).json({ msg: 'No policy found.' });

		return res.status(200).json({ policies: foundPolicies });
	}
};

// @desc   	Updates a policy
// @route   PATCH /api/policies/:policyId
// @access  PRIVATE - SUPER, STANDARD
const updatePolicy = async (req, res) => {
	const { policyId } = req.params;
	const {
		departureDate,
		returnDate,
		gender,
		nationality,
		agency,
		passportNumber,
		dob,
		passengerId,
		policyHolderFirstName,
		policyHolderLastName,
	} = req.body;

	const foundPolicy = await Policy.findOne({
		_id: new ObjectId(policyId),
		// agency: new ObjectId(agencyId),
	});
	if (!foundPolicy) return res.status(404).json({ msg: 'Policy not found.' });
	const foundPassenger = await Passenger.find({
		policy: foundPolicy._id,
	}).toArray();

	if (!foundPassenger)
		return res.status(404).json({ msg: 'No passengers found.' });

	await Passenger.updateOne(
		{
			_id: new ObjectId(passengerId),
		},
		{
			$set: {
				gender: gender.toUpperCase(),
				nationality,
				dob: moment(dob).toDate(),
				passportNumber,
				firstName: policyHolderFirstName,
				lastName: policyHolderLastName,
			},
		}
	);
	await Report.updateOne(
		{
			'passengers._id': new ObjectId(passengerId),
			'policy._id': new ObjectId(foundPolicy._id),
		},
		{
			$set: {
				'passengers.$.gender': gender.toUpperCase(),
				'passengers.$.nationality': nationality,
				'passengers.$.dob': moment(dob).toDate(),
				'passengers.$.passportNumber': passportNumber,
				'passengers.$.firstName': policyHolderFirstName,
				'passengers.$.lastName': policyHolderLastName,
			},
		}
	);

	//re-calculate dates
	const tripDuration = foundPolicy.returnTrip
		? moment(foundPolicy.returnDate).diff(
				moment(foundPolicy.departureDate),
				'days'
		  )
		: 1;
	const updatedReturnDate = moment(departureDate)
		.add(tripDuration, 'days')
		.format('YYYY-MM-DD');
	const updatedExpiryDate = foundPolicy.returnTrip
		? moment(updatedReturnDate).toDate()
		: moment(departureDate).add(3, 'days').format('YYYY-MM-DD');
	if (
		!foundPolicy.partner &&
		!foundPolicy.amend.departureDate &&
		moment(foundPolicy.departureDate).format('YYYY-MM-DD') != departureDate
	) {
		await Policy.updateOne(
			{ _id: foundPolicy._id },
			{
				$set: {
					'amend.departureDate': true,
				},
			}
		);

		await Report.updateOne(
			{ 'policy._id': foundPolicy._id },
			{
				$set: {
					'policy.amend.departureDate': true,
				},
			}
		);
	}

	if (
		!foundPolicy.partner &&
		!foundPolicy.amend.returnDate &&
		moment(foundPolicy.returnDate).format('YYYY-MM-DD') != returnDate
	) {
		await Policy.updateOne(
			{ _id: foundPolicy._id },
			{
				$set: {
					'amend.returnDate': true,
				},
			}
		);
		await Report.updateOne(
			{ 'policy._id': foundPolicy._id },
			{
				$set: {
					'policy.amend.returnDate': true,
				},
			}
		);
	}
	//push update
	await Policy.findOneAndUpdate(
		{ _id: foundPolicy._id },
		{
			$set: {
				number: generateUpdatedPolicyNumber({
					policyNumber: foundPolicy.number,
				}),

				departureDate: moment(departureDate).toDate(),
				...(foundPolicy.returnTrip && {
					returnDate: new Date(updatedReturnDate),
					expiresAt: moment(updatedExpiryDate).toDate(),
				}),
				updatedAt: new Date(),
			},
		}
	);

	await Report.findOneAndUpdate(
		{ 'policy._id': foundPolicy._id },
		{
			$set: {
				'policy.number': generateUpdatedPolicyNumber({
					policyNumber: foundPolicy.number,
				}),

				'policy.departureDate': moment(departureDate).toDate(),
				...(foundPolicy.returnTrip && {
					'policy.returnDate': new Date(updatedReturnDate),
					'policy.expiresAt': moment(updatedExpiryDate).toDate(),
				}),
				'policy.updatedAt': new Date(),
			},
		}
	);

	//get updated doc
	const policyAggregationRes = await Policy.aggregate([
		{
			$match: {
				_id: new ObjectId(policyId),
				// agency: new ObjectId(agencyId),
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
				from: 'passengers',
				localField: '_id',
				foreignField: 'policy',
				as: 'passengers',
			},
		},
	]).toArray();
	const updatedPolicy = policyAggregationRes.pop();

	res
		.status(200)
		.json({ msg: 'Policy updated successfully.', policy: updatedPolicy });
	return;
};

// @desc   	Send policy confirmation email to policy holder
// @route   POST /api/policies/email/:policyId
// @access  PRIVATE - SUPER, STANDARD
const emailPolicy = async (req, res) => {
	const baseUrl = 'https://' + req.get('host');
	const partnerbaseUrl = process.env.PARTNERS_BASE_URL;
	const { policyId } = req.params;
	const { email } = req.body;
	// const agencyId = req.user.agency.agencyId;
	const policy = await Policy.findOne({ _id: new ObjectId(policyId) });
	if (!policy) {
		return res.status(400).json({ mes: 'Policy not found' });
	}

	const policyAggregationRes = await Policy.aggregate([
		{
			$match: {
				_id: new ObjectId(policyId),
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
				from: 'passengers',
				localField: '_id',
				foreignField: 'policy',
				as: 'passengers',
			},
		},
	]).toArray();
	const foundPolicy = policyAggregationRes.pop();
	if (!foundPolicy) return res.status(404).json({ msg: 'Policy not found.' });
	let partner = false;
	if (foundPolicy.partner) {
		partner = true;
	}
	let emailTemplate;
	const givenDate = new Date(foundPolicy.createdAt);
	const cutoffDate = new Date('2025-08-01T00:00:00.000Z');

	if (givenDate > cutoffDate) {
		emailTemplate = 'orient/OrientCancelPolicyConfirmEmail.html';
	} else {
		emailTemplate = 'CancelPolicyConfirmEmail.html';
	}
	if (foundPolicy.status === 'cancelled') {
		//construct and send email
		const source = fs.readFileSync(
			`${process.cwd()}/templates/${emailTemplate}`,
			'utf8'
		);
		const template = compile(source);
		const replacements = {
			firstName: foundPolicy?.passengers[0]?.firstName || '',
			lastName: foundPolicy?.passengers[0]?.lastName || '',
			policyNumber: foundPolicy.number,
			coiLink: `${partner ? partnerbaseUrl : baseUrl}/api/policies/coi/${
				foundPolicy._id
			}`,
		};
		const html = template(replacements);
		const { error } = await sendEmail({
			to: email,
			cc: ['contact@covernomads.com'],
			subject: `Cancellation Notification: ${foundPolicy.number} has been cancelled`,
			text: `You're covered!`,
			html,
		});
		if (error)
			return res.status(500).json({
				msg: 'Something went wrong while sending email.',
				details: error,
			});
		return res.status(200).json({ msg: 'Policy emailed successfully.' });
	}

	const coiLink = `${partner ? partnerbaseUrl : baseUrl}/api/policies/coi/${
		foundPolicy._id
	}`;
	const invoiceLink = `${
		partner ? partnerbaseUrl : baseUrl
	}/api/policies/invoice/${foundPolicy._id}`;
	const receiptLink = `${
		partner ? partnerbaseUrl : baseUrl
	}/api/policies/receipt/${foundPolicy._id}`;
	const termsAndConditionsLink = foundPolicy.product.termsAndConditions;
	let policyCreationTemplate;
	if (givenDate < cutoffDate) {
		policyCreationTemplate = 'PolicyCreationEmail.html';
	} else {
		policyCreationTemplate = 'orient/OrientPolicyCreationEmail.html';
	}
	//construct and send email
	const source = fs.readFileSync(
		`${process.cwd()}/templates/${policyCreationTemplate}`,
		'utf8'
	);

	const template = compile(source);
	const replacements = {
		firstName: foundPolicy?.passengers[0]?.firstName || '',
		lastName: foundPolicy?.passengers[0]?.lastName || '',
		productName: foundPolicy.productName,
		policyNumber: foundPolicy.number,
		policyStartDate: moment(foundPolicy.departureDate).format('DD/MM/YYYY'),
		policyEndDate: moment(foundPolicy.expiresAt).format('DD/MM/YYYY'),
		ORT_HowtoClaim: ORT_HowtoClaim,
		IHO_HowtoClaim: IHO_HowtoClaim,
		coiLink,
		invoiceLink,
		receiptLink,
		termsAndConditionsLink,
	};
	const html = template(replacements);

	const { error } = await sendEmail({
		to: email,
		// cc: ['contact@covernomads.com'],
		subject: `Your Travel Insurance Confirmation - No. ${foundPolicy.number}`,
		text: `You're covered!`,
		html,
	});
	if (error)
		return res.status(500).json({
			msg: 'Something went wrong while sending email.',
			details: error,
		});
	return res.status(200).json({ msg: 'Policy emailed successfully.' });
};

// @desc   	Raises a ticket with CVN team
// @route   POST /api/policies/ticket/:policyId
// @access  PRIVATE - SUPER, STANDARD
const policyTicket = async (req, res) => {
	const { policyId } = req.params;
	const { agencyId } = req.query;

	const form = new formidable.IncomingForm();
	const parseForm = () => {
		return new Promise((resolve, reject) => {
			form.parse(req, (err, fields, files) => {
				if (err) {
					reject(err);
				} else {
					resolve({ fields, files });
				}
			});
		});
	};

	try {
		const { fields, files } = await parseForm();
		const subject = fields.subject;
		const message = fields.message;
		const file = files.file;

		const foundPolicy = await Policy.findOne({
			_id: new ObjectId(policyId),
			agency: new ObjectId(agencyId),
		});
		if (!foundPolicy) return res.status(404).json({ msg: 'Policy not found.' });

		// cancellation
		await Policy.updateOne(
			{
				_id: new ObjectId(policyId),
				agency: new ObjectId(agencyId),
			},
			{
				$set: {
					cancellation: true,
				},
			}
		);
		await Report.updateOne(
			{
				'policy._id': new ObjectId(policyId),
				'agency._id': new ObjectId(agencyId),
			},
			{
				$set: {
					'policy.cancellation': true,
				},
			}
		);
		const { error } = await sendEmail({
			to: 'contact@covernomads.com',
			cc: ['tariq.mahmood@covernomads.com'],
			subject: subject[0],
			text: `Ticket for ${foundPolicy.number}\n\n Agent message:\n ${message}`,
			attachments: [
				{
					filename: file[0].originalFilename,
					contentType: file[0].mimetype,
					content: fs.readFileSync(file[0].filepath),
					contentDisposition: 'attachment',
				},
			],
		});
		if (error) {
			console.log('policy ticket send mail error', JSON.stringify(error));
			return res.status(500).json({
				msg: 'Something went wrong while sending email.',
				details: error,
			});
		}
		return res.status(200).json({ msg: 'Ticket raised successfully.' });
	} catch (error) {
		console.log('policy ticket error', JSON.stringify(error));
	}
};

// @desc   	Cancel policy based on some rules
// @route   POST /api/policies/update-policy-status
// @access  ADMIN
const updatePolicyStatus = async (req, res) => {
	const baseUrl =
		req.get('host') === 'localhost:4000'
			? 'http://' + req.get('host')
			: 'https://' + req.get('host');
	try {
		const { cancellation, status, policyId, type } = req.body;
		const foundPolicy = await Policy.findOne({ _id: new ObjectId(policyId) });
		if (!foundPolicy) {
			return res.status(404).json({ msg: 'Policy not found.' });
		}

		if (!foundPolicy.partner) {
			const foundAgency = await Agency.findOne({
				_id: new ObjectId(foundPolicy?.agency),
			});
			if (!foundAgency) {
				return res.status(404).json({ msg: 'agency not found.' });
			}
			if (type === 'accept') {
				const foundUser = await User.findOne({
					_id: new ObjectId(foundPolicy?.createdBy),
				});
				if (!foundUser || foundUser === null) {
					return res.status(404).json({ msg: 'User not found.' });
				}
				if (foundPolicy.deduction) {
					await refundDeductions({
						agencyId: foundPolicy?.agency,
						deduction: foundPolicy.deduction,
					});
				} else {
					return res.status(404).json({ msg: 'policy deduction not found' });
				}
				if (foundAgency?.broker) {
					await Policy.updateOne(
						{ _id: new ObjectId(policyId) },
						{
							$set: {
								cancellation,
								status,
								'totalPremium.AED': 0,
								'premiumExclVat.AED': 0,
								'vat.AED': 0,
								'netPremium.AED': 0,
								'breakdown.cvn.value': 0,
								'breakdown.broker.value': 0,
								'breakdown.agency.value': 0,
							},
						}
					);
					await Report.updateOne(
						{ 'policy._id': new ObjectId(policyId) },
						{
							$set: {
								'policy.cancellation': cancellation,
								'policy.status': status,
								'policy.totalPremium.AED': 0,
								'policy.premiumExclVat.AED': 0,
								'policy.vat.AED': 0,
								'policy.netPremium.AED': 0,
								'policy.breakdown.cvn.value': 0,
								'policy.breakdown.broker.value': 0,
								'policy.breakdown.agency.value': 0,
							},
						}
					);
				} else {
					await Policy.updateOne(
						{ _id: new ObjectId(policyId) },
						{
							$set: {
								cancellation,
								status,
								'totalPremium.AED': 0,
								'premiumExclVat.AED': 0,
								'vat.AED': 0,
								'netPremium.AED': 0,
								'breakdown.cvn.value': 0,
								'breakdown.wholeseller.value': 0,
								'breakdown.agency.value': 0,
								'breakdown.staff.value': 0,
								'breakdown.psp.value': 0,
							},
						}
					);
					await Report.updateOne(
						{ 'policy._id': new ObjectId(policyId) },
						{
							$set: {
								'policy.cancellation': cancellation,
								'policy.status': status,
								'policy.totalPremium.AED': 0,
								'policy.premiumExclVat.AED': 0,
								'policy.vat.AED': 0,
								'policy.netPremium.AED': 0,
								'policy.breakdown.cvn.value': 0,
								'policy.breakdown.wholeseller.value': 0,
								'policy.breakdown.agency.value': 0,
								'policy.breakdown.staff.value': 0,
								'policy.breakdown.psp.value': 0,
							},
						}
					);
				}
				let emailTemplate;
				const givenDate = new Date(foundPolicy.createdAt);
				const cutoffDate = new Date('2025-08-01T00:00:00.000Z');

				if (givenDate > cutoffDate) {
					emailTemplate = 'orient/OrientCancelPolicyConfirmEmail.html';
				} else {
					emailTemplate = 'CancelPolicyConfirmEmail.html';
				}
				// //construct and send email
				const source = fs.readFileSync(
					`${process.cwd()}/templates/${emailTemplate}`,
					'utf8'
				);
				const template = compile(source);
				const replacements = {
					firstName: foundUser.firstName || '',
					lastName: foundUser.lastName || '',
					policyNumber: foundPolicy.number,
					coiLink: `${baseUrl}/api/policies/coi/${foundPolicy._id}`,
				};
				const html = template(replacements);
				const { error } = await sendEmail({
					to: foundUser?.email,
					cc: ['tariq.mahmood@covernomads.com', 'contact@covernomads.com'],
					subject: `Cancellation Notification: ${foundPolicy.number} has been cancelled`,
					text: `You're covered!`,
					html,
				});
				if (error)
					return res.status(500).json({
						msg: 'Something went wrong while sending Cancel policy email.',
						details: error,
					});
				return res.status(200).send({
					msg: 'Policy status and cancellation updated successfully.',
				});
			}
		} else {
			await Policy.updateOne(
				{ _id: new ObjectId(policyId) },
				{
					$set: {
						cancellation,
						status,
						'totalPremium.AED': 0,
						'premiumExclVat.AED': 0,
						'vat.AED': 0,
						'netPremium.AED': 0,
						'breakdown.cvn.value': 0,
						'breakdown.partner.value': 0,
						'breakdown.agency.value': 0,
						'breakdown.staff.value': 0,
						'breakdown.psp.value': 0,
						'breakdown.wholesaler.value': 0,
					},
				}
			);
			await Report.updateOne(
				{ 'policy._id': new ObjectId(policyId) },
				{
					$set: {
						'policy.cancellation': cancellation,
						'policy.status': status,
						'policy.totalPremium.AED': 0,
						'policy.premiumExclVat.AED': 0,
						'policy.vat.AED': 0,
						'policy.netPremium.AED': 0,
						'policy.breakdown.cvn.value': 0,
						'policy.breakdown.partner.value': 0,
						'policy.breakdown.wholesaler.value': 0,
						'policy.breakdown.agency.value': 0,
						'policy.breakdown.staff.value': 0,
						'policy.breakdown.psp.value': 0,
					},
				}
			);

			return res.status(200).send({ msg: 'Policy updated successfully.' });
		}
	} catch (error) {
		console.log('Policy status change error', JSON.stringify(error));
		return res.status(500).json({
			msg: 'Something went wrong while  Cancel policy .',
			details: error,
		});
	}
};

// @desc   	Adding defaule amend values to false
// @route   POST /api/policies/add-inital-amend-values
// @access  ADMIN
const setInitalAmendValues = async (req, res) => {
	await Policy.updateMany({}, [
		{
			$set: {
				'amend.departureDate': false,
				'amend.returnDate': false,
			},
		},
	]);
	return res.status(200).json({ msg: 'Policy cancelled successfully.' });
};

// Script to fix report. Can be removed
const premiumFix = async (req, res) => {};

module.exports = {
	getPolicyProducts,
	createPolicy,
	getPolicies,
	getPolicyCoi,
	getPolicyInvoice,
	getPolicyReceipt,
	verifyPolicyCoi,
	updatePolicy,
	emailPolicy,
	policyTicket,
	getAllPolicyProducts,
	getFilteredPolicies,
	updatePolicyStatus,
	setInitalAmendValues,
	premiumFix,
	getPolicyProductsBrokerAgency,
};
