const { getCollection } = require('../../db');
const { ObjectId } = require('mongodb');
const { roundToThreeDecimals } = require('../../utils');
const XLSX = require('xlsx');
const Policy = getCollection('policies');
const Report = getCollection('report');
const momentTz = require('moment-timezone');
const moment = require('moment');
const {
	addPassangerNoInPolicyNumber,
} = require('../../helpers/generatePolicyNumber');

const createCmsReport = async (req, res) => {
	try {
		const { policy } = req.query;
		if (!policy) {
			return res.status(400).json({ message: 'Policy ID is required.' });
		}

		const filter = { _id: new ObjectId(policy) };

		const pipeline = [
			{ $match: filter },
			// Lookup priceFactor with product info
			{
				$lookup: {
					from: 'priceFactors',
					localField: 'priceFactor',
					foreignField: '_id',
					pipeline: [{ $project: { product: 1, duration: 1, _id: 1 } }],
					as: 'priceFactor',
				},
			},
			{ $addFields: { priceFactor: { $arrayElemAt: ['$priceFactor', 0] } } },
			// Lookup product details
			{
				$lookup: {
					from: 'products',
					localField: 'priceFactor.product',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								type: 1,
								code: 1,
								name: 1,
								_id: 1,
								benefits: 1,
								termsAndCondition: 1,
							},
						},
					],
					as: 'product',
				},
			},
			{ $addFields: { product: { $arrayElemAt: ['$product', 0] } } },
			// Lookup passengers
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
					from: 'cmsAgency',
					localField: 'agency',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								name: 1,
								code: 1,
								cmsId: 1,
								_id: 1,
								insurer: 1,
								type: 1,
								state: 1,
								city: 1,
								role: 1,
							},
						},
					],
					as: 'agencyDetails',
				},
			},
			{ $unwind: { path: '$agencyDetails', preserveNullAndEmptyArrays: true } },

			{
				$lookup: {
					from: 'users',
					localField: 'createdBy',
					foreignField: '_id',
					pipeline: [
						{ $project: { firstName: 1, lastName: 1, email: 1, _id: 1 } },
					],
					as: 'createdBy',
				},
			},
			{ $addFields: { createdBy: { $arrayElemAt: ['$createdBy', 0] } } },

			{
				$lookup: {
					from: 'addOns',
					localField: 'addOns',
					foreignField: '_id',
					pipeline: [{ $project: { name: 1, type: 1, _id: 1 } }],
					as: 'addOns',
				},
			},
		];

		const foundReport = await Policy.aggregate(pipeline)
			.maxTimeMS(3600000)
			.toArray();

		if (!foundReport.length) {
			return res
				.status(404)
				.json({ message: 'No policies found for given ID.' });
		}

		const reportsToInsert = foundReport.map((policy) => {
			const {
				product,
				createdBy,
				agencyDetails,
				passengers,
				addOns,
				...filteredPolicy
			} = policy;
			const reportObj = {
				product: policy.product
					? {
							_id: policy.product._id || '',
							code: policy.product.code || '',
							type: policy.product.type || '',
							name: policy.product.name || '',
							benefits: policy.product.benefits || [],
							termsAndCondition: policy.product.termsAndCondition || [],
					  }
					: null,

				passengers: policy.passengers || [],
				addons: policy.addOns || [],
				policy: { ...filteredPolicy },

				createdAt: new Date(),
			};

			if (policy.createdBy) {
				reportObj.user = {
					_id: policy.createdBy._id || '',
					firstName: policy.createdBy.firstName || '',
					lastName: policy.createdBy.lastName || '',
					email: policy.createdBy.email || '',
				};
			}

			if (policy.agencyDetails) {
				reportObj.agency = {
					_id: policy.agencyDetails._id || '',
					name: policy.agencyDetails.name || '',
					code: policy.agencyDetails.code || '',
					type: policy.agencyDetails.type || '',
					city: policy.agencyDetails.city || '',
					state: policy.agencyDetails.state || '',
					role: policy.agencyDetails.role || '',
					insurer: policy.agencyDetails.insurer || '',
				};
			}

			return reportObj;
		});

		const report = await Report.insertOne(reportsToInsert[0]);
		if (!report) {
			return res.send({ message: 'Report not created', report });
		}
		return res.send({ message: 'Report created successfully', report });
	} catch (error) {
		return res.status(500).json({
			msg: `Internal server error: ${error.message}`,
			error: error,
		});
	}
};

// @desc    Generate sales statement for agency
// @route   GET /api/cms/agency/sales-statement
// @access  PRIVATE - SUPER, STANDARD
const getCmsAgencySalesStatementWithType = async (req, res) => {
	// const agencyId = req.user.agency.agencyId;
	const { startDate, endDate, timezone, type, mis } = req.query;

	const isMis = mis === 'true';

	const agencyTypeData =
		type === 'direct'
			? ['call_center', 'branch']
			: ['TA', 'bank', 'corporate_client', 'broker'];

	const dateRange = {
		start: momentTz.tz(startDate, timezone).startOf('day').toDate(),
		end: momentTz.tz(endDate, timezone).endOf('day').toDate(),
	};

	const foundPolicies = await Report.find({
		$and: [
			{
				$or: agencyTypeData.map((type) => ({ 'agency.type': type })),
			},
			{
				'policy.createdAt': {
					$gte: dateRange.start,
					$lte: dateRange.end,
				},
			},
		],
	}).toArray();

	const policiesToWrite = foundPolicies.length == 0 ? [null] : foundPolicies;
	const dataToWrite = policiesToWrite.map((policy) => {
		const passengers = policy?.passengers;
		const distType =
			policy?.agency?.type === 'call_center' ||
			policy?.agency?.type === 'branch'
				? 'direct'
				: 'indirect';
		const namesString = passengers
			?.map((pax) => `${pax?.firstName} ${pax?.lastName}`) // Extract and format the names
			.join(', '); // Join them with commas
		return {
			...(isMis && policy && { Reinsurer: 'CMS' }),
			...(isMis && policy && { Contract: 'CMS' }),
			'Distributive Type': policy && distType,
			Channel: policy && policy?.agency?.type,
			// 'Booked Country': policy && 'UAE',
			'Agency Name': policy && policy?.agency?.name,
			'Booked By':
				policy && `${policy?.user?.firstName} ${policy?.user?.lastName}`,
			'Booking Date': policy && moment(policy?.createdAt).format('DD-MM-YYYY'),
			'Certificate No.': policy && policy?.policy?.number,
			'Plan Type': policy && `Travel Insurance ${policy?.policy?.productName}`,
			passengers: `${namesString}`,
			'Number of Insureds': passengers?.length,
			// 'Full Name':
			// 	policy &&
			// 	`${policy?.policyHolder?.firstName} ${policy?.policyHolder?.lastName}`,
			Gender: policy?.passengers && policy?.passengers[0]?.gender,
			'Date of Birth':
				policy?.passengers &&
				moment(policy?.passengers[0]?.dob).format('DD-MM-YYYY'),
			'Pax Type': policy?.passengers && policy?.passengers[0]?.type,
			Nationality: policy?.passengers && policy?.passengers[0]?.nationality,
			'Passport No':
				policy?.passengers && policy?.passengers[0]?.passportNumber,
			// 'Origin Country': policy && policy?.from,
			...(!isMis && { 'Destination Country': policy && policy?.policy?.to }),

			'Departure Date':
				policy && moment(policy?.policy?.departureDate)?.format('DD-MM-YYYY'),
			'Return Date': policy
				? policy?.policy?.returnDate
					? moment(policy?.policy?.returnDate).format('DD-MM-YYYY')
					: 'N/A'
				: '',
			'Travel Days': policy
				? policy?.policy?.returnTrip
					? moment(policy?.policy?.returnDate).diff(
							moment(policy?.policy?.departureDate),
							'days'
					  ) + 1
					: 1
				: '',
			'Pax No': policy && policy?.passengers?.length,
			'Policy Type': policy && policy?.product?.type,
			Currency: policy && 'INR',
			...(!isMis && {
				'Gross Premium': policy && policy?.policy?.totalPremium?.INR,
				'Base Premium':
					policy && roundToThreeDecimals(policy?.policy?.premiumExclVat?.INR),
				'GST Amount': policy && roundToThreeDecimals(policy?.policy?.vat?.INR),
				'Marketing fee':
					policy &&
					roundToThreeDecimals(policy?.policy?.breakdown?.agency?.value),
				'NET Payable': roundToThreeDecimals(
					policy?.policy?.totalPremium?.INR -
						policy?.policy?.breakdown?.agency?.value
				),
			}),
			...(isMis && {
				Base:
					policy && roundToThreeDecimals(policy?.policy?.premiumExclVat?.INR),
				'Mktg Fee':
					policy &&
					roundToThreeDecimals(policy?.policy?.breakdown?.agency?.value),
				'NET RI Premium':
					policy && roundToThreeDecimals(policy?.policy?.netPremium?.INR),
				'Net RI brokerage':
					policy &&
					roundToThreeDecimals(policy?.policy?.breakdown?.RI_Broker?.value),
				'CVN Fee':
					policy && roundToThreeDecimals(policy?.policy?.breakdown?.cvn?.value),
			}),
			Status: policy && policy?.policy?.status,
			'LPO/Remarks':
				policy && policy?.policy?.remarks ? policy?.policy?.remarks : 'N/A',
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
const getAllCmsAgencySalesStatement = async (req, res) => {
	// const agencyId = req.user.agency.agencyId;
	const { startDate, endDate, timezone, mis } = req.query;
	const isMis = mis === 'true';

	const dateRange = {
		start: momentTz.tz(startDate, timezone).startOf('day').toDate(),
		end: momentTz.tz(endDate, timezone).endOf('day').toDate(),
	};

	const foundPolicies = await Report.find({
		'agency.insurer': new ObjectId('67c05823c70d834e1335dadc'),
		'policy.createdAt': {
			$gte: dateRange.start,
			$lte: dateRange.end,
		},
	}).toArray();
	const policiesToWrite = foundPolicies.length == 0 ? [null] : foundPolicies;
	const dataToWrite = policiesToWrite.map((policy) => {
		const passengers = policy?.passengers;
		const distType =
			policy?.agency?.type === 'call_center' ||
			policy?.agency?.type === 'branch'
				? 'direct'
				: 'indirect';
		const namesString = passengers
			?.map((pax) => `${pax?.firstName} ${pax?.lastName}`) // Extract and format the names
			.join(', '); // Join them with commas
		return {
			...(isMis && policy && { Reinsurer: 'CMS' }),
			...(isMis && policy && { Contract: 'CMS' }),
			'Distributive Type': policy && distType,
			Channel: policy && policy?.agency?.type,
			// 'Booked Country': policy && 'UAE',
			'Agency Name': policy && policy?.agency?.name,
			'Booked By':
				policy && `${policy?.user?.firstName} ${policy?.user?.lastName}`,
			'Booking Date': policy && moment(policy?.createdAt).format('DD-MM-YYYY'),
			'Certificate No.': policy && policy?.policy?.number,
			'Plan Type': policy && `Travel Insurance ${policy?.policy?.productName}`,
			passengers: `${namesString}`,
			'Number of Insureds': passengers?.length,
			// 'Full Name':
			// 	policy &&
			// 	`${policy?.policyHolder?.firstName} ${policy?.policyHolder?.lastName}`,
			Gender: policy?.passengers && policy?.passengers[0]?.gender,
			'Date of Birth':
				policy?.passengers &&
				moment(policy?.passengers[0]?.dob).format('DD-MM-YYYY'),
			'Pax Type': policy?.passengers && policy?.passengers[0]?.type,
			Nationality: policy?.passengers && policy?.passengers[0]?.nationality,
			'Passport No':
				policy?.passengers && policy?.passengers[0]?.passportNumber,
			// 'Origin Country': policy && policy?.from,
			...(!isMis && { 'Destination Country': policy && policy?.policy?.to }),

			'Departure Date':
				policy && moment(policy?.policy?.departureDate)?.format('DD-MM-YYYY'),
			'Return Date': policy
				? policy?.policy?.returnDate
					? moment(policy?.policy?.returnDate).format('DD-MM-YYYY')
					: 'N/A'
				: '',
			'Travel Days': policy
				? policy?.policy?.returnTrip
					? moment(policy?.policy?.returnDate).diff(
							moment(policy?.policy?.departureDate),
							'days'
					  ) + 1
					: 1
				: '',
			'Pax No': policy && policy?.passengers?.length,
			'Policy Type': policy && policy?.product?.type,
			Currency: policy && 'INR',
			...(!isMis && {
				'Gross Premium': policy && policy?.policy?.totalPremium?.INR,
				'Base Premium':
					policy && roundToThreeDecimals(policy?.policy?.premiumExclVat?.INR),
				'GST Amount': policy && roundToThreeDecimals(policy?.policy?.vat?.INR),
				'Marketing fee':
					policy &&
					roundToThreeDecimals(policy?.policy?.breakdown?.agency?.value),
				'NET Payable': roundToThreeDecimals(
					policy?.policy?.totalPremium?.INR -
						policy?.policy?.breakdown?.agency?.value
				),
			}),
			...(isMis && {
				Base:
					policy && roundToThreeDecimals(policy?.policy?.premiumExclVat?.INR),
				'Mktg Fee':
					policy &&
					roundToThreeDecimals(policy?.policy?.breakdown?.agency?.value),
				'NET RI Premium':
					policy && roundToThreeDecimals(policy?.policy?.netPremium?.INR),
				'Net RI brokerage':
					policy &&
					roundToThreeDecimals(policy?.policy?.breakdown?.RI_Broker?.value),
				'CVN Fee':
					policy && roundToThreeDecimals(policy?.policy?.breakdown?.cvn?.value),
			}),
			Status: policy && policy?.policy?.status,
			'LPO/Remarks':
				policy && policy?.policy?.remarks ? policy?.policy?.remarks : 'N/A',
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

// @desc    Generate sales statement for agency
// @route   GET /api/cms/agency/sales-statement
// @access  PRIVATE - SUPER, STANDARD
const getCmsAgencySalesStatement = async (req, res) => {
	// const agencyId = req.user.agency.agencyId;
	const { startDate, endDate, timezone, agencyId, mis } = req.query;

	const isMis = mis === 'true';

	const dateRange = {
		start: momentTz.tz(startDate, timezone).startOf('day').toDate(),
		end: momentTz.tz(endDate, timezone).endOf('day').toDate(),
	};

	const foundPolicies = await Report.find({
		'agency._id': new ObjectId(agencyId),
		'policy.createdAt': {
			$gte: dateRange.start,
			$lte: dateRange.end,
		},
	}).toArray();

	const policiesToWrite = foundPolicies.length == 0 ? [null] : foundPolicies;
	const dataToWrite = policiesToWrite.map((policy) => {
		const passengers = policy?.passengers;
		const distType =
			policy?.agency?.type === 'call_center' ||
			policy?.agency?.type === 'branch'
				? 'direct'
				: 'indirect';
		const namesString = passengers
			?.map((pax) => `${pax?.firstName} ${pax?.lastName}`) // Extract and format the names
			.join(', '); // Join them with commas
		return {
			...(isMis && policy && { Reinsurer: 'CMS' }),
			...(isMis && policy && { Contract: 'CMS' }),
			'Distributive Type': policy && distType,
			Channel: policy && policy?.agency?.type,
			// 'Booked Country': policy && 'UAE',
			'Agency Name': policy && policy?.agency?.name,
			'Booked By':
				policy && `${policy?.user?.firstName} ${policy?.user?.lastName}`,
			'Booking Date': policy && moment(policy?.createdAt).format('DD-MM-YYYY'),
			'Certificate No.': policy && policy?.policy?.number,
			'Plan Type': policy && `Travel Insurance ${policy?.policy?.productName}`,
			passengers: `${namesString}`,
			'Number of Insureds': passengers?.length,
			// 'Full Name':
			// 	policy &&
			// 	`${policy?.policyHolder?.firstName} ${policy?.policyHolder?.lastName}`,
			Gender: policy?.passengers && policy?.passengers[0]?.gender,
			'Date of Birth':
				policy?.passengers &&
				moment(policy?.passengers[0]?.dob).format('DD-MM-YYYY'),
			'Pax Type': policy?.passengers && policy?.passengers[0]?.type,
			Nationality: policy?.passengers && policy?.passengers[0]?.nationality,
			'Passport No':
				policy?.passengers && policy?.passengers[0]?.passportNumber,
			// 'Origin Country': policy && policy?.from,
			...(!isMis && { 'Destination Country': policy && policy?.policy?.to }),

			'Departure Date':
				policy && moment(policy?.policy?.departureDate)?.format('DD-MM-YYYY'),
			'Return Date': policy
				? policy?.policy?.returnDate
					? moment(policy?.policy?.returnDate).format('DD-MM-YYYY')
					: 'N/A'
				: '',
			'Travel Days': policy
				? policy?.policy?.returnTrip
					? moment(policy?.policy?.returnDate).diff(
							moment(policy?.policy?.departureDate),
							'days'
					  ) + 1
					: 1
				: '',
			'Pax No': policy && policy?.passengers?.length,
			'Policy Type': policy && policy?.product?.type,
			Currency: policy && 'INR',
			...(!isMis && {
				'Gross Premium': policy && policy?.policy?.totalPremium?.INR,
				'Base Premium':
					policy && roundToThreeDecimals(policy?.policy?.premiumExclVat?.INR),
				'GST Amount': policy && roundToThreeDecimals(policy?.policy?.vat?.INR),
				'Marketing fee':
					policy &&
					roundToThreeDecimals(policy?.policy?.breakdown?.agency?.value),
				'NET Payable': roundToThreeDecimals(
					policy?.policy?.totalPremium?.INR -
						policy?.policy?.breakdown?.agency?.value
				),
			}),
			...(isMis && {
				Base:
					policy && roundToThreeDecimals(policy?.policy?.premiumExclVat?.INR),
				'Mktg Fee':
					policy &&
					roundToThreeDecimals(policy?.policy?.breakdown?.agency?.value),
				'NET RI Premium':
					policy && roundToThreeDecimals(policy?.policy?.netPremium?.INR),
				'Net RI brokerage':
					policy &&
					roundToThreeDecimals(policy?.policy?.breakdown?.RI_Broker?.value),
				'CVN Fee':
					policy && roundToThreeDecimals(policy?.policy?.breakdown?.cvn?.value),
			}),
			Status: policy && policy?.policy?.status,
			'LPO/Remarks':
				policy && policy?.policy?.remarks ? policy?.policy?.remarks : 'N/A',
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

module.exports = {
	createCmsReport,
	getCmsAgencySalesStatement,
	getCmsAgencySalesStatementWithType,
	getAllCmsAgencySalesStatement,
};
