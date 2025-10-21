const { ObjectId } = require('mongodb');
const { getCollection } = require('../../db');
const moment = require('moment');
const momentTz = require('moment-timezone');
const {
	formatIds,
	getDateRange,
	capitalizeWord,
	getCountryName,
	roundToTwoDecimals,
	roundToThreeDecimals,
	CMS_HowtoClaim,
} = require('../../utils.js');
const getProducts = require('../../helpers/getProducts.js');
const getAddOnPrice = require('../../helpers/getAddOnPrice.js');
const QRCode = require('qrcode');
const fs = require('fs');
const { compile } = require('handlebars');
const { sendEmail } = require('../../services/emailingService.js');
const generateUpdatedPolicyNumber = require('../../helpers/generateUpdatedPolicyNumber.js');
const formidable = require('formidable');
const getCmsProducts = require('../../helpers/cms/getCmsProducts.js');
const getCmsUpdatedBalance = require('../../helpers/cms/getCmsUpdatedBalance.js');
const cmsPremiumBreakdown = require('../../helpers/cms/cmsPremiumBreakdown.js');
const {
	cmsGeneratePolicyNumber,
} = require('../../helpers/cms/cmsGeneratePolicyNumber.js');
const generateCmsCoi = require('../../helpers/cms/generateCmsCoi.js');
const generateCmsInvoice = require('../../helpers/cms/generateCmsInvoice.js');
const generateCmsReceipt = require('../../helpers/cms/generateCmsReceipt.js');
const generateCmsQuotationReport = require('../../helpers/cms/generateCmsQuotationReport.js');
const {
	generateCmsQuotationNumber,
} = require('../../helpers/cms/generateCmsQuotationNumber.js');
const refundCmsDeductions = require('../../helpers/cms/refundCmsDeductions.js');

const User = getCollection('users');
const Passenger = getCollection('passengers');
const AddOn = getCollection('addOns');
const Quote = getCollection('quote');
const Report = getCollection('report');
const CmsAgency = getCollection('cmsAgency');
const Policy = getCollection('policies');

const getAllCmsPolicyProducts = async (req, res) => {
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
	const { products } = await getCmsProducts({
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
		let userId;
		if (req.user) {
			agencyId = req.user.agency.agencyId;
			userId = req.user.userId;
		} else {
			agencyId = req.body.agencyId;
			userId = req.body.userId;
		}

		let totalPremium;
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
		const { products } = await getCmsProducts({
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
		const foundAgency = await CmsAgency.findOne({
			_id: new ObjectId(agencyId),
		});

		//set price values
		totalPremium = foundProduct.price.INR;
		// premiumExclVat = totalPremium * 0.82; // Calculate premium excluding VAT by taking 82% of price
		// vat = totalPremium * 0.18; // Calculate VAT by taking 18% of price
		// premiumExclVat = foundProduct.priceExclVat.INR;
		// vat = foundProduct.vat.INR;
		//if addons are provided, add their price to premiums
		if (addOns && addOns.length > 0) {
			const foundAddOns = await AddOn.find({
				_id: { $in: addOns.map((addOn) => new ObjectId(addOn)) },
			}).toArray();
			//some add on is not valid
			if (foundAddOns.length != addOns.length)
				return res.status(400).json({ msg: 'Incorrect add on(s) provided.' });

			totalPremium += getAddOnPrice({
				premium: totalPremium,
				addOns: foundAddOns,
			});

			// vat = premiumExclVat * 0.18; // Assuming VAT is 18%

			// totalPremium = premiumExclVat + vat;
		}

		// update balance for indirect only
		let deductionResponse;
		deductionResponse = await getCmsUpdatedBalance({
			agencyId,
			totalPremium,
			// premiumExclVat,
		});
		if (deductionResponse.error)
			return res.status(402).json({ msg: deductionResponse.error });

		let generatedPolicyNumber = await cmsGeneratePolicyNumber({
			agencyId,
			productCode: foundProduct.product.code,
		});

		const breakdown = await cmsPremiumBreakdown({
			premium: totalPremium,
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
			family: family || false,
			departureDate: moment(departureDate).toDate(),
			...(returnDate && { returnDate: moment(returnDate).toDate() }),
			priceFactor: new ObjectId(foundProduct._id),
			...(remarks && { remarks }),
			productName: foundProduct.product.name,
			totalPremium: {
				INR: totalPremium,
			},
			premiumExclVat: {
				INR: 0,
			},
			vat: {
				INR: 0,
			},
			netPremium: {
				INR: breakdown?.netPremium?.value || 0,
			},
			breakdown: {
				cvn: breakdown.cvn,
				cms: breakdown.cms,
				agency: breakdown.agency,
				RI_Broker: breakdown.RI_Broker,
				cope: breakdown.cope,
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
		const agencyValues = deductionResponse.updatedValues.agency;

		const updateAgency = await CmsAgency.findOneAndUpdate(
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
			}/api/cms/reports/create-cms-report?policy=${insertedPolicy.insertedId}`,
			{
				method: 'POST',
			}
		);
		const addReportResponse = await addReport.json();

		const coiLink = encodeURI(
			`${baseUrl}/api/cms/policy/coi/${insertedPolicy.insertedId}`
		);
		const invoiceLink = encodeURI(
			`${baseUrl}/api/cms/policy/invoice/${insertedPolicy.insertedId}`
		);
		const receiptLink = encodeURI(
			`${baseUrl}/api/cms/policy/receipt/${insertedPolicy.insertedId}`
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
			`${process.cwd()}/templates/cms/CmsPolicyCreationEmail.html`,
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
			CMS_HowtoClaim,
			coiLink,
			invoiceLink,
			receiptLink,
			termsAndConditionsLink,
		};
		const html = template(replacements);
		const { error } = await sendEmail({
			to: [...new Set(passengers.map((p) => p.email))],
			// cc: ['contact@covernomads.com'],
			subject: `Your Travel Insurance Confirmation - No. ${createdPolicy.number}`,
			text: `You're covered!`,
			html,
		});
		if (error) {
			console.log(
				'Error sending email on create policy:',
				JSON.stringify(error)
			);
		}
		return;
	} catch (error) {
		console.log('error', error);
		console.log('Error creating policy:', JSON.stringify(error));
	}
};

// @desc    Returns policies
// @route   POST /api/policies/:page
// @access  PRIVATE - SUPER, STANDARD / WHOLESELLER, ADMIN
const getPolicies = async (req, res) => {
	const baseUrl = 'https://' + req.get('host');

	const page = parseInt(req.params.page);

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
		agencyId,
		role,
		type,
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
	//generate lookup pipeline
	const lookupPipeline = [
		{
			$lookup: {
				from: 'cmsAgency',
				localField: 'agency',
				foreignField: '_id',
				as: 'cmsAgency',
			},
		},
		{ $addFields: { cmsAgency: { $arrayElemAt: ['$cmsAgency', 0] } } },

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
		{ $addFields: { policyHolder: '$passengers' } },
	];
	//generate query pipeline
	const queryPipeline = [
		{
			$match: {
				...(role && { 'cmsAgency.role': role }),

				...(type && {
					'cmsAgency.type': type,
				}),
				...(agencyId && {
					agency: new ObjectId(agencyId),
				}),
				...(createdBy._id && {
					'createdBy._id': new ObjectId(createdBy),
				}),

				'product.insurer': new ObjectId('67c05823c70d834e1335dadc'),

				...(status && { status }),
				...(productCode && { 'product.code': productCode }),
				...(number && {
					number: new RegExp(number, 'i'),
				}),
				...(returnTrip != null && { returnTrip: returnTrip == 'true' }),
				...(from && { from }),
				...(to && { to }),
				...(leadFirstName && {
					'policyHolder.firstName': new RegExp(leadFirstName, 'i'),
				}),
				...(leadLastName && {
					'policyHolder.lastName': new RegExp(leadLastName, 'i'),
				}),
				...((bookingDateFrom || bookingDateTo) && {
					createdAt: {
						...(bookingDateFrom && { $gte: bookingDateRange.start }),
						...(bookingDateTo && { $lte: bookingDateRange.end }),
					},
				}),
				...((departureDateFrom || departureDateTo) && {
					departureDate: {
						...(departureDateFrom && { $gte: departureDateRange.start }),
						...(departureDateTo && { $lte: departureDateRange.end }),
					},
				}),
			},
		},
	];

	//count total number of docs that fit query
	const policyCount = await Policy.aggregate([
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
				totalPolicies: '$count',
			},
		},
	]).toArray();

	//calculate pagination vars
	const totalPolicies = policyCount.pop()?.totalPolicies || 0;
	const totalPages = Math.ceil(totalPolicies / PAGE_SIZE);
	const nextPage = page + 1 >= totalPages ? null : page + 1;
	const prevPage = page - 1 < 0 ? null : page - 1;

	//retrieve paginated documents
	const policies = await Policy.aggregate([
		...lookupPipeline,
		...queryPipeline,

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
								then: `${process.env.PARTNERS_BASE_URL}/api/cms/policy/coi/`,
								else: `${baseUrl}/api/cms/policy/coi/`,
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
								then: `${process.env.PARTNERS_BASE_URL}/api/cms/policy/invoice/`,
								else: `${baseUrl}/api/cms/policy/invoice/`,
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
								then: `${process.env.PARTNERS_BASE_URL}/api/cms/policy/receipt/`,
								else: `${baseUrl}/api/cms/policy/receipt/`,
							},
						},
						{ $toString: '$_id' },
					],
				},
			},
		},
		{ $sort: { createdAt: -1 } },
		{ $skip: skip },
		{ $limit: PAGE_SIZE },
	]).toArray();

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
const getPolicyCmsCoi = async (req, res) => {
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
				from: 'cmsAgency',
				localField: 'agency',
				foreignField: '_id',
				as: 'cmsAgency',
			},
		},
		{ $addFields: { cmsAgency: { $arrayElemAt: ['$cmsAgency', 0] } } },

		{ $addFields: { cmsAdmin: { $arrayElemAt: ['$cmsAdmin', 0] } } },
		{
			$lookup: {
				from: 'insurers',
				localField: 'cmsAgency.insurer',
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
		`${baseUrl}/api/cms/policy/verify/${foundPolicy._id}`
	);
	const addOnsArray = foundPolicy.addOns;
	const pdfBuffer = await generateCmsCoi({
		insurerCode: foundPolicy?.insurer?.code || '',
		data: {
			policyQr: qrCodeBuffer,
			policyType: `Travel Insurance - ${foundPolicy?.product?.name || ''}`,
			productCode: `${foundPolicy?.product?.code}`,
			addOns: addOnsArray,
			policyNumber: foundPolicy.number,
			status: foundPolicy.status,
			totalPremium: foundPolicy.totalPremium,
			agencyCode: foundPolicy?.cmsAgency?.code || '',
			issuedBy:
				`${foundPolicy?.createdBy?.firstName} ${foundPolicy?.createdBy?.lastName}` ||
				'',
			issueDate: moment(foundPolicy.createdAt).format('DD/MM/YYYY'),
			returnTrip: foundPolicy.returnTrip,
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
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', 'attachment; filename=certificate.pdf');
	return res.send(Buffer.from(pdfBuffer));
};

// @desc    Return tax invoice pdf file
// @route   GET /api/policies/invoice/:policyId
// @access  PUBLIC
const getPolicyCmsInvoice = async (req, res) => {
	const { policyId } = req.params;

	const [foundPolicy] = await Policy.aggregate([
		{
			$match: {
				_id: new ObjectId(policyId),
			},
		},
		{
			$lookup: {
				from: 'cmsAgency',
				localField: 'agency',
				foreignField: '_id',
				as: 'cmsAgency',
			},
		},
		{ $addFields: { cmsAgency: { $arrayElemAt: ['$cmsAgency', 0] } } },

		{
			$lookup: {
				from: 'insurers',
				localField: 'cmsAgency.insurer',
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

	const pdfBuffer = await generateCmsInvoice({
		insurerCode: foundPolicy?.insurer?.code | '',
		data: {
			policyNumber: foundPolicy.number,
			status: foundPolicy.status,
			issueDate: moment(foundPolicy.createdAt).format('DD/MM/YYYY'),
			expiryDate: moment(foundPolicy.expiresAt).format('DD/MM/YYYY'),
			policyHolder: {
				...foundPolicy.passengers[0],
				dob: moment(foundPolicy.passengers[0]?.dob).format('DD/MM/YYYY'),
			},
			productName: foundPolicy.product.name,
			unitPremium: roundToTwoDecimals(
				foundPolicy.totalPremium.INR - foundPolicy.vat.INR
			),
			totalPremium: roundToTwoDecimals(foundPolicy.totalPremium.INR),
			totalVat: roundToTwoDecimals(foundPolicy.vat.INR),
			taxRate: '18%',
		},
	});
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
	return res.send(Buffer.from(pdfBuffer));
};

// @desc    Return receipt pdf file
// @route   GET /api/policies/receipt/:policyId
// @access  PUBLIC
const getPolicyCmsReceipt = async (req, res) => {
	const { policyId } = req.params;

	const [foundPolicy] = await Policy.aggregate([
		{
			$match: {
				_id: new ObjectId(policyId),
			},
		},
		{
			$lookup: {
				from: 'cmsAgency',
				localField: 'agency',
				foreignField: '_id',
				as: 'cmsAgency',
			},
		},
		{ $addFields: { cmsAgency: { $arrayElemAt: ['$cmsAgency', 0] } } },

		{
			$lookup: {
				from: 'insurers',
				localField: 'cmsAgency.insurer',
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

	const pdfBuffer = await generateCmsReceipt({
		insurerCode: foundPolicy?.insurer?.code || '',
		data: {
			policyNumber: foundPolicy.number,
			status: foundPolicy.status,
			policyHolder: {
				...foundPolicy.passengers[0],
				dob: moment(foundPolicy.passengers[0]?.dob).format('DD/MM/YYYY'),
			},
			issueDate: moment(foundPolicy.createdAt).format('DD/MM/YYYY'),
			totalPremium: roundToTwoDecimals(foundPolicy.totalPremium.INR),
		},
	});
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', 'attachment; filename=receipt.pdf');
	return res.send(Buffer.from(pdfBuffer));
};

// @desc   Verifies COI policy
// @route   GET /api/policies/verify/:policyId
// @access  PUBLIC
const verifyCmsPolicyCoi = async (req, res) => {
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

	const source = fs.readFileSync(
		`${process.cwd()}/templates/cms/CmsPolicyVerification.html`,
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
		logo: 'https://storage.googleapis.com/coi_templates/cms_portal/CMS%20Brand%20Logo.png',
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
		coverage: foundPolicy.to === 'IND' ? 'IND' : foundPolicy.coverage.name,
		duration: foundPolicy.priceFactor.duration.max,
	};
	const html = template(replacements);

	return res.send(html);
};

// @desc   	Updates a policy
// @route   PATCH /api/policies/:policyId
// @access  PRIVATE - SUPER, STANDARD
const updateCmsPolicy = async (req, res) => {
	const { policyId } = req.params;
	const {
		departureDate,
		returnDate,
		gender,
		nationality,
		passportNumber,
		dob,
		passengerId,
		policyHolderFirstName,
		policyHolderLastName,
	} = req.body;

	const foundPolicy = await Policy.findOne({
		_id: new ObjectId(policyId),
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
const emailCmsPolicy = async (req, res) => {
	const baseUrl = 'https://' + req.get('host');
	const partnerbaseUrl = process.env.PARTNERS_BASE_URL;
	const { policyId } = req.params;
	const { email } = req.body;
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
	if (foundPolicy.status === 'cancelled') {
		//construct and send email
		const source = fs.readFileSync(
			`${process.cwd()}/templates/cms/CmsCancelPolicyConfirmEmail.html`,
			'utf8'
		);
		const template = compile(source);
		const replacements = {
			firstName: foundPolicy?.passengers[0]?.firstName || '',
			lastName: foundPolicy?.passengers[0]?.lastName || '',
			policyNumber: foundPolicy.number,
			coiLink: `${partner ? partnerbaseUrl : baseUrl}/api/cms/policy/coi/${
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

	const coiLink = `${partner ? partnerbaseUrl : baseUrl}/api/cms/policy/coi/${
		foundPolicy._id
	}`;
	const invoiceLink = `${
		partner ? partnerbaseUrl : baseUrl
	}/api/cms/policy/invoice/${foundPolicy._id}`;
	const receiptLink = `${
		partner ? partnerbaseUrl : baseUrl
	}/api/cms/policy/receipt/${foundPolicy._id}`;
	const termsAndConditionsLink = foundPolicy.product.termsAndConditions;
	//construct and send email
	const source = fs.readFileSync(
		`${process.cwd()}/templates/cms/CmsPolicyCreationEmail.html`,
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
		CMS_HowtoClaim,
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
const policyTicketCms = async (req, res) => {
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
			console.log('error ticket send mail', JSON.stringify(error));
			return res.status(500).json({
				msg: 'Something went wrong while sending email.',
				details: error,
			});
		}
		return res.status(200).json({ msg: 'Ticket raised successfully.' });
	} catch (error) {
		console.log('Error in policyTicket:', JSON.stringify(error));
	}
};

// @desc   	Cancel policy based on some rules
// @route   POST /api/policies/update-policy-status
// @access  ADMIN
const updateCmsPolicyStatus = async (req, res) => {
	const baseUrl =
		req.get('host') === 'localhost:4000'
			? 'http://' + req.get('host')
			: 'https://' + req.get('host');
	try {
		const { cancellation, status, policyId, type } = req.body;
		const foundPolicy = await Policy.findOne({
			_id: new ObjectId(policyId),
		});

		if (!foundPolicy) {
			return res.status(404).json({ msg: 'Policy not found.' });
		}

		if (!foundPolicy.partner) {
			const foundAgency = await CmsAgency.findOne({
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
					await refundCmsDeductions({
						agencyId: foundPolicy?.agency,
						deduction: foundPolicy?.deduction,
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
								'totalPremium.INR': 0,
								'premiumExclVat.INR': 0,
								'vat.INR': 0,
								'netPremium.INR': 0,
								'breakdown.cvn.value': 0,
								'breakdown.RI_Broker.value': 0,
								'breakdown.agency.value': 0,
								'breakdown.cope.value': 0,
							},
						}
					);

					await Report.updateOne(
						{ 'policy._id': new ObjectId(policyId) },
						{
							$set: {
								'policy.cancellation': cancellation,
								'policy.status': status,
								'policy.totalPremium.INR': 0,
								'policy.premiumExclVat.INR': 0,
								'policy.vat.INR': 0,
								'policy.netPremium.INR': 0,
								'policy.breakdown.cvn.value': 0,
								'policy.breakdown.RI_Broker.value': 0,
								'policy.breakdown.agency.value': 0,
								'policy.breakdown.cope.value': 0,
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
								'totalPremium.INR': 0,
								'premiumExclVat.INR': 0,
								'vat.INR': 0,
								'netPremium.INR': 0,
								'breakdown.cms.value': 0,
								'breakdown.cvn.value': 0,
								'breakdown.RI_Broker.value': 0,
								'breakdown.agency.value': 0,
								'breakdown.cope.value': 0,
							},
						}
					);
					await Report.updateOne(
						{ 'policy._id': new ObjectId(policyId) },
						{
							$set: {
								'policy.cancellation': cancellation,
								'policy.status': status,
								'policy.totalPremium.INR': 0,
								'policy.premiumExclVat.INR': 0,
								'policy.vat.INR': 0,
								'policy.netPremium.INR': 0,
								'policy.breakdown.cvn.value': 0,
								'policy.breakdown.RI_Broker.value': 0,
								'policy.breakdown.agency.value': 0,
								'policy.breakdown.cope.value': 0,
							},
						}
					);
				}
				// //construct and send email
				const source = fs.readFileSync(
					`${process.cwd()}/templates/cms/CmsCancelPolicyConfirmEmail.html`,
					'utf8'
				);
				const template = compile(source);
				const replacements = {
					firstName: foundUser.firstName || '',
					lastName: foundUser.lastName || '',
					policyNumber: foundPolicy.number,
					coiLink: `${baseUrl}/api/cms/policy/coi/${foundPolicy._id}`,
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
						'totalPremium.INR': 0,
						'premiumExclVat.INR': 0,
						'vat.INR': 0,
						'netPremium.INR': 0,
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
						'policy.totalPremium.INR': 0,
						'policy.premiumExclVat.INR': 0,
						'policy.vat.INR': 0,
						'policy.netPremium.INR': 0,
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
	createPolicy,
	getPolicies,
	getPolicyCmsCoi,
	getPolicyCmsInvoice,
	getPolicyCmsReceipt,
	verifyCmsPolicyCoi,
	updateCmsPolicy,
	emailCmsPolicy,
	policyTicketCms,
	updateCmsPolicyStatus,
	setInitalAmendValues,
	premiumFix,
	getAllCmsPolicyProducts,
};
