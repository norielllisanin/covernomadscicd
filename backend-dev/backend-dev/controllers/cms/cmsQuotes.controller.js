const { ObjectId } = require('mongodb');
const moment = require('moment');
const fs = require('fs');
const { compile } = require('handlebars');
const { getCollection } = require('../../db');
const {
	generateQuotationNumber,
} = require('../../helpers/generateQuotationNumber');
const generateCmsPaymentTransaction = require('../../helpers/cms/generateCmsPaymentTransaction');
const {
	generateCmsQuotationNumber,
} = require('../../helpers/cms/generateCmsQuotationNumber');
const generateCmsQuotationReport = require('../../helpers/cms/generateCmsQuotationReport');
const { roundToThreeDecimals } = require('../../utils');
const { sendEmail } = require('../../services/emailingService');
const AddOn = getCollection('addOns');
const Product = getCollection('products');
const cmsAgency = getCollection('cmsAgency');
const Broker = getCollection('brokers');
const PriceFactor = getCollection('priceFactors');
const Quote = getCollection('quote');
const Policy = getCollection('policies');

// Method POST
// route /api/quotes/create

const createCmsQuote = async (req, res) => {
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
			days,
			numOfPax,
			email,
			passengerInfo,
		} = req.body;
		let foundAgency;

		foundAgency = await cmsAgency.findOne({
			_id: new ObjectId(agencyId),
		});
		status = 'pending' || status;
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
			priceExclVat: {
				INR: 0,
			},
			price: price,
			vat: {
				INR: 0,
			},
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
			numOfPax: {
				children: Number(numOfPax.children),
				seniors: Number(numOfPax.seniors),
				superSeniors: Number(numOfPax.superSeniors),
				adults: Number(numOfPax.adults),
			},
			cms: true,
			insurer: new ObjectId(foundAgency?.insurer),
			code: generateCode,
			...(addOnIds.length > 0 && { addOns: addonsIds }),
			...(status ? { status: status } : { status: 'pending' }),
			...(passengerInfo &&
				passengerInfo.length > 0 && { passengerInfo: passengerInfo }),
			createdAt: new Date(),
		};

		let data, error;

		if (status === 'pending') {
			console.log('create payment link');
			// create payment transaction
			const totalAmount = price?.INR + addOnTotal?.INR;
			const customer_id = Math.random().toString(36).substring(2, 15);
			try {
				({ data, error } = await generateCmsPaymentTransaction({
					amount: totalAmount?.toFixed(2),
					quotationDetails: {
						id: generateCode,
						number: generateCode,
					},
					customerDetails: {
						firstName: passengerInfo?.length
							? `${passengerInfo[0]?.firstName || ''} 
							  `.trim()
							: 'John',
						lastName: passengerInfo?.length
							? `${passengerInfo[0]?.lastName || ''}`.trim()
							: 'Doe',
						email: email || '',
						phone: passengerInfo?.[0]?.phone || '0000000000',
						customerId: customer_id,
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

		console.log(data);
		quoteData.paymentLink = data?.payment_links?.web || '';
		quoteData.paymentId = String(data?.id || '');
		// // create quotation

		let createQuote;
		try {
			createQuote = await Quote.insertOne(quoteData);
		} catch (error) {
			console.log('quote create error', error, JSON.stringify(error));
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

			const sendMail = await fetch(
				`${baseUrl}/api/cms/quotes/cms-quote-email/${quoteId}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json', // Important!
					},
					body: JSON.stringify({ email: email, paymentLink: link_url }),
				}
			);

			if (!sendMail) {
				return res.status(400).json({ msg: 'Mail not sent, please try again' });
			}
		}

		return res.status(201).json({
			data: createQuote,
			msg: 'Quote created successfully.',
		});
	} catch (error) {
		console.log(
			'Error handling Quotation Creation:',
			error,
			JSON.stringify(error)
		);
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
			foundAgency = await cmsAgency.findOne({
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
			adultBasePremium = age[0].priceExclVat.INR || 0;
		} else if (
			(family === true || family === 'true') &&
			(productName === 'Light Nomads' || productName.code === 'LITNMD')
		) {
			adultBasePremium = age[1].price.INR * 0.95 || 0;
		} else if (
			(family === false || family === 'false') &&
			(productName === 'Light Nomads' || productName.code === 'LITNMD')
		) {
			childBasePremium = (age && childrenInt * age[0].price.INR * 0.95) || 0;
			adultBasePremium = (age && adultsInt * age[1].price.INR * 0.95) || 0;
			seniorBasePremium = (age && seniorsInt * age[2].price.INR * 0.95) || 0;
			superSeniorBasePremium =
				(age && superSeniorsInt * age[3].price.INR * 0.95) || 0;
		} else {
			childBasePremium =
				(age && childrenInt * age[0].price.INR * 0.95) / 2 || 0;
			adultBasePremium = (age && adultsInt * age[0].price.INR * 0.95) || 0;
			seniorBasePremium = (age && seniorsInt * age[1].price.INR * 0.95) || 0;
			superSeniorBasePremium =
				(age && superSeniorsInt * age[2].price.INR * 0.95) || 0;
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

const getAllCmsQuotations = async (req, res) => {
	const page = parseInt(req.params.page);
	const { code, createdBy, agency, user } = req.query;

	const userType = user === 'true' || user === true ? 'USER' : 'ADMIN';

	const PAGE_SIZE = 20;
	const skip = page * PAGE_SIZE;

	//generate lookup pipeline
	const lookupPipeline = [
		{
			$lookup: {
				from: 'cmsAgency',
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
				cms: true,
				...(userType === 'USER' && {
					// ...(agency !== undefined && {
					// 	agency: new ObjectId(agency),
					// }),
					...(createdBy !== undefined && {
						user: new ObjectId(createdBy),
					}),
				}),

				...(code !== undefined && {
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

const getCmsQuotationById = async (req, res) => {
	const quoteId = req.params.quoteId;
	//generate lookup pipeline
	const lookupPipeline = [
		{
			$lookup: {
				from: 'cmsAgency',
				localField: 'agency',
				foreignField: '_id',
				as: 'agency',
			},
		},
		{ $addFields: { agency: { $arrayElemAt: ['$agency', 0] } } },

		{
			$lookup: {
				from: 'users',
				localField: 'user',
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
const emailCmsQuote = async (req, res) => {
	const baseUrl =
		req.get('host') === 'localhost:4000' || req.get('host') === 'localhost:5000'
			? 'http://' + req.get('host')
			: 'https://' + req.get('host');
	const { quoteId } = req.params;
	const { email, paymentLink } = req.body;
	const quote = await Quote.findOne({ _id: new ObjectId(quoteId) });
	if (!quote) {
		return res.status(400).json({ mes: 'Quote not found' });
	}
	// const agencyId = quote.agency;
	// const brokerId = quote.broker;
	const quoteAggregationRes = await Quote.aggregate([
		{
			$match: {
				_id: new ObjectId(quoteId),
			},
		},
		{
			$lookup: {
				from: 'cmsAgency',
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
		price: parseFloat(quotation.price.INR),
		totalAddOnsPrice: parseFloat(quotation.addOnTotal.INR),
		vet: parseFloat(quotation.vat.INR),
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

	url = `${baseUrl}/api/cms/quotes/quotation?${queryString}`;

	//construct and send email
	const source = fs.readFileSync(
		`${process.cwd()}/templates/cms/CmsQuoteCreationEmail.html`,
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
		// cc: ['contact@covernomads.com'],
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

const cmsPaymentTransactionWebhook = async (req, res) => {
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

const getCmsPolicyQuotation = async (req, res) => {
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
			tripType: returnTrip,
			seniors,
			superSeniors,
			code,
		} = req.query;

		const childrenInt = Number(children);
		const adultsInt = Number(adults);
		const seniorsInt = Number(seniors);
		const superSeniorsInt = Number(superSeniors);
		let foundAgency;
		foundAgency = await cmsAgency.findOne({
			_id: new ObjectId(agencyId),
		});

		const agencyCode = foundAgency?.code;
		let parsedAddOns = [];
		parsedAddOns = addOns ? JSON.parse(addOns) : [];
		const foundPriceFactor = await PriceFactor.findOne({
			_id: new ObjectId(priceFactorId),
		});

		const age = foundPriceFactor?.age;
		// const priceExclVat = foundPriceFactor?.priceExclVat;
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

		if (productName === 'FAMILY' || productName.code === 'ELTFAM') {
			adultBasePremium = age[0].price.INR || 0;
		} else {
			adultBasePremium = (age && adultsInt * age[0].price.INR) || 0;
			childBasePremium = (age && childrenInt * age[0].price.INR) || 0;
			seniorBasePremium = (age && seniorsInt * age[1].price.INR) || 0;
			superSeniorBasePremium = (age && superSeniorsInt * age[2].price.INR) || 0;
		}
		const nowDate = new Date();
		const date = moment(nowDate).format('MMM/YYYY').toUpperCase();

		let generateCode;
		if (code) {
			generateCode = code;
		} else {
			generateCode = await generateCmsQuotationNumber({
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

		const pdfBuffer = await generateCmsQuotationReport({
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
				// priceExclVat,
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
		console.log('Error handling policy data:', error, JSON.stringify(error));
		res.status(500).json({
			message: 'Error handling policy data',
			error: error.message,
		});
	}
};

module.exports = {
	getPolicyQuotation,
	getCmsPolicyQuotation,
	cmsPaymentTransactionWebhook,
	emailCmsQuote,
	getCmsQuotationById,
	createCmsQuote,
	getAllCmsQuotations,
};
