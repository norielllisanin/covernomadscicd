const { getCollection } = require('../db');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
	formatIds,
	roundToThreeDecimals,
	generateRandomNumber,
} = require('../utils');
const momentTz = require('moment-timezone');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const Wholeseller = getCollection('wholesellers');
const WholesellerAdmin = getCollection('wholesellerAdmins');
const CvnAdmin = getCollection('cvnAdmins');
const Policy = getCollection('policies');
const XLSX = require('xlsx');
const {
	addPassangerNoInPolicyNumber,
} = require('../helpers/generatePolicyNumber');
const { sendEmail } = require('../services/emailingService.js');
const fs = require('fs');
const { compile } = require('handlebars');

// @desc    Logs in a CVN admin
// @route   POST /api/cvn-admins/log-in
// @access  PUBLIC
const logInCvnAdmin = async (req, res) => {
	const { username, password, cvn, admin } = req.body;

	const cvnAdmin = await CvnAdmin.findOne({ username });

	//no cvnAdmin found
	if (!cvnAdmin)
		return res
			.status(400)
			.send({ msg: 'No cvn admin found with this username.' });

	//cvnAdmin in active
	if (!cvnAdmin.isActive)
		return res.status(400).send({
			msg: 'Your account has been de-activated. Please contact your admin.',
		});

	//incorrect password
	const isMatch = await bcrypt.compare(password, cvnAdmin.password);
	if (!isMatch) return res.status(400).send({ msg: 'Incorrect password.' });

	if (cvn !== cvnAdmin.cvn) {
		return res.status(400).send({ msg: 'please select the correct role' });
	}
	if (admin !== cvnAdmin.admin) {
		return res.status(400).send({ msg: 'please select the correct role' });
	}

	//all good;
	const constructedUser = {
		cvnAdminId: cvnAdmin._id,
		firstName: cvnAdmin.firstName,
		lastName: cvnAdmin.lastName,
		username: cvnAdmin.username,
		email: cvnAdmin.email,
	};

	const accessToken = jwt.sign(constructedUser, process.env.JWT_SECRET, {
		expiresIn: '24h',
	});

	return res.status(200).json({
		accessToken: accessToken,
		cvnAdmin: constructedUser,
	});
};

const getCurrentCVNAdmin = async (req, res) => {
	const [admin] = await CvnAdmin.aggregate([
		{ $match: { _id: new ObjectId(req.cvnAdmin.cvnAdminId) } },
		{
			$lookup: {
				from: 'cvnAdmins',
				localField: 'cvnAdmin',
				foreignField: '_id',
				as: 'cvnAdmin',
			},
		},
		{ $addFields: { cvnAdmin: { $arrayElemAt: ['$cvnAdmin', 0] } } },
		{ $unset: ['password'] },
		{ $limit: 1 },
	]).toArray();
	if (!admin) return res.status(404).json({ msg: 'User not found.' });

	return res.status(200).json({
		cvnAdmin: formatIds(admin, 'cvnAdmin'),
		// user: req.wholesellerAdmin,
	});
};

// @desc    Updates the Admin profile
// @route   POST /api/cvn-admins/update-profile
// @access  ADMIN
const updateProfile = async (req, res) => {
	const { firstName, lastName, email } = req.body;

	const foundAdmin = await CvnAdmin.findOne({
		_id: new ObjectId(req.cvnAdmin.cvnAdminId),
	});
	if (!foundAdmin) return res.status(404).json({ msg: 'User not found.' });

	const foundAdminWithSameEmail = await CvnAdmin.findOne({
		email: email,
		_id: { $ne: foundAdmin._id },
	});
	if (foundAdminWithSameEmail)
		return res.status(409).json({ msg: 'Email already exists.' });

	await CvnAdmin.updateOne(
		{ _id: foundAdmin._id },
		{ $set: { firstName, lastName, email } }
	);
	return res.status(200).send({ msg: 'Profile updated.' });
};
// @desc    Get All Wholesalers
// @route   GET /api/cvn-admins/wholesellers
// @access  ADMIN
const getAllWholeSellers = async (req, res) => {
	const wholeSalerAdmins = await WholesellerAdmin.aggregate([
		{
			$lookup: {
				from: 'wholesellers',
				localField: 'wholeseller',
				foreignField: '_id',
				as: 'wholeseller',
			},
		},
		{
			$unwind: '$wholeseller',
		},
	])
		.sort({ name: 1 })
		.toArray();
	const wholesellers = await Wholeseller.find({}).sort({ name: 1 }).toArray();
	return res.status(200).json({ wholeSalerAdmins, wholesellers });
};

// @desc    Generate Sales Statment
// @route   GET /api/cvn-admins/sales-statement
// @access  ADMIN
const salesStatement = async (req, res) => {
	const {
		startDate,
		endDate,
		timezone,
		agencyId,
		wholesellerId,
		partners,
		adminReportTwo,
	} = req.query;
	const isPartners = partners === 'partners';
	const isSuccessInsurance = partners === 'success_insurance';
	const isAmh = partners === 'amh';
	const isIho = partners === 'iho';
	// Determine wholeseller ID based on partner type
	const resolvedWholesellerId = wholesellerId;
	const dateRange = {
		start: momentTz.tz(startDate, timezone).startOf('day').toDate(),
		end: momentTz.tz(endDate, timezone).endOf('day').toDate(),
	};
	let query;
	if (isPartners) {
		query = [
			{
				$match: {
					partner: new ObjectId('665714e1dacf8e59ec947e46'),
					createdAt: {
						$gte: dateRange.start,
						$lte: dateRange.end,
					},
				},
			},
			// {
			// 	$lookup: {
			// 		from: 'partners',
			// 		localField: 'partner',
			// 		foreignField: '_id',
			// 		as: 'partnerDetails',
			// 	},
			// },
			// {
			// 	$unwind: '$partnerDetails',
			// },
			// {
			// 	$lookup: {
			// 		from: 'users',
			// 		localField: 'createdBy',
			// 		foreignField: '_id',
			// 		as: 'createdBy',
			// 	},
			// },
			// { $addFields: { createdBy: { $arrayElemAt: ['$createdBy', 0] } } },
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
		query = [];

		// Lookup wholeseller details if needed
		if (isSuccessInsurance || resolvedWholesellerId) {
			query.push(
				{
					$lookup: {
						from: 'wholesellers',
						localField: 'agencyDetails.wholeseller',
						foreignField: '_id',
						as: 'wholesellerDetails',
					},
				},
				{ $unwind: '$wholesellerDetails' }
			);
		}

		// Apply wholeseller filter if isSuccessInsurance
		if (isSuccessInsurance) {
			query.push({
				$match: { 'wholesellerDetails.code': 'ESA' },
			});
		}

		// Match policies within the date range and agency if provided
		query.push({
			$match: {
				...(agencyId ? { agency: new ObjectId(agencyId) } : {}),
				createdAt: {
					$gte: dateRange.start,
					$lte: dateRange.end,
				},
			},
		});

		// Lookup agencies and unwind
		query.push(
			{
				$lookup: {
					from: 'agencies',
					localField: 'agency',
					foreignField: '_id',
					as: 'agencyDetails',
				},
			},
			{ $unwind: '$agencyDetails' }
		);

		// Apply additional filtering based on conditions
		if (isAmh) {
			query.push({ $match: { 'agencyDetails.code': 'AMHT' } });
		}

		if (isIho) {
			query.push({ $match: { 'agencyDetails.broker': { $exists: true } } });
		} else {
			query.push({
				$match: {
					'agencyDetails.wholeseller': { $exists: true, $ne: null },
					$or: [
						{ 'agencyDetails.broker': { $exists: false } },
						{ 'agencyDetails.broker': null },
					],
				},
			});
		}

		// If no agencyId, ensure agencies are looked up again and filter by wholeseller
		if (!agencyId) {
			query.push(
				...(resolvedWholesellerId
					? [
							{
								$match: {
									'agencyDetails.wholeseller': new ObjectId(
										resolvedWholesellerId
									),
								},
							},
					  ]
					: [])
			);
		}

		// Lookups and transformations for user, price factor, products, and passengers
		query.push(
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
			{
				$lookup: {
					from: 'addOns',
					localField: 'addOns',
					foreignField: '_id',
					as: 'addOns',
				},
			}
		);
	}
	const foundPolicies = await Policy.aggregate(query)
		.maxTimeMS(3600000)
		.toArray();
	const policiesToWrite = foundPolicies.length == 0 ? [null] : foundPolicies;
	let dataToWrite;
	if (!adminReportTwo) {
		dataToWrite = policiesToWrite.map((policy) => {
			const passengers = policy?.passengers;
			const namesString = passengers
				?.map((pax, index) => `${pax.firstName} ${pax.lastName}`) // Extract and format the names
				.join(', '); // Join them with commas
			const basePremium = roundToThreeDecimals(
				policy?.totalPremium?.AED / 1.05
			);
			const vat = roundToThreeDecimals(basePremium * 0.05);
			return {
				Channel: policy && 'B2B',
				'Agency Name': isPartners ? 'MMT' : policy && policy.agencyDetails.name,
				'Booked By': isPartners
					? 'Make My Trip'
					: policy &&
					  `${policy?.createdBy?.firstName} ${policy?.createdBy?.lastName}`,
				'Booking Date':
					policy && moment(policy?.createdAt).format('DD-MM-YYYY'),
				'Certificate No.': policy && policy?.number,
				'Plan Type': policy && `Travel Insurance ${policy?.productName}`,
				Passengers: `${namesString}`,
				'Number of Insureds': 1,
				Gender: policy && policy?.policyHolder?.gender,
				'Date of Birth':
					policy && moment(policy?.policyHolder?.dob).format('DD-MM-YYYY'),
				'Pax Type':
					isPartners || isIho
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
				...(isPartners
					? {}
					: { 'Pax No': policy && policy?.passengers?.length }),
				...(isPartners
					? {}
					: { 'Policy Type': policy && policy?.product?.type }),
				...(isPartners ? {} : { Currency: policy && 'AED' }),
				...(isPartners
					? {
							'Rate Applied': `${policy?.priceFactor?.duration?.max} days`,
					  }
					: {}),
				'Gross Premium':
					policy && roundToThreeDecimals(policy?.totalPremium?.AED, 3),
				...(isPartners
					? {
							'Base Rate with Loadings':
								policy?.status === 'cancelled' ? 0 : basePremium,
					  }
					: {}),
				...(isPartners
					? {}
					: {
							'Base Premium':
								policy && roundToThreeDecimals(policy?.premiumExclVat?.AED, 3),
					  }),
				...(isPartners
					? {
							'VAT Amount': policy?.status === 'cancelled' ? 0 : vat,
					  }
					: {}),
				...(isPartners
					? {}
					: {
							'VAT Amount':
								policy &&
								roundToThreeDecimals(
									roundToThreeDecimals(policy?.vat?.AED, 3),
									3
								),
					  }),
				...(isPartners
					? {
							'Gross Agreement Rates':
								policy?.status === 'cancelled'
									? 0
									: roundToThreeDecimals(policy?.unloaded?.totalPremium?.AED),
					  }
					: {}),
				...(isPartners
					? {
							'Base Agreement Rates':
								policy?.status === 'cancelled'
									? 0
									: roundToThreeDecimals(
											roundToThreeDecimals(
												policy?.unloaded?.totalPremium?.AED
											) / 1.05
									  ),
					  }
					: {}),

				...(isPartners
					? {
							'Marketing Fee on Agreement Rates':
								policy?.status === 'cancelled'
									? 0
									: roundToThreeDecimals(
											roundToThreeDecimals(
												roundToThreeDecimals(
													policy?.unloaded?.totalPremium?.AED
												) / 1.05
											) * 0.7
									  ),
					  }
					: {}),
				...(isPartners
					? {}
					: isIho
					? {
							'Marketing fee': roundToThreeDecimals(
								0.7 * roundToThreeDecimals(policy?.premiumExclVat?.AED),
								3
							),
					  }
					: {
							'Marketing fee':
								policy &&
								roundToThreeDecimals(policy?.breakdown?.agency?.value, 3),
					  }),

				...(isPartners
					? {
							'Extra Margin After VAT':
								policy?.status === 'cancelled'
									? 0
									: roundToThreeDecimals(
											roundToThreeDecimals(policy?.totalPremium?.AED) -
												(vat +
													roundToThreeDecimals(
														roundToThreeDecimals(
															policy?.unloaded?.totalPremium?.AED
														)
													))
									  ),
					  }
					: {}),
				...(isPartners
					? {
							'Total Marketing Fee after VAT':
								policy?.status === 'cancelled'
									? 0
									: roundToThreeDecimals(
											roundToThreeDecimals(
												roundToThreeDecimals(policy?.totalPremium?.AED) -
													(roundToThreeDecimals(
														roundToThreeDecimals(policy?.vat.AED)
													) +
														roundToThreeDecimals(
															roundToThreeDecimals(
																policy?.unloaded?.totalPremium?.AED
															)
														))
											) +
												roundToThreeDecimals(
													roundToThreeDecimals(
														policy &&
															roundToThreeDecimals(
																policy?.unloaded?.totalPremium?.AED
															) / 1.05
													) * 0.7
												)
									  ),
					  }
					: {}),
				...(isPartners
					? {
							'Net Payables':
								policy?.status === 'cancelled'
									? 0
									: roundToThreeDecimals(
											roundToThreeDecimals(policy?.totalPremium?.AED, 3) -
												roundToThreeDecimals(
													roundToThreeDecimals(
														roundToThreeDecimals(
															roundToThreeDecimals(policy?.totalPremium?.AED) -
																(vat +
																	roundToThreeDecimals(
																		policy?.unloaded?.totalPremium?.AED
																	))
														) +
															roundToThreeDecimals(
																roundToThreeDecimals(
																	roundToThreeDecimals(
																		policy?.unloaded?.totalPremium?.AED
																	) / 1.05
																) * 0.7
															)
													)
												)
									  ),
					  }
					: {}),
				...(isPartners
					? {}
					: isIho
					? {
							'NET Premium':
								roundToThreeDecimals(policy?.premiumExclVat?.AED, 3) -
								roundToThreeDecimals(0.7 * policy?.premiumExclVat?.AED, 3),
					  }
					: {
							'NET Premium':
								policy && roundToThreeDecimals(policy?.netPremium?.AED, 3),
					  }),

				...(isIho || isPartners
					? {}
					: {
							PSP: roundToThreeDecimals(policy?.breakdown?.psp?.value, 3),
							Wholesaler: roundToThreeDecimals(
								policy?.breakdown?.wholeseller?.value,
								3
							),
							CVN: roundToThreeDecimals(policy?.breakdown?.cvn?.value),
					  }),

				Status: policy && policy?.status,
				...(isPartners
					? {}
					: {
							'LPO/Remarks': policy && policy?.remarks ? policy.remarks : 'N/A',
					  }),
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
				'Wholesaler Fee':
					policy && `${policy?.breakdown?.wholeseller?.percentage}%`,
				Wholesaler: roundToThreeDecimals(
					policy?.breakdown?.wholeseller?.value,
					3
				),
				'Net Payable': partners
					? roundToThreeDecimals(policy?.premiumExclVat?.AED) -
					  0.7 * roundToThreeDecimals(policy?.premiumExclVat?.AED)
					: policy && roundToThreeDecimals(policy?.netPremium?.AED),
				Status: policy && policy?.status,

				'LPO/Remarks': policy && policy?.remarks ? policy.remarks : 'N/A',

				'SOA Month': 0,
				'Payment Status': 'N/A',
				'Payment Detail': 'N/A',
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

// @desc    Generate Sales Statment
// @route   GET /api/cvn-admins/sales-statement-agency
// @access  ADMIN
const salesStatementAgency = async (req, res) => {
	try {
		const { startDate, endDate, timezone, agencyId } = req.query;
		const partners = req.query.partners === 'partners';

		const successInsurance = req.query.partners === 'success_insurance';
		const amh = req.query.partners === 'amh';
		const wholesellerId = successInsurance
			? '6732ada6597915597f9d04cb'
			: amh
			? '677b9d9965ef5119179ac89e'
			: '';
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
				// {
				// 	$lookup: {
				// 		from: 'partners', // Assuming the collection name for agencies is 'agencies'
				// 		localField: 'partner', // Field in policies collection that links to agencies
				// 		foreignField: '_id', // Field in agencies collection (usually _id)
				// 		as: 'partnerDetails',
				// 	},
				// },
				// {
				// 	$unwind: '$partnerDetails',
				// },
				// {
				// 	$lookup: {
				// 		from: 'users',
				// 		localField: 'createdBy',
				// 		foreignField: '_id',
				// 		as: 'createdBy',
				// 	},
				// },
				// { $addFields: { createdBy: { $arrayElemAt: ['$createdBy', 0] } } },
				{
					$lookup: {
						from: 'priceFactors',
						localField: 'priceFactor',
						foreignField: '_id',
						pipeline: [{ $project: { product: 1, duration: 1 } }],
						as: 'priceFactor',
					},
				},
				{ $addFields: { priceFactor: { $arrayElemAt: ['$priceFactor', 0] } } },
				{
					$lookup: {
						from: 'products',
						localField: 'priceFactor.product',
						foreignField: '_id',
						pipeline: [{ $project: { type: 1 } }],
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
							...(wholesellerId
								? [
										{
											$match: {
												'agencyDetails.wholeseller': new ObjectId(
													wholesellerId
												),
											},
										},
								  ]
								: []),
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
				{
					$lookup: {
						from: 'addOns',
						localField: 'addOns',
						foreignField: '_id',
						as: 'addOns',
					},
				},
			];
		}

		const foundPolicies = await Policy.aggregate(query)
			.maxTimeMS(3600000)
			.toArray();
		let policiesToWrite;
		policiesToWrite = foundPolicies.length == 0 ? [] : foundPolicies;

		let dataToWrite = policiesToWrite?.flatMap((policy) => {
			const addOnsCodes = policy?.addOns?.map((addOn) => addOn.code) || [];
			const addOnsPremiums =
				policy?.addOns?.map((addOn) =>
					roundToThreeDecimals(policy?.totalPremium?.AED * addOn.multiplier)
				) || [];

			const passengers = policy?.passengers;
			const basePremium = roundToThreeDecimals(
				policy?.totalPremium?.AED / 1.05
			);
			const vat = roundToThreeDecimals(basePremium * 0.05);

			return passengers?.map((pax, index) => {
				return {
					Channel: policy && 'B2B',
					'Agency Name': partners
						? 'MMT'
						: amh
						? 'AMH Tourism'
						: successInsurance
						? 'Success Insurance'
						: 'Rovers Travel Solutions',
					// 'Booking Date': policy && moment(policy?.createdAt).format('DD-MM-YYYY'),
					...(partners
						? {
								'Booked By': partners
									? 'Make My Trip'
									: policy &&
									  `${policy?.createdBy?.firstName} ${policy?.createdBy?.lastName}`,
						  }
						: {
								'Booking Date':
									policy && moment(policy?.createdAt).format('DD-MM-YYYY'),
						  }),
					...(partners
						? {
								'Booking Date':
									policy && moment(policy?.createdAt).format('DD-MM-YYYY'),
						  }
						: {}),
					'Certificate No.':
						policy &&
						`${addPassangerNoInPolicyNumber({
							policy: policy?.number,
							passangerNo: index + 1,
						})} `,
					'Plan Type': policy && `Travel Insurance ${policy?.productName}`,
					Passengers: `${pax?.firstName} ${pax?.lastName}`,
					'Number of Insureds': 1,
					Gender: policy && pax?.gender,
					'Date of Birth': moment(pax?.dob).format('DD-MM-YYYY'),
					'Pax Type': partners ? 'Standard' : policy && pax?.type,
					Nationality: policy && pax?.nationality,
					'Passport No': policy && pax?.passportNumber,
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
					// 'Pax No': policy && policy?.passengers?.length,
					...(partners
						? {
								'Rate Applied': `${policy?.priceFactor?.duration?.max} days`,
						  }
						: {}),
					...(partners
						? {}
						: { 'Policy Type': policy && policy?.product?.type }),
					...(partners ? {} : { Currency: policy && 'AED' }),
					'Gross Premium':
						policy && policy?.status === 'cancelled'
							? 0
							: index === 0
							? roundToThreeDecimals(policy?.totalPremium?.AED)
							: '',
					...(partners
						? {
								'Base Rate with Loadings':
									policy?.status === 'cancelled' ? 0 : basePremium,
						  }
						: { 'Base Premium': index == 0 ? basePremium : '' }),
					'VAT Amount':
						policy?.status === 'cancelled' ? 0 : index === 0 ? vat : '',
					...(partners
						? {
								'Gross Agreement Rates':
									policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(policy?.unloaded?.totalPremium?.AED),
						  }
						: {}),
					...(partners
						? {
								'Base Agreement Rates':
									policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(
												roundToThreeDecimals(
													policy?.unloaded?.totalPremium?.AED
												) / 1.05
										  ),
						  }
						: {}),
					...(partners
						? {
								'Marketing Fee on Agreement Rates':
									policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(
												roundToThreeDecimals(
													roundToThreeDecimals(
														policy?.unloaded?.totalPremium?.AED
													) / 1.05
												) * 0.7
										  ),
						  }
						: {
								'Marketing fee':
									index === 0
										? successInsurance
											? roundToThreeDecimals(0.6 * basePremium)
											: amh
											? roundToThreeDecimals(0.65 * basePremium)
											: policy && roundToThreeDecimals(0.75 * basePremium)
										: '',
						  }),

					...(partners
						? {
								'Extra Margin After VAT':
									policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(
												roundToThreeDecimals(policy?.totalPremium?.AED) -
													(vat +
														roundToThreeDecimals(
															roundToThreeDecimals(
																policy?.unloaded?.totalPremium?.AED
															)
														))
										  ),
						  }
						: {}),
					...(partners
						? {
								'Total Marketing Fee after VAT':
									policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(
												roundToThreeDecimals(
													roundToThreeDecimals(policy?.totalPremium?.AED) -
														(roundToThreeDecimals(
															roundToThreeDecimals(policy?.vat.AED)
														) +
															roundToThreeDecimals(
																roundToThreeDecimals(
																	policy?.unloaded?.totalPremium?.AED
																)
															))
												) +
													roundToThreeDecimals(
														roundToThreeDecimals(
															policy &&
																roundToThreeDecimals(
																	policy?.unloaded?.totalPremium?.AED
																) / 1.05
														) * 0.7
													)
										  ),
						  }
						: {}),
					...(partners
						? {}
						: {
								'Add On': addOnsCodes.length > 0 ? addOnsCodes.join(',') : 'NA',
						  }),
					...(partners
						? {}
						: {
								'Fee For Add On':
									addOnsPremiums.length > 0 ? addOnsPremiums.join(',') : 'NA',
						  }),
					...(partners
						? {
								'Net Payables':
									policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(
												roundToThreeDecimals(policy?.totalPremium?.AED, 3) -
													roundToThreeDecimals(
														roundToThreeDecimals(
															roundToThreeDecimals(
																roundToThreeDecimals(
																	policy?.totalPremium?.AED
																) -
																	(vat +
																		roundToThreeDecimals(
																			policy?.unloaded?.totalPremium?.AED
																		))
															) +
																roundToThreeDecimals(
																	roundToThreeDecimals(
																		roundToThreeDecimals(
																			policy?.unloaded?.totalPremium?.AED
																		) / 1.05
																	) * 0.7
																)
														)
													)
										  ),
						  }
						: {
								'Net Payable with VAT':
									policy && index === 0
										? roundToThreeDecimals(
												policy?.totalPremium?.AED -
													roundToThreeDecimals(
														(successInsurance ? 0.6 : amh ? 0.65 : 0.75) *
															basePremium,
														3
													),
												3
										  )
										: '',
						  }),
					...(partners
						? { Status: policy && policy?.status }
						: { Status: policy && policy?.status }),
					...(partners
						? {}
						: {
								'LPO/Remarks':
									policy && policy?.remarks ? policy.remarks : 'N/A',
						  }),
				};
			});
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
	} catch (error) {
		return res
			.status(500)
			.json({ msg: `internal server error ${error}`, error: error });
	}
};

const getUserByEmail = async (req, res) => {
	const { email } = req.query;
	const user = await CvnAdmin.findOne({ email });
	if (!user) return res.status(404).json({ msg: 'CVN Admin not found.' });
	return res.status(200).json({ user: formatIds(user, 'cvnAdmin') });
};

const resetPassword = async (req, res) => {
	const { email } = req.body;
	const user = await CvnAdmin.findOne({ email: email });
	if (!user) {
		return res
			.status(400)
			.send({ msg: 'No CVN Admin found with this email.', found: false });
	}
	const source = fs.readFileSync(
		`${process.cwd()}/templates/orient/OrientOTPVerification.html`,
		'utf8'
	);

	const template = compile(source);
	let otp = generateRandomNumber(6);
	const replacements = {
		firstName: user.firstName,
		lastName: user.lastName,
		otp: otp,
		username: user.username,
	};

	const html = template(replacements);

	await CvnAdmin.updateOne({ _id: user?._id }, { $set: { otp } });
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

const updateForgottenPassword = async (req, res) => {
	const { email, newPassword, confirmPassword } = req.body;

	const user = await CvnAdmin.findOne({
		email: email,
	});

	if (!user) {
		return res.status(404).send('CVN Admin not found');
	}
	try {
		if (newPassword === confirmPassword) {
			const hashedNewPassword = await bcrypt.hash(newPassword, 6);

			await CvnAdmin.updateOne(
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

module.exports = {
	logInCvnAdmin,
	getCurrentCVNAdmin,
	updateProfile,
	getAllWholeSellers,
	salesStatement,
	salesStatementAgency,
	resetPassword,
	updateForgottenPassword,
	getUserByEmail,
};
