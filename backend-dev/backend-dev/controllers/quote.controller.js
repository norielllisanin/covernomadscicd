const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const moment = require('moment');
const { roundToThreeDecimals } = require('../utils.js');
const ihoGenerateQuotationReport = require('../helpers/iho/ihoGenerateQuotationReport.js');
const ihoBasePremiumCalculation = require('../helpers/iho/ihoBasePremiumCalculation.js');
const generateQuotationOrient = require('../helpers/orient/generateQuotationReportOrient.js');
const {
	generateQuotationNumber,
} = require('../helpers/generateQuotationNumber.js');
const fs = require('fs');
const { compile } = require('handlebars');
const { sendEmail } = require('../services/emailingService.js');
const generatePaymentTransaction = require('../helpers/generatePaymentTransaction.js');
const handlePartnerPolicyConfirmation = require('../helpers/handlePartnerPolicyConfirmation.js');
const generateQuotationReport = require('../helpers/generateQuotationReport.js');
const AddOn = getCollection('addOns');
const Product = getCollection('products');
const Agency = getCollection('agencies');
const Broker = getCollection('brokers');
const PriceFactor = getCollection('priceFactors');
const Quote = getCollection('quote');
const Policy = getCollection('policies');

// Method POST
// route /api/quotes/create

const createQuote = async (req, res) => {
	const baseUrl =
		req.get('host') === 'localhost:4000' || req.get('host') === 'localhost:5000'
			? 'http://' + req.get('host')
			: 'https://' + req.get('host');

	let { status } = req.body;
	try {
		let {
			productId,
			coverageId,
			duration,
			addOnIds,
			priceFactorId,
			isAnnual,
			priceExclVat,
			price,
			vat,
			addOnTotal,
			isReturn,
			from,
			to,
			departureDate,
			returnDate,
			agencyId,
			userId,
			brokerId,
			wholesellerId,
			days,
			numOfPax,
			email,
			passengerInfo,
		} = req.body;
		let foundAgency;
		if (brokerId !== '' && brokerId !== undefined) {
			foundAgency = await Broker.findOne({
				_id: new ObjectId(brokerId),
			});
			status = 'pending' || status;
		} else {
			foundAgency = await Agency.findOne({
				_id: new ObjectId(agencyId),
			});
			status = 'payment_completed' || status;
		}
		const foundProduct = await Product.findOne({
			_id: new ObjectId(productId),
		});
		const agencyCode = foundAgency?.code;
		const productCode = foundProduct?.code;

		const nowDate = new Date();
		const date = moment(nowDate).format('MMM/YYYY').toUpperCase();

		const generateCode = await generateQuotationNumber({
			agencyCode,
			productCode,
			date,
		});
		const addonsIds = addOnIds?.map((addon) => new ObjectId(addon));
		const quoteData = {
			product: new ObjectId(productId),
			coverage: new ObjectId(coverageId),
			duration: duration,
			...(addOnIds.length > 0 && { addOns: addOnIds }),
			priceFactor: new ObjectId(priceFactorId),
			...(isAnnual ? { isAnnual: true } : { isAnnual: false }),
			priceExclVat: priceExclVat,
			price: price,
			vat: vat,
			addOnTotal: addOnTotal,
			isReturn,
			from,
			to,
			email: email || '',
			days: parseInt(days),
			departureDate: moment(departureDate).toDate(),
			returnDate: moment(returnDate).toDate(),
			...(agencyId && { agency: new ObjectId(agencyId) }),
			...(userId && { user: new ObjectId(userId) }),
			...(brokerId && { broker: new ObjectId(brokerId) }),
			...(wholesellerId && { wholeseller: new ObjectId(wholesellerId) }),
			numOfPax: {
				children: Number(numOfPax.children),
				seniors: Number(numOfPax.seniors),
				superSeniors: Number(numOfPax.superSeniors),
				adults: Number(numOfPax.adults),
			},
			code: generateCode,
			...(addOnIds.length > 0 && { addOns: addonsIds }),
			...(status ? { status: status } : { status: 'pending' }),
			...(passengerInfo &&
				passengerInfo.length > 0 && { passengerInfo: passengerInfo }),
			createdAt: new Date(),
		};

		let data, error;

		if (status === 'pending') {
			console.log('tesetign');
			// create payment transaction
			try {
				({ data, error } = await generatePaymentTransaction({
					amount: price?.AED?.toFixed(2),
					quotationDetails: {
						id: generateCode,
						number: generateCode,
					},
					customerDetails: {
						name: passengerInfo?.length
							? `${passengerInfo[0]?.firstName || ''} ${
									passengerInfo[0]?.lastName || ''
							  }`.trim()
							: 'John Doe',
						email,
					},
				}));
			} catch (err) {
				console.error('Error generating payment transaction:', err);
				return res
					.status(500)
					.json({ msg: 'Error generating payment link.', error: err.message });
			}

			if (error) {
				console.error('Payment transaction error:', error);
				return res
					.status(500)
					.json({ msg: 'Error generating payment transaction.', error });
			}
		}

		quoteData.paymentLink = data?.link_url || '';
		quoteData.paymentId = String(data?.link_id || '');
		console.log('asdfadsasdf');
		// // create quotation
		let createQuote;
		try {
			console.log('adsg34ef');
			createQuote = await Quote.insertOne(quoteData);
		} catch (error) {
			console.log('quote create error', JSON.stringify(error));
			if (error.code === 121 && error.errInfo) {
				console.log('Validation Error:', JSON.stringify(error.errInfo.details));
			} else {
				console.log('MongoDB Error:', JSON.stringify(error));
			}
			return res.status(500).json({ msg: 'Error creating quotation', error });
		}

		if (!createQuote.insertedId) {
			return res.status(400).json({ msg: 'Quotation not created' });
		}

		//  send mail to user

		const quoteId = createQuote && createQuote?.insertedId;
		if (status === 'pending') {
			const { link_url } = data;

			const sendMail = await fetch(`${baseUrl}/api/quotes/email/${quoteId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json', // Important!
				},
				body: JSON.stringify({ email: email, paymentLink: link_url }),
			});

			if (!sendMail) {
				return res.status(400).json({ msg: 'Mail not sent, please try again' });
			}
		}

		return res.status(201).json({
			data: createQuote,
			msg: 'Quote created successfully.',
		});
	} catch (error) {
		console.log('Error handling Quotation Creation:', JSON.stringify(error));
		res.status(500).json({
			msg: 'Error handling Quotation data',
			error: error.message,
		});
	}
};

const getPolicyQuotation = async (req, res) => {
	try {
		const {
			addOns,
			returnDate,
			departureDate,
			isReturn,
			to,
			days,
			totalAddOnsPrice,
			vet,
			agencyId,
			brokerId,
			priceFactorId,
			price,
			children,
			adults,
			tripType: returnTrip,
			seniors,
			superSeniors,
			code,
			family: family,
		} = req.query;
		const childrenInt = Number(children);
		const adultsInt = Number(adults);
		const seniorsInt = Number(seniors);
		const superSeniorsInt = Number(superSeniors);
		let foundAgency;
		if (agencyId) {
			foundAgency = await Agency.findOne({
				_id: new ObjectId(agencyId),
			});
		} else if (brokerId) {
			foundAgency = await Broker.findOne({
				_id: new ObjectId(brokerId),
			});
		}

		const agencyCode = foundAgency?.code;
		let parsedAddOns = [];
		parsedAddOns = addOns ? JSON.parse(addOns) : [];
		const foundPriceFactor = await PriceFactor.findOne({
			_id: new ObjectId(priceFactorId),
		});

		const age = foundPriceFactor?.age;
		const priceExclVat = foundPriceFactor?.priceExclVat;
		const foundProduct = await Product.findOne({
			_id: new ObjectId(foundPriceFactor.product),
		});
		const productBenefits = foundProduct.benefits;
		const productCode = foundProduct.code;
		const productName = foundProduct.name;
		const status = foundProduct.active;
		const type = foundProduct.type;
		const termsAndConditions = foundProduct.termsAndConditions;

		let adultBasePremium;
		let childBasePremium;
		let seniorBasePremium;
		let superSeniorBasePremium;

		if (
			family &&
			(productName === 'Rovers Family' || productName.code === 'ELTFAM')
		) {
			adultBasePremium = age[0].priceExclVat.AED || 0;
		} else if (
			(family === true || family === 'true') &&
			(productName === 'Light Nomads' || productName.code === 'LITNMD')
		) {
			adultBasePremium = age[1].priceExclVat.AED || 0;
		} else if (
			(family === false || family === 'false') &&
			(productName === 'Light Nomads' || productName.code === 'LITNMD')
		) {
			childBasePremium = (age && childrenInt * age[0].priceExclVat.AED) || 0;
			adultBasePremium = (age && adultsInt * age[1].priceExclVat.AED) || 0;
			seniorBasePremium = (age && seniorsInt * age[2].priceExclVat.AED) || 0;
			superSeniorBasePremium =
				(age && superSeniorsInt * age[3].priceExclVat.AED) || 0;
		} else {
			childBasePremium =
				(age && childrenInt * age[0].priceExclVat.AED) / 2 || 0;
			adultBasePremium = (age && adultsInt * age[0].priceExclVat.AED) || 0;
			seniorBasePremium = (age && seniorsInt * age[1].priceExclVat.AED) || 0;
			superSeniorBasePremium =
				(age && superSeniorsInt * age[2].priceExclVat.AED) || 0;
		}
		const nowDate = new Date();
		const date = moment(nowDate).format('MMM/YYYY').toUpperCase();

		let generateCode;
		if (code) {
			generateCode = code;
		} else {
			generateCode = await generateQuotationNumber({
				agencyCode,
				productCode,
				date,
			});
		}

		let tripType;
		if (isReturn === 'true' || returnTrip === 'true' || returnTrip === true) {
			tripType = 'return';
		} else {
			tripType = 'single';
		}

		const pdfBuffer = await generateQuotationOrient({
			data: {
				productCode: productCode,
				termsAndConditions,
				childBasePremium: roundToThreeDecimals(childBasePremium, 3) || 0,
				adultBasePremium: roundToThreeDecimals(adultBasePremium, 3) || 0,
				seniorBasePremium: roundToThreeDecimals(seniorBasePremium, 3) || 0,
				superSeniorBasePremium:
					roundToThreeDecimals(superSeniorBasePremium, 3) || 0,
				productName,
				isReturn: tripType,
				priceExclVat,
				agencyCode,
				code: generateCode,
				vet: vet,
				price: price,
				totalAddOnsPrice: totalAddOnsPrice,
				addOns: parsedAddOns,
				departureDate: moment(departureDate).format('YYYY-MM-DD'),
				returnDate: moment(returnDate).format('YYYY-MM-DD'),
				children,
				seniors,
				superSeniors,
				adults,
				status: status,
				totalPremium: price,
				type: type,
				duration: moment(returnDate).diff(moment(departureDate), 'days') + 1,
				days,
				broker: brokerId !== '' && brokerId !== undefined ? 'true' : 'false',
				destinationCountry: to,
				benefits: productBenefits.map((benefit) => {
					return {
						item: benefit.item,
						value: benefit.value,
					};
				}),
			},
		});

		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', 'attachment; filename=Quotation.pdf');
		res.send(Buffer.from(pdfBuffer));
	} catch (error) {
		console.error('Error handling policy data:', error);
		res.status(500).json({
			message: 'Error handling policy data',
			error: error.message,
		});
	}
};

const ihoGetPolicyQuotation = async (req, res) => {
	try {
		const {
			addOns,
			returnDate,
			departureDate,
			isReturn,
			to,
			days,
			totalAddOnsPrice,
			vet,
			agencyId,
			priceFactorId,
			price,
			children,
			adults,
			seniors,
			superSeniors,
			code,
		} = req.query;
		let foundAgency;
		if (agencyId) {
			foundAgency = await Agency.findOne({
				_id: new ObjectId(agencyId),
			});
		}

		const agencyCode = foundAgency?.code;
		let parsedAddOns = [];
		parsedAddOns = addOns ? JSON.parse(addOns) : [];
		const foundPriceFactor = await PriceFactor.findOne({
			_id: new ObjectId(priceFactorId),
		});
		const {
			childBasePremium,
			adultBasePremium,
			seniorBasePremium,
			superSeniorBasePremium,
		} = ihoBasePremiumCalculation({
			priceFactor: foundPriceFactor,
			children,
			adults,
			seniors,
			superSeniors,
		});
		const foundProduct = await Product.findOne({
			_id: new ObjectId(foundPriceFactor.product),
		});

		const productBenefits = foundProduct.benefits;
		const productCode = foundProduct.code;
		const productName = foundProduct.name;
		const status = foundProduct.active;
		const type = foundProduct.type;
		const termsAndConditions = foundProduct.termsAndConditions;

		const nowDate = new Date();
		const date = moment(nowDate).format('MMM/YYYY').toUpperCase();
		let generateCode;
		if (code) {
			generateCode = code;
		} else {
			generateCode = await generateQuotationNumber({
				agencyCode,
				productCode,
				date,
			});
		}

		let tripType;
		if (isReturn === 'true') {
			tripType = 'return';
		} else {
			tripType = 'single';
		}

		const pdfBuffer = await ihoGenerateQuotationReport({
			data: {
				productCode: productCode,
				termsAndConditions,
				childBasePremium: roundToThreeDecimals(childBasePremium, 3) || 0,
				adultBasePremium: roundToThreeDecimals(adultBasePremium, 3) || 0,
				seniorBasePremium: roundToThreeDecimals(seniorBasePremium, 3) || 0,
				superSeniorBasePremium:
					roundToThreeDecimals(superSeniorBasePremium, 3) || 0,
				productName,
				isReturn: tripType,
				priceExclVat: price,
				agencyCode,
				code: generateCode,
				vet: vet,
				totalAddOnsPrice: totalAddOnsPrice,
				addOns: parsedAddOns,
				departureDate: departureDate,
				returnDate: returnDate,
				children,
				seniors,
				superSeniors,
				adults,
				status: status,
				totalPremium: price,
				type: type,
				duration: moment(returnDate).diff(moment(departureDate), 'days') + 1,
				days,
				destinationCountry: to,
				benefits: productBenefits.map((benefit) => {
					return {
						item: benefit.item,
						value: benefit.value,
					};
				}),
			},
		});

		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', 'attachment; filename=Quotation.pdf');
		res.send(Buffer.from(pdfBuffer));
	} catch (error) {
		console.error('Error handling policy data:', error);
		res.status(500).json({
			message: 'Error handling policy data',
			error: error.message,
		});
	}
};

const getAllQuotations = async (req, res) => {
	const userType = req.user
		? 'USER'
		: req.wholesellerAdmin
		? 'WHOLESELLER'
		: req.brokerAdmin
		? 'BROKER'
		: req.insurerAdmin
		? 'INSURER'
		: 'ADMIN';

	const page = parseInt(req.params.page);
	const { code, createdBy, partners } = req.query;

	const PAGE_SIZE = 20;
	const skip = page * PAGE_SIZE;

	//generate lookup pipeline
	const lookupPipeline = [
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
			$addFields: {
				associatedEntityType: {
					$cond: {
						if: { $not: ['$agency'] },
						then: 'partner',
						else: 'agency',
					},
				},
				associatedEntity: { $ifNull: ['$agency', '$partners'] },
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
	];

	//generate query pipeline
	const queryPipeline = [
		{
			$match: {
				...(userType === 'USER' && {
					...(req.user?.broker?.brokerId !== undefined && {
						user: new ObjectId(req.user?.userId),
						broker: new ObjectId(req.user?.broker?.brokerId),
					}),
					...(req.user?.agency?.agencyId !== undefined && {
						'agency._id': new ObjectId(req.user.agency.agencyId),
					}),

					...(req.user.permission == 'STANDARD' &&
						req.user?.broker?.brokerId === undefined && {
							'createdBy._id': new ObjectId(req.user.userId),
						}),
					...(req.user.permission == 'SUPER' &&
						req.user?.broker?.brokerId === undefined &&
						createdBy && {
							'createdBy._id': new ObjectId(createdBy),
						}),
				}),
				...(userType === 'WHOLESELLER' && {
					...(req.query.agencyId &&
						req.query.agencyId !== 'all' && {
							'agency._id': new ObjectId(req.query.agencyId),
						}),
					'agency.wholeseller': new ObjectId(
						req.wholesellerAdmin.wholesellerId
					),
					...(createdBy && {
						'createdBy._id': new ObjectId(createdBy),
					}),
				}),
				...(userType === 'BROKER' && {
					...(req.query.agencyId &&
						req.query.agencyId !== 'all' && {
							'agency._id': new ObjectId(req.query.agencyId),
						}),
					broker: new ObjectId(req.brokerAdmin.brokerId),
					...(createdBy && {
						'createdBy._id': new ObjectId(createdBy),
					}),
				}),
				...(userType === 'INSURER' && {
					...(req.query.agencyId &&
						req.query.agencyId !== 'all' && {
							'agency._id': new ObjectId(req.query.agencyId),
						}),
					'agency.insurer': new ObjectId(req.insurerAdmin.insurerId),
					'agency.broker': { $exists: true, $ne: null },
					...(createdBy && {
						'createdBy._id': new ObjectId(createdBy),
					}),
				}),
				...(userType === 'ADMIN' && {
					...(req.query.partners === 'true'
						? { partner: { $exists: true } }
						: req.query.agencyId &&
						  req.query.agencyId !== 'all' && {
								'agency._id': new ObjectId(req.query.agencyId),
						  }),
					...(req.query.wholesellerId &&
						req.query.wholesellerId !== 'all' && {
							'agency.wholeseller': new ObjectId(req.query.wholesellerId),
						}),
					...(createdBy && {
						'createdBy._id': new ObjectId(createdBy),
					}),
				}),
				...(code && { code }),

				...(code && {
					code: new RegExp(code, 'i'),
				}),
			},
		},
	];

	//count total number of docs that fit query
	const quoteCount = await Quote.aggregate([
		...lookupPipeline,
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
				totalQuotes: '$count',
			},
		},
	]).toArray();

	//calculate pagination vars
	const totalQuotes = quoteCount.pop()?.totalQuotes || 0;
	const totalPages = Math.ceil(totalQuotes / PAGE_SIZE);
	const nextPage = page + 1 >= totalPages ? null : page + 1;
	const prevPage = page - 1 < 0 ? null : page - 1;

	//retrieve paginated documents
	const quotes = await Quote.aggregate([
		...lookupPipeline,
		...queryPipeline,

		{ $sort: { createdAt: 1 } }, // Changed to ascending order
		{ $skip: skip },
		{ $limit: PAGE_SIZE },
	]).toArray();
	const addOnIds = quotes.flatMap((quote) => quote.addOns) || []; // Flatten array
	const addOnss = await AddOn.find({ _id: { $in: addOnIds } }).toArray(); // Explicitly convert to array

	// Create a map of add-ons for quick lookup
	const addOnsMap =
		new Map(addOnss.map((addOn) => [addOn._id.toString(), addOn])) || [];

	// Fetch add-ons by their IDs and ensure the result is an array

	// Attach add-on details to quotes
	const enrichedQuotes = quotes.map((quote) => ({
		...quote,
		...(quote.addOns && {
			addOns: quote.addOns
				.map((addOnId) => addOnsMap.get(addOnId.toString()))
				.filter(Boolean),
		}),
	}));

	return res.status(200).json({
		quotes: enrichedQuotes,
		pagination: {
			totalRecords: totalQuotes,
			totalPages,
			currentPage: page,
			nextPage,
			prevPage,
		},
	});
};
// quotation by id

const getQuotationById = async (req, res) => {
	const quoteId = req.params.quoteId;
	//generate lookup pipeline
	const lookupPipeline = [
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
			$addFields: {
				associatedEntityType: {
					$cond: {
						if: { $not: ['$agency'] },
						then: 'partner',
						else: 'agency',
					},
				},
				associatedEntity: { $ifNull: ['$agency', '$partners'] },
			},
		},
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
	];

	const quotes = await Quote.aggregate([
		{ $match: { _id: new ObjectId(quoteId) } }, // Correct filtering
		...lookupPipeline,
	]).toArray(); // Convert aggregation result to array

	const addOnIds = quotes.flatMap((quote) => quote.addOns || []); // Handle missing addOns gracefully

	// Fetch add-ons and ensure the result is an array
	const addOns = await AddOn.find({
		_id: { $in: addOnIds.map((id) => new ObjectId(id)) },
	}).toArray();

	// Create a map for quick lookup
	const addOnsMap = new Map(
		addOns.map((addOn) => [addOn._id.toString(), addOn])
	);

	// Attach add-on details to quotes
	const enrichedQuotes = quotes.map((quote) => ({
		...quote,
		...(quote.addOns && {
			addOns: quote.addOns
				.map((addOnId) => addOnsMap.get(addOnId.toString()))
				.filter(Boolean),
		}),
	}));

	return res.status(200).json({
		quotes: enrichedQuotes[0],
	});
};

// @desc   	Send policy confirmation email to policy holder
// @route   POST /api/quotes/email/:quoteId
// @access  PRIVATE - SUPER, STANDARD
const emailQuote = async (req, res) => {
	const baseUrl =
		req.get('host') === 'localhost:4000' || req.get('host') === 'localhost:5000'
			? 'http://' + req.get('host')
			: 'https://' + req.get('host');
	const { quoteId } = req.params;
	const { email, paymentLink } = req.body;
	const quote = await Quote.findOne({ _id: new ObjectId(quoteId) });
	if (!quote) {
		return res.status(400).json({ mes: 'Policy not found' });
	}
	// const agencyId = quote.agency;
	// const brokerId = quote.broker;
	const quoteAggregationRes = await Quote.aggregate([
		{
			$match: {
				_id: new ObjectId(quoteId),

				// { agency: new ObjectId(agencyId) },
				// 	{ broker: new ObjectId(brokerId) },
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
			$addFields: {
				associatedEntityType: {
					$cond: {
						if: { $not: ['$agency'] },
						then: 'partner',
						else: 'agency',
					},
				},
				associatedEntity: { $ifNull: ['$agency', '$partners'] },
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
	]).toArray();
	const foundQuote = quoteAggregationRes.pop();
	if (!foundQuote) return res.status(404).json({ msg: 'Quote not found.' });

	const addOnIds = foundQuote.addOns || []; // Flatten array

	// Fetch add-ons by their IDs and ensure the result is an array
	const addOnss = await AddOn.find({ _id: { $in: addOnIds } }).toArray(); // Explicitly convert to array

	// Create a map of add-ons for quick lookup
	const addOnsMap = new Map(
		addOnss.map((addOn) => [addOn._id.toString(), addOn])
	);

	// Attach add-on details to quotes
	const quotation = {
		...foundQuote,
		...(foundQuote.addOns && {
			addOns: foundQuote.addOns
				.map((addOnId) => addOnsMap.get(addOnId.toString()))
				.filter(Boolean),
		}),
	};

	const params = {
		addOns: quotation?.addOns || [],
		returnDate: quotation.returnDate,
		departureDate: quotation.departureDate,
		isReturn: quotation.isReturn || '',
		to: quotation.to.label || '',
		days: quotation.days || '',
		agencyId: quotation?.agency?._id || '',
		priceFactorId: quotation?.priceFactor._id || '',
		price: parseFloat(quotation.price.AED),
		totalAddOnsPrice: parseFloat(quotation.addOnTotal.AED),
		vet: parseFloat(quotation.vat.AED),
		children: quotation.numOfPax.children || 0,
		adults: quotation.numOfPax.adults || 0,
		seniors: quotation.numOfPax.seniors || 0,
		superSeniors: quotation.numOfPax.superSeniors || 0,
		code: quotation.code || '',
	};

	const queryString = Object.entries(params)
		.map(([key, value]) => {
			const paramValue = Array.isArray(value) ? JSON.stringify(value) : value;
			return `${key}=${encodeURIComponent(paramValue)}`;
		})
		.join('&');
	let url;
	if (quotation.associatedEntity?.broker) {
		url = `${baseUrl}/api/quotes/iho/quotation?${queryString}`;
	} else {
		url = `${baseUrl}/api/quotes/policy/quotation?${queryString}`;
	}

	//construct and send email
	const source = fs.readFileSync(
		`${process.cwd()}/templates/orient/OrientQuoteCreationEmail.html`,
		'utf8'
	);
	const template = compile(source);
	let replacements;
	if (quotation.status === 'created') {
		replacements = {
			name: quotation?.agency?.name || '',
			code: foundQuote.code,
			quoteStartDate: moment(foundQuote.departureDate).format('DD/MM/YYYY'),
			quoteEndDate: moment(foundQuote.returnDate).format('DD/MM/YYYY'),
			quoteLink: url,
		};
	} else if (paymentLink || paymentLink !== '' || quotation?.paymentLink) {
		replacements = {
			name: quotation?.agency?.name || '',
			code: foundQuote.code,
			paymentLink: paymentLink || quotation?.paymentLink,
			quoteStartDate: moment(foundQuote.departureDate).format('DD/MM/YYYY'),
			quoteEndDate: moment(foundQuote.returnDate).format('DD/MM/YYYY'),
			quoteLink: url,
		};
	} else {
		replacements = {
			name: quotation?.agency?.name || '',
			code: foundQuote.code,
			quoteStartDate: moment(foundQuote.departureDate).format('DD/MM/YYYY'),
			quoteEndDate: moment(foundQuote.returnDate).format('DD/MM/YYYY'),
			quoteLink: url,
		};
	}
	const html = template(replacements);

	const { error } = await sendEmail({
		to: email,
		cc: ['contact@covernomads.com'],
		subject: `Your Travel Insurance Quotation - No. ${foundQuote.code}`,
		text: `You're covered!`,
		html,
	});
	if (error)
		return res.status(500).json({
			msg: 'Something went wrong while quote sending email.',
			details: error,
		});
	return res.status(200).json({ msg: 'Quotation emailed successfully.' });
};

const paymentTransactionWebhook = async (req, res) => {
	try {
		const { cart_id, tran_ref, payment_result } = req.body;

		if (
			payment_result.response_status !== 'A' &&
			payment_result.response_message !== 'Authorised'
		) {
			return res
				.status(200)
				.json({ message: 'Payment not complete, try again.' });
		}
		if (!cart_id) {
			// Validate cart_id
			return res.status(400).json({ error: 'cart_id is required' });
		}
		const name = req.body?.customerDetails?.name || '';
		const email = req.body?.customerDetails?.email || '';

		if (!cart_id.endsWith('-portal') || !cart_id.includes('-portal')) {
			//check if the webhook is for a partner related payment
			const foundPartnerPolicy = await Policy.findOne({
				_id: new ObjectId(cart_id),
				status: 'unpaid',
			});
			if (foundPartnerPolicy) {
				await handlePartnerPolicyConfirmation({
					policyId: foundPartnerPolicy._id,
					tran_ref: tran_ref,
					baseUrl: 'https://' + req.get('host'),
				});
				return res.sendStatus(200);
			}
		} else {
			const cleanCartId = cart_id.split('-portal')[0]; // Remove '-portal' suffix if present
			const code = String(cleanCartId);

			// Find and update the quote

			const foundQuote = await Quote.findOneAndUpdate(
				{ code: code },
				{
					$set: {
						status: 'payment_completed',
						transactionReference: tran_ref,
						updatedAt: new Date(),
					},
				}
			);

			if (!foundQuote) {
				return res.status(404).json({ error: 'Quote not found' });
			}

			// 2. Lookup broker details using aggregation
			const quotes = await Quote.aggregate([
				{ $match: { code: code } }, // Correct filtering
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

				{
					$addFields: {
						'broker.brokerAdmin': {
							$arrayElemAt: ['$brokerAdmin', 0],
						},
					},
				},
			]).toArray();

			const quote = quotes[0];

			//construct and send email
			const source = fs.readFileSync(
				`${process.cwd()}/templates/orient/OrientSuccessfulPaymentEmail.html`,
				'utf8'
			);

			const template = compile(source);
			const replacements = {
				name: name || quote?.broker?.brokerAdmin?.firstName || 'Traveler',
				code: code,
			};
			const html = template(replacements);
			const { error } = await sendEmail({
				to: email || foundQuote?.email,
				cc: [
					'contact@covernomads.com',
					quote?.broker?.brokerAdmin?.email || '',
				],
				subject: `Successful Payment towards Quote ${code}`,
				text: `You're covered!`,
				html,
			});
			if (error) {
				console.log('Error creating policy:', JSON.stringify(error));
			}

			return res.sendStatus(200);
		}
	} catch (error) {
		console.error('Error in paymentTransactionWebhook:', JSON.stringify(error));
		return res.status(500).json({ error: 'Internal Server Error' });
	}
};

module.exports = {
	createQuote,
	ihoGetPolicyQuotation,
	getPolicyQuotation,
	getAllQuotations,
	emailQuote,
	getQuotationById,
	paymentTransactionWebhook,
};
