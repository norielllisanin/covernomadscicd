const { getCollection } = require('../db');
const { ObjectId } = require('mongodb');
const { roundToThreeDecimals } = require('../utils');
const XLSX = require('xlsx');
const Policy = getCollection('policies');
const Report = getCollection('report');
const momentTz = require('moment-timezone');
const moment = require('moment');
const {
	addPassangerNoInPolicyNumber,
} = require('../helpers/generatePolicyNumber');

// const convertPolicyToReport = async (req, res) => {
// 	try {
// 		console.log('runing...');
// 		const distinctPolicies = await Report.aggregate([
// 			{ $group: { _id: '$policy._id' } }, // group by policy._id
// 			{ $project: { _id: 1 } }, // return only ids
// 		]).toArray();

// 		const distinctPolicyIds = distinctPolicies.map((p) => p._id);

// 		const findPolicies = await Policy.find({
// 			_id: { $nin: distinctPolicyIds },
// 		}).toArray();

// 		const policyIds = findPolicies.map((policy) => policy._id);
// 		console.log('policy ids...', policyIds, policyIds.length);
// 		if (!policyIds || policyIds.length === 0) {
// 			return res
// 				.status(400)
// 				.json({ message: 'No new policies found to process.' });
// 		}

// 		// Filter policies for pipeline
// 		const filter = { _id: { $in: policyIds.map((id) => new ObjectId(id)) } };

// 		const pipeline = [
// 			{ $match: filter },
// 			// Lookup priceFactor with product info
// 			{
// 				$lookup: {
// 					from: 'priceFactors',
// 					localField: 'priceFactor',
// 					foreignField: '_id',
// 					pipeline: [{ $project: { product: 1, duration: 1, _id: 1 } }],
// 					as: 'priceFactor',
// 				},
// 			},
// 			{ $addFields: { priceFactor: { $arrayElemAt: ['$priceFactor', 0] } } },
// 			// Lookup product details
// 			{
// 				$lookup: {
// 					from: 'products',
// 					localField: 'priceFactor.product',
// 					foreignField: '_id',
// 					pipeline: [
// 						{
// 							$project: {
// 								type: 1,
// 								code: 1,
// 								name: 1,
// 								_id: 1,
// 								benefits: 1,
// 								termsAndCondition: 1,
// 							},
// 						},
// 					],
// 					as: 'product',
// 				},
// 			},
// 			{ $addFields: { product: { $arrayElemAt: ['$product', 0] } } },
// 			// Lookup passengers
// 			{
// 				$lookup: {
// 					from: 'passengers',
// 					localField: '_id',
// 					foreignField: 'policy',
// 					as: 'passengers',
// 				},
// 			},

// 			{
// 				$lookup: {
// 					from: 'agencies',
// 					localField: 'agency',
// 					foreignField: '_id',
// 					pipeline: [
// 						{
// 							$project: {
// 								name: 1,
// 								code: 1,
// 								wholeseller: 1,
// 								broker: 1,
// 								_id: 1,
// 								insurer: 1,
// 							},
// 						},
// 					],
// 					as: 'agencyDetails',
// 				},
// 			},
// 			{ $unwind: { path: '$agencyDetails', preserveNullAndEmptyArrays: true } },

// 			{
// 				$lookup: {
// 					from: 'cmsAgency',
// 					localField: 'agency',
// 					foreignField: '_id',
// 					pipeline: [
// 						{
// 							$project: {
// 								name: 1,
// 								code: 1,
// 								cmsId: 1,
// 								_id: 1,
// 								insurer: 1,
// 								type: 1,
// 								state: 1,
// 								city: 1,
// 							},
// 						},
// 					],
// 					as: 'cmsAgencyDetails',
// 				},
// 			},
// 			{
// 				$unwind: {
// 					path: '$cmsAgencyDetails',
// 					preserveNullAndEmptyArrays: true,
// 				},
// 			},

// 			{
// 				$lookup: {
// 					from: 'pakAgency',
// 					localField: 'agency',
// 					foreignField: '_id',
// 					pipeline: [
// 						{
// 							$project: {
// 								name: 1,
// 								code: 1,
// 								cmsId: 1,
// 								_id: 1,
// 								insurer: 1,
// 								type: 1,
// 								state: 1,
// 								city: 1,
// 							},
// 						},
// 					],
// 					as: 'pakAgencyDetails',
// 				},
// 			},
// 			{
// 				$unwind: {
// 					path: '$pakAgencyDetails',
// 					preserveNullAndEmptyArrays: true,
// 				},
// 			},

// 			{
// 				$set: {
// 					insurerRef: {
// 						$cond: [
// 							{ $gt: [{ $type: '$cmsAgencyDetails.insurer' }, 'missing'] },
// 							'$cmsAgencyDetails.insurer',
// 							'$pakAgencyDetails.insurer',
// 							'$agencyDetail.insurer',
// 						],
// 					},
// 				},
// 			},

// 			{
// 				$lookup: {
// 					from: 'partners',
// 					localField: 'partner',
// 					foreignField: '_id',
// 					pipeline: [{ $project: { name: 1, code: 1, _id: 1 } }],
// 					as: 'partnerDetails',
// 				},
// 			},
// 			{
// 				$unwind: { path: '$partnerDetails', preserveNullAndEmptyArrays: true },
// 			},

// 			{
// 				$lookup: {
// 					from: 'users',
// 					localField: 'createdBy',
// 					foreignField: '_id',
// 					pipeline: [
// 						{ $project: { firstName: 1, lastName: 1, email: 1, _id: 1 } },
// 					],
// 					as: 'createdBy',
// 				},
// 			},
// 			{ $addFields: { createdBy: { $arrayElemAt: ['$createdBy', 0] } } },

// 			{
// 				$lookup: {
// 					from: 'addOns',
// 					localField: 'addOns',
// 					foreignField: '_id',
// 					pipeline: [{ $project: { name: 1, type: 1, _id: 1 } }],
// 					as: 'addOns',
// 				},
// 			},

// 			{
// 				$lookup: {
// 					from: 'wholesellers',
// 					localField: 'agencyDetails.wholeseller',
// 					foreignField: '_id',
// 					pipeline: [{ $project: { name: 1, code: 1, _id: 1 } }],
// 					as: 'wholesellerDetails',
// 				},
// 			},
// 			{
// 				$addFields: {
// 					wholesellerDetails: { $arrayElemAt: ['$wholesellerDetails', 0] },
// 				},
// 			},

// 			{
// 				$lookup: {
// 					from: 'brokers',
// 					localField: 'agencyDetails.broker',
// 					foreignField: '_id',
// 					pipeline: [{ $project: { name: 1, code: 1, _id: 1, iho: 1 } }],
// 					as: 'brokerDetails',
// 				},
// 			},
// 			{
// 				$lookup: {
// 					from: 'brokers',
// 					localField: 'broker',
// 					foreignField: '_id',
// 					pipeline: [{ $project: { name: 1, code: 1, _id: 1, iho: 1 } }],
// 					as: 'broker',
// 				},
// 			},
// 		];

// 		const foundReport = await Policy.aggregate(pipeline)
// 			.maxTimeMS(3600000)
// 			.toArray();

// 		if (!foundReport.length) {
// 			return res
// 				.status(404)
// 				.json({ message: 'No policies found for the given IDs.' });
// 		}

// 		// Use Promise.all to process policies in parallel
// 		const reportPromises = foundReport.map(async (policy) => {
// 			const existingReport = await Report.findOne({ 'policy._id': policy._id });

// 			if (existingReport) {
// 				console.log(`Report already exists for policy ID: ${policy._id}`);
// 				return null; // Skip this one
// 			}

// 			const {
// 				product,
// 				createdBy,
// 				brokerDetails,
// 				agencyDetails,
// 				cmsAgencyDetails,
// 				pakAgencyDetails,
// 				wholesellerDetails,
// 				broker,
// 				partnerDetails,
// 				passengers,
// 				addOns,
// 				...filteredPolicy
// 			} = policy;
// 			const reportObj = {
// 				product: policy.product
// 					? {
// 							_id: policy.product._id || '',
// 							code: policy.product.code || '',
// 							type: policy.product.type || '',
// 							name: policy.product.name || '',
// 					  }
// 					: {},

// 				passengers: policy.passengers || [],
// 				addons: policy.addOns || [],
// 				policy: { ...filteredPolicy },
// 				createdAt: policy.createdAt || new Date(),
// 			};

// 			if (policy.createdBy) {
// 				reportObj.user = {
// 					_id: policy.createdBy._id || '',
// 					firstName: policy.createdBy.firstName || '',
// 					lastName: policy.createdBy.lastName || '',
// 					email: policy.createdBy.email || '',
// 				};
// 			}
// 			if (
// 				policy?.broker &&
// 				policy?.broker.length > 0 &&
// 				policy?.broker[0]._id
// 			) {
// 				reportObj.broker = {
// 					_id: policy?.broker[0]?._id || '',
// 					name: policy?.broker[0]?.name || '',
// 					code: policy?.broker[0]?.code || '',
// 					iho: policy?.broker[0]?.iho,
// 				};
// 			}
// 			if (policy.cmsAgencyDetails) {
// 				reportObj.agency = {
// 					_id: policy.cmsAgencyDetails._id || '',
// 					name: policy.cmsAgencyDetails.name || '',
// 					code: policy.cmsAgencyDetails.code || '',
// 					insurer: policy.cmsAgencyDetails.insurer || '',
// 					type: policy.cmsAgencyDetails.type || '',
// 					city: policy.cmsAgencyDetails.city || '',
// 					state: policy.cmsAgencyDetails.state || '',
// 					cmsId: policy.cmsAgencyDetails.cmsId || '',
// 				};
// 			}

// 			if (policy.pakAgencyDetails) {
// 				reportObj.agency = {
// 					_id: policy.pakAgencyDetails._id || '',
// 					name: policy.pakAgencyDetails.name || '',
// 					code: policy.pakAgencyDetails.code || '',
// 					insurer: policy.pakAgencyDetails.insurer || '',
// 					type: policy.pakAgencyDetails.type || '',
// 					city: policy.pakAgencyDetails.city || '',
// 					state: policy.pakAgencyDetails.state || '',
// 				};
// 			}
// 			if (policy.agencyDetails) {
// 				reportObj.agency = {
// 					_id: policy.agencyDetails._id || '',
// 					name: policy.agencyDetails.name || '',
// 					code: policy.agencyDetails.code || '',
// 					insurer: policy.agencyDetails.insurer || '',
// 				};

// 				if (policy.wholesellerDetails && policy.wholesellerDetails._id) {
// 					reportObj.wholesaler = {
// 						_id: policy.wholesellerDetails._id || '',
// 						name: policy.wholesellerDetails.name || '',
// 						code: policy.wholesellerDetails.code || '',
// 					};
// 				}

// 				if (policy.brokerDetails && policy.brokerDetails._id) {
// 					reportObj.broker = {
// 						_id: policy.brokerDetails._id || '',
// 						name: policy.brokerDetails.name || '',
// 						code: policy.brokerDetails.code || '',
// 					};
// 				}
// 			} else if (policy.partnerDetails) {
// 				reportObj.partner = {
// 					_id: policy.partnerDetails._id || '',
// 					name: policy.partnerDetails.name || '',
// 					code: policy.partnerDetails.code || '',
// 				};
// 			}

// 			return reportObj;
// 		});

// 		const reportsToInsert = (await Promise.all(reportPromises)).filter(Boolean);

// 		if (reportsToInsert.length > 0) {
// 			await Report.insertMany(reportsToInsert);

// 			return res.send({ message: 'All Reports created successfully.' });
// 		} else {
// 			return res.send({ message: 'No new reports to insert.' });
// 		}
// 	} catch (error) {
// 		console.error('Error creating reports:', error);
// 		return res.status(500).json({
// 			msg: `Internal server error: ${error.message}`,
// 			error: error,
// 		});
// 	}
// };

const convertPolicyToReport = async (req, res) => {
	try {
		console.log('running...');

		// Get distinct policy IDs already in reports
		const distinctPolicies = await Report.aggregate([
			{ $group: { _id: '$policy._id' } }, // group by policy._id
			{ $project: { _id: 1 } }, // return only ids
		]).toArray();

		const distinctPolicyIds = distinctPolicies.map((p) => p._id);

		// Find policies not yet in reports
		const findPolicies = await Policy.find({
			_id: { $nin: distinctPolicyIds },
		}).toArray();

		const policyIds = findPolicies.map((policy) => policy._id);
		console.log('policy ids...', policyIds.length);

		if (!policyIds || policyIds.length === 0) {
			return res
				.status(400)
				.json({ message: 'No new policies found to process.' });
		}

		// Filter policies for pipeline
		const filter = { _id: { $in: policyIds.map((id) => new ObjectId(id)) } };

		const pipeline = [
			{ $match: filter },
			// Lookup priceFactor with product info
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

			// Agencies
			{
				$lookup: {
					from: 'agencies',
					localField: 'agency',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								name: 1,
								code: 1,
								wholeseller: 1,
								broker: 1,
								insurer: 1,
							},
						},
					],
					as: 'agencyDetails',
				},
			},
			{ $unwind: { path: '$agencyDetails', preserveNullAndEmptyArrays: true } },

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
								insurer: 1,
								type: 1,
								state: 1,
								city: 1,
							},
						},
					],
					as: 'cmsAgencyDetails',
				},
			},
			{
				$unwind: {
					path: '$cmsAgencyDetails',
					preserveNullAndEmptyArrays: true,
				},
			},

			{
				$lookup: {
					from: 'pakAgency',
					localField: 'agency',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								name: 1,
								code: 1,
								cmsId: 1,
								insurer: 1,
								type: 1,
								state: 1,
								city: 1,
							},
						},
					],
					as: 'pakAgencyDetails',
				},
			},
			{
				$unwind: {
					path: '$pakAgencyDetails',
					preserveNullAndEmptyArrays: true,
				},
			},

			// Partners
			{
				$lookup: {
					from: 'partners',
					localField: 'partner',
					foreignField: '_id',
					pipeline: [{ $project: { name: 1, code: 1 } }],
					as: 'partnerDetails',
				},
			},
			{
				$unwind: { path: '$partnerDetails', preserveNullAndEmptyArrays: true },
			},

			// CreatedBy
			{
				$lookup: {
					from: 'users',
					localField: 'createdBy',
					foreignField: '_id',
					pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
					as: 'createdBy',
				},
			},
			{ $addFields: { createdBy: { $arrayElemAt: ['$createdBy', 0] } } },

			// AddOns
			{
				$lookup: {
					from: 'addOns',
					localField: 'addOns',
					foreignField: '_id',
					pipeline: [{ $project: { name: 1, type: 1 } }],
					as: 'addOns',
				},
			},

			// Wholeseller
			{
				$lookup: {
					from: 'wholesellers',
					localField: 'agencyDetails.wholeseller',
					foreignField: '_id',
					pipeline: [{ $project: { name: 1, code: 1 } }],
					as: 'wholesellerDetails',
				},
			},
			{
				$addFields: {
					wholesellerDetails: { $arrayElemAt: ['$wholesellerDetails', 0] },
				},
			},

			// Broker
			{
				$lookup: {
					from: 'brokers',
					localField: 'agencyDetails.broker',
					foreignField: '_id',
					pipeline: [{ $project: { name: 1, code: 1, iho: 1 } }],
					as: 'brokerDetails',
				},
			},
		];

		const foundReport = await Policy.aggregate(pipeline)
			.maxTimeMS(3600000)
			.toArray();

		if (!foundReport.length) {
			return res
				.status(404)
				.json({ message: 'No policies found for the given IDs.' });
		}

		// Process reports
		const reportPromises = foundReport.map(async (policy) => {
			const existingReport = await Report.findOne({ 'policy._id': policy._id });
			if (existingReport) {
				console.log(`Report already exists for policy ID: ${policy._id}`);
				return null;
			}

			const {
				product,
				createdBy,
				brokerDetails,
				agencyDetails,
				cmsAgencyDetails,
				pakAgencyDetails,
				wholesellerDetails,
				partnerDetails,
				passengers,
				addOns,
				...filteredPolicy
			} = policy;

			const reportObj = {
				product: product
					? {
							_id: product._id || '',
							code: product.code || '',
							type: product.type || '',
							name: product.name || '',
					  }
					: {},
				passengers: passengers || [],
				addons: addOns || [],
				policy: { ...filteredPolicy },
				createdAt: policy.createdAt || new Date(),
			};

			if (createdBy) {
				reportObj.user = {
					_id: createdBy._id || '',
					firstName: createdBy.firstName || '',
					lastName: createdBy.lastName || '',
					email: createdBy.email || '',
				};
			}

			if (brokerDetails) {
				reportObj.broker = {
					_id: brokerDetails._id || '',
					name: brokerDetails.name || '',
					code: brokerDetails.code || '',
					iho: brokerDetails.iho,
				};
			}

			if (cmsAgencyDetails) {
				reportObj.agency = { ...cmsAgencyDetails };
			} else if (pakAgencyDetails) {
				reportObj.agency = { ...pakAgencyDetails };
			} else if (agencyDetails) {
				reportObj.agency = { ...agencyDetails };
				if (wholesellerDetails) {
					reportObj.wholesaler = { ...wholesellerDetails };
				}
			}

			if (partnerDetails) {
				reportObj.partner = { ...partnerDetails };
			}

			return reportObj;
		});

		const reportsToInsert = (await Promise.all(reportPromises)).filter(Boolean);

		if (reportsToInsert.length > 0) {
			await Report.insertMany(reportsToInsert);
			return res.send({ message: 'All Reports created successfully.' });
		} else {
			return res.send({ message: 'No new reports to insert.' });
		}
	} catch (error) {
		console.error('Error creating reports:', error);
		return res.status(500).json({
			msg: `Internal server error: ${error.message}`,
			error,
		});
	}
};

const createReport = async (req, res) => {
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
					from: 'agencies',
					localField: 'agency',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								name: 1,
								code: 1,
								wholeseller: 1,
								broker: 1,
								_id: 1,
								insurer: 1,
							},
						},
					],
					as: 'agencyDetails',
				},
			},
			{ $unwind: { path: '$agencyDetails', preserveNullAndEmptyArrays: true } },

			{
				$lookup: {
					from: 'partners',
					localField: 'partner',
					foreignField: '_id',
					pipeline: [{ $project: { name: 1, code: 1, _id: 1 } }],
					as: 'partnerDetails',
				},
			},
			{
				$unwind: { path: '$partnerDetails', preserveNullAndEmptyArrays: true },
			},

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

			{
				$lookup: {
					from: 'wholesellers',
					localField: 'agencyDetails.wholeseller',
					foreignField: '_id',
					pipeline: [{ $project: { name: 1, code: 1, _id: 1 } }],
					as: 'wholesellerDetails',
				},
			},
			{
				$addFields: {
					wholesellerDetails: { $arrayElemAt: ['$wholesellerDetails', 0] },
				},
			},

			{
				$lookup: {
					from: 'brokers',
					localField: 'agencyDetails.broker',
					foreignField: '_id',
					pipeline: [{ $project: { name: 1, code: 1, _id: 1, iho: 1 } }],
					as: 'brokerDetails',
				},
			},
			{
				$lookup: {
					from: 'brokers',
					localField: 'broker',
					foreignField: '_id',
					pipeline: [{ $project: { name: 1, code: 1, _id: 1, iho: 1 } }],
					as: 'broker',
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
				brokerDetails,
				agencyDetails,
				wholesellerDetails,
				partnerDetails,
				passengers,
				addOns,
				broker,
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

			if (
				policy?.broker &&
				policy?.broker.length > 0 &&
				policy?.broker[0]._id
			) {
				reportObj.broker = {
					_id: policy?.broker[0]?._id || '',
					name: policy?.broker[0]?.name || '',
					code: policy?.broker[0]?.code || '',
					iho: policy?.broker[0]?.iho,
				};
			}

			if (policy.agencyDetails) {
				reportObj.agency = {
					_id: policy.agencyDetails._id || '',
					name: policy.agencyDetails.name || '',
					code: policy.agencyDetails.code || '',
					insurer: policy.agencyDetails.insurer || '',
				};

				if (policy.wholesellerDetails && policy.wholesellerDetails._id) {
					reportObj.wholesaler = {
						_id: policy.wholesellerDetails._id || '',
						name: policy.wholesellerDetails.name || '',
						code: policy.wholesellerDetails.code || '',
					};
				}

				if (policy.brokerDetails && policy.brokerDetails._id) {
					reportObj.broker = {
						_id: policy.brokerDetails._id || '',
						name: policy.brokerDetails.name || '',
						code: policy.brokerDetails.code || '',
						iho: policy.iho,
					};
				}
			} else if (policy.partnerDetails) {
				reportObj.partner = {
					_id: policy.partnerDetails._id || '',
					name: policy.partnerDetails.name || '',
					code: policy.partnerDetails.code || '',
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
const getReports = async (req, res) => {
	try {
		const { startDate, endDate, timezone } = req.query;
		const partners = req.query.partners === 'partners' || 'true';

		const dateRange = {
			start: momentTz.tz(startDate, timezone).startOf('day').toDate(),
			end: momentTz.tz(endDate, timezone).endOf('day').toDate(),
		};

		let query;
		if (partners) {
			query = [
				{
					$match: {
						partner: { $exists: true },
						'policy.createdAt': {
							$gte: dateRange.start,
							$lte: dateRange.end,
						},
					},
				},
			];
		}

		const foundReport = await Report.aggregate(query)
			.maxTimeMS(3600000)
			.toArray();
		let policiesToWrite;
		policiesToWrite = foundReport.length == 0 ? [] : foundReport;

		let dataToWrite = policiesToWrite?.flatMap((report) => {
			//const policy = report.policy || {};
			const addOnsCodes = report?.addons?.map((addOn) => addOn.code) || [];
			const addOnsPremiums =
				report?.addons?.map((addOn) =>
					roundToThreeDecimals(
						report.policy?.totalPremium?.AED * addOn.multiplier
					)
				) || [];

			const passengers = report?.passengers;
			const basePremium = roundToThreeDecimals(
				report.policy?.totalPremium?.AED / 1.05
			);
			const vat = roundToThreeDecimals(basePremium * 0.05);

			return passengers?.map((pax, index) => {
				return {
					Channel: report.policy && 'B2B',
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
									: report.policy &&
									  `${report.policy?.createdBy?.firstName} ${report.policy?.createdBy?.lastName}`,
						  }
						: {
								'Booking Date':
									report.policy &&
									moment(report.policy?.createdAt).format('DD-MM-YYYY'),
						  }),
					...(partners
						? {
								'Booking Date':
									report.policy &&
									moment(report.policy?.createdAt).format('DD-MM-YYYY'),
						  }
						: {}),
					'Certificate No.':
						report.policy &&
						`${addPassangerNoInPolicyNumber({
							policy: report.policy?.number,
							passangerNo: index + 1,
						})} `,
					'Plan Type':
						report.policy && `Travel Insurance ${report.product?.productName}`,
					Passengers: `${pax?.firstName} ${pax?.lastName}`,
					'Number of Insureds': 1,
					Gender: report.policy && pax?.gender,
					'Date of Birth': moment(pax?.dob).format('DD-MM-YYYY'),
					'Pax Type': partners ? 'Standard' : report.policy && pax?.type,
					Nationality: report.policy && pax?.nationality,
					'Passport No': report.policy && pax?.passportNumber,
					//				'Destination Country': policy && report.policy?.to,
					'Departure Date':
						report.policy &&
						moment(report.policy?.departureDate)?.format('DD-MM-YYYY'),
					'Return Date': report.policy
						? report.policy?.returnDate
							? moment(report.policy?.returnDate).format('DD-MM-YYYY')
							: 'N/A'
						: '',
					'Travel Days': report.policy
						? report.policy?.returnTrip
							? moment(report.policy?.returnDate).diff(
									moment(report.policy?.departureDate),
									'days'
							  ) + 1
							: 1
						: '',
					'Pax No': report && report?.passengers?.length,
					...(partners
						? {
								'Rate Applied': `${report?.policy?.priceFactor?.duration?.max} days`,
						  }
						: {}),
					...(partners
						? {}
						: { 'Policy Type': report.product && product?.type }),
					...(partners ? {} : { Currency: report.policy && 'AED' }),
					'Gross Premium':
						report.policy && report.policy?.status === 'cancelled'
							? 0
							: index === 0
							? roundToThreeDecimals(report.policy?.totalPremium?.AED)
							: '',
					...(partners
						? {
								'Base Rate with Loadings':
									report.policy?.status === 'cancelled' ? 0 : basePremium,
						  }
						: { 'Base Premium': index == 0 ? basePremium : '' }),
					'VAT Amount':
						report.policy?.status === 'cancelled' ? 0 : index === 0 ? vat : '',
					...(partners
						? {
								'Gross Agreement Rates':
									report.policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(
												report.policy?.unloaded?.totalPremium?.AED
										  ),
						  }
						: {}),
					...(partners
						? {
								'Base Agreement Rates':
									report.policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(
												roundToThreeDecimals(
													report.policy?.unloaded?.totalPremium?.AED
												) / 1.05
										  ),
						  }
						: {}),
					...(partners
						? {
								'Marketing Fee on Agreement Rates':
									report.policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(
												roundToThreeDecimals(
													roundToThreeDecimals(
														report.policy?.unloaded?.totalPremium?.AED
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
											: report.policy &&
											  roundToThreeDecimals(0.75 * basePremium)
										: '',
						  }),

					...(partners
						? {
								'Extra Margin After VAT':
									report.policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(
												roundToThreeDecimals(report.policy?.totalPremium?.AED) -
													(vat +
														roundToThreeDecimals(
															roundToThreeDecimals(
																report.policy?.unloaded?.totalPremium?.AED
															)
														))
										  ),
						  }
						: {}),
					...(partners
						? {
								'Total Marketing Fee after VAT':
									report.policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(
												roundToThreeDecimals(
													roundToThreeDecimals(
														report.policy?.totalPremium?.AED
													) -
														(roundToThreeDecimals(
															roundToThreeDecimals(report.policy?.vat.AED)
														) +
															roundToThreeDecimals(
																roundToThreeDecimals(
																	report.policy?.unloaded?.totalPremium?.AED
																)
															))
												) +
													roundToThreeDecimals(
														roundToThreeDecimals(
															report.policy &&
																roundToThreeDecimals(
																	report.policy?.unloaded?.totalPremium?.AED
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
									report.policy?.status === 'cancelled'
										? 0
										: roundToThreeDecimals(
												roundToThreeDecimals(
													report.policy?.totalPremium?.AED,
													3
												) -
													roundToThreeDecimals(
														roundToThreeDecimals(
															roundToThreeDecimals(
																roundToThreeDecimals(
																	report.policy?.totalPremium?.AED
																) -
																	(vat +
																		roundToThreeDecimals(
																			report.policy?.unloaded?.totalPremium?.AED
																		))
															) +
																roundToThreeDecimals(
																	roundToThreeDecimals(
																		roundToThreeDecimals(
																			report.policy?.unloaded?.totalPremium?.AED
																		) / 1.05
																	) * 0.7
																)
														)
													)
										  ),
						  }
						: {
								'Net Payable with VAT':
									report.policy && index === 0
										? roundToThreeDecimals(
												report.policy?.totalPremium?.AED -
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
						? { Status: report.policy && report.policy?.status }
						: { Status: report.policy && report.policy?.status }),
					...(partners
						? {}
						: {
								'LPO/Remarks':
									report.policy && report.policy?.remarks
										? report.policy.remarks
										: 'N/A',
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

		//return res.send({ message: 'found Report successfully', dataToWrite });
	} catch (error) {
		console.error('Error generating report:', error);
		return res.status(500).json({
			msg: `Internal server error: ${error.message}`,
			error: error,
		});
	}
};

const getMisReports = async (req, res) => {
	try {
		const { startDate, endDate, timezone, insurer, country } = req.query;

		const dateRange = {
			start: momentTz.tz(startDate, timezone).startOf('day').toDate(),
			end: momentTz.tz(endDate, timezone).endOf('day').toDate(),
		};

		let query;
		if (insurer) {
			query = [
				{
					$match: {
						...(country === 'UAE' ? { partner: { $exists: false } } : {}),
						'policy.createdAt': { $gte: dateRange.start, $lte: dateRange.end },
						'agency.insurer': new ObjectId(insurer),
					},
				},
			];
		}

		const foundReport = await Report.aggregate(query)
			.maxTimeMS(3600000)
			.toArray();
		let policiesToWrite;
		policiesToWrite = foundReport.length == 0 ? [] : foundReport;

		let dataToWrite = policiesToWrite?.flatMap((report) => {
			const passengers = report?.passengers;

			// Check if report is after August 1st 2023
			const isAfterAugust =
				new Date(report.policy.createdAt) >= new Date('2025-08-01');

			const totalPremium = roundToThreeDecimals(
				report.policy?.totalPremium?.AED,
				3
			);
			let basePremium;
			let vat;
			let marketingFee;
			let netPremium;
			// Only process reports after August 1st
			if (!isAfterAugust) {
				basePremium = roundToThreeDecimals(
					totalPremium - totalPremium * (5 / 100),
					3
				);
				vat = roundToThreeDecimals(totalPremium * (5 / 100), 3);
				const ws = roundToThreeDecimals(totalPremium * (60 / 100), 3);
				const cvn = roundToThreeDecimals(totalPremium * (12.5 / 100), 3);
				const iho = roundToThreeDecimals(totalPremium * (5 / 100), 3);
				marketingFee = roundToThreeDecimals(ws + cvn + iho, 3);
				netPremium = roundToThreeDecimals(basePremium - marketingFee, 3);
			} else {
				basePremium = roundToThreeDecimals(totalPremium / 1.05, 3);
				vat = roundToThreeDecimals(basePremium * (5 / 100), 3);
				const ws = roundToThreeDecimals(basePremium * (60 / 100), 3);
				const cvn = roundToThreeDecimals(basePremium * (12.5 / 100), 3);
				const ort = roundToThreeDecimals(basePremium * (5 / 100), 3);

				marketingFee = roundToThreeDecimals(ws + cvn + ort, 3);
				netPremium = roundToThreeDecimals(basePremium - marketingFee, 3);
			}

			// Additional Logic
			const paxCount = passengers?.length || 1;
			const grossPerPax =
				report.policy?.status === 'cancelled'
					? 0
					: roundToThreeDecimals(totalPremium / paxCount);

			const basePerPax =
				report.policy?.status === 'cancelled'
					? 0
					: roundToThreeDecimals(basePremium / paxCount);

			const vatPerPax =
				report.policy?.status === 'cancelled'
					? 0
					: roundToThreeDecimals(vat / paxCount);

			const netPerPax =
				report.policy?.status === 'cancelled'
					? 0
					: roundToThreeDecimals(netPremium / paxCount);

			const marketingFeePerPax =
				report.policy?.status === 'cancelled'
					? 0
					: roundToThreeDecimals(marketingFee / paxCount);

			const isFamily =
				report.policy?.family !== undefined && report.policy?.family !== true;
			const familyCode = report.product?.code !== 'ELTFAM';
			let passengerCount = 0;
			const isCancelled = report.policy?.status === 'cancelled';

			if (country == 'UAE') {
				return passengers?.map((pax, index) => {
					passengerCount++;
					return {
						Channel: report.policy && 'B2B',
						'Agency Name': 'Rovers Travel Solutions',
						'Booking Date':
							report.policy &&
							moment(report.policy?.createdAt).format('DD-MM-YYYY'),

						'Certificate No.':
							report.policy && `${report.policy?.number}-${passengerCount}`,

						'Plan Type':
							report.policy &&
							`Travel Insurance ${
								report.product?.name || report.policy?.productName
							}`,
						Passengers: `${pax?.firstName} ${pax?.lastName}`,
						'Number of Insureds': 1,
						Gender: report.policy && pax?.gender,
						'Date of Birth': moment(pax?.dob).format('DD-MM-YYYY'),
						'Pax Type': report.policy && pax?.type,
						Nationality: report.policy && pax?.nationality,
						'Passport No': report.policy && pax?.passportNumber,

						'Destination Country': report && report.policy?.to,

						'Departure Date':
							report.policy &&
							moment(report.policy?.departureDate)?.format('DD-MM-YYYY'),
						'Return Date': report.policy
							? report.policy?.returnDate
								? moment(report.policy?.returnDate).format('DD-MM-YYYY')
								: 'N/A'
							: '',
						'Travel Days': report.policy
							? report.policy?.returnTrip
								? moment(report.policy?.returnDate).diff(
										moment(report.policy?.departureDate),
										'days'
								  ) + 1
								: 1
							: '',
						'Pax No': report && passengerCount,
						// 'Pax No': report && report?.passengers?.length,

						'Policy Type':
							report.product && report?.product
								? report?.product?.type
								: 'INBOUND',
						Currency: report.policy && 'AED',
						'Gross Premium':
							isFamily || familyCode
								? grossPerPax
								: report.policy && report.policy?.status === 'cancelled'
								? 0
								: index === 0
								? totalPremium
								: '',
						'Base Premium':
							isFamily || familyCode
								? basePerPax
								: index == 0
								? basePremium
								: '',
						'VAT Amount':
							isFamily || familyCode
								? vatPerPax
								: report.policy?.status === 'cancelled'
								? 0
								: index === 0
								? vat
								: '',
						'Marketing fee':
							isFamily || familyCode
								? marketingFeePerPax
								: report.policy?.status === 'cancelled'
								? 0
								: index === 0
								? marketingFee
								: '',
						'NET Premium':
							isFamily || familyCode
								? netPerPax
								: report.policy?.status === 'cancelled'
								? 0
								: index === 0
								? netPremium
								: '',

						Status:
							isFamily || familyCode
								? report.policy?.status
								: report.policy && report.policy && index === 0
								? report.policy?.status
								: '',
					};
				});
			} else if (country == 'Pakistan') {
				// Calculate divided premiums (non-family)
				const grossPerPax = isCancelled
					? 0
					: roundToThreeDecimals(report?.policy?.totalPremium?.PKR / paxCount);

				const sdPerPax = isCancelled
					? 0
					: roundToThreeDecimals(
							report?.policy?.breakdown?.SD?.value / paxCount
					  );

				const fifPerPax = isCancelled
					? 0
					: roundToThreeDecimals(
							report?.policy?.breakdown?.FIF?.value / paxCount
					  );

				const fedPerPax = isCancelled
					? 0
					: roundToThreeDecimals(report?.policy?.vat?.PKR / paxCount);

				const netPerPax = isCancelled
					? 0
					: roundToThreeDecimals(report?.policy?.netPremium?.PKR / paxCount);

				const contributionPerPax = isCancelled
					? 0
					: roundToThreeDecimals(
							report?.policy?.breakdown?.contribution?.value / paxCount
					  );

				const payablePerPax = isCancelled
					? 0
					: roundToThreeDecimals(
							report?.policy?.breakdown?.pak?.value / paxCount
					  );
				return passengers?.map((pax, index) => {
					passengerCount++;
					return {
						Channel: 'B2B',
						'Agency Name': report && report?.agency?.name,
						'Booked By':
							report && `${report?.user?.firstName} ${report?.user?.lastName}`,
						'Booking Date':
							report && moment(report?.createdAt).format('DD-MM-YYYY'),
						'Certificate No.':
							report && `${report?.policy?.number}-${passengerCount}`,
						'Plan Type': report && `PQTL ${report?.policy?.productName}`,
						passengers: `${pax?.firstName} ${pax?.lastName}`,
						'Number of Insureds': index + 1,
						Gender: pax?.gender,
						'Date of Birth':
							report?.passengers &&
							moment(report?.passengers[0]?.dob).format('DD-MM-YYYY'),
						'Pax Type': report?.passengers && pax?.type,
						Nationality: report?.passengers && pax?.nationality,
						'Passport No': report?.passengers && pax?.passportNumber,
						// ...(!isMis && {
						// 	'Destination Country': report && report?.policy?.to,
						// }),

						'Departure Date':
							report &&
							moment(report?.policy?.departureDate)?.format('DD-MM-YYYY'),
						'Return Date': report
							? report?.policy?.returnDate
								? moment(report?.policy?.returnDate).format('DD-MM-YYYY')
								: 'N/A'
							: '',
						'Travel Days': report
							? report?.policy?.returnTrip
								? moment(report?.policy?.returnDate).diff(
										moment(report?.policy?.departureDate),
										'days'
								  ) + 1
								: 1
							: '',
						'Pax No': passengerCount,
						'Policy Type': report && report?.product?.type,
						Currency: report && 'PKR',

						// ✅ Premiums (Family vs Non-Family)
						'Gross Premium': isCancelled
							? 0
							: !isFamily
							? index === 0
								? report?.policy?.totalPremium?.PKR
								: ''
							: grossPerPax,

						SD: isCancelled
							? 0
							: !isFamily
							? index === 0
								? report?.policy?.breakdown?.SD?.value
								: ''
							: sdPerPax,

						'FIF(1%)': isCancelled
							? 0
							: !isFamily
							? index === 0
								? report?.policy?.breakdown?.FIF?.value
								: ''
							: fifPerPax,

						'FED(15% or 16%)': isCancelled
							? 0
							: !isFamily
							? index === 0
								? report?.policy?.vat?.PKR
								: ''
							: fedPerPax,

						'NET Premium': isCancelled
							? 0
							: !isFamily
							? index === 0
								? report?.policy?.netPremium?.PKR
								: ''
							: netPerPax,

						Contribution: isCancelled
							? 0
							: !isFamily
							? index === 0
								? report?.policy?.breakdown?.contribution?.value
								: ''
							: contributionPerPax,

						Payable: isCancelled
							? 0
							: !isFamily
							? index === 0
								? report?.policy?.breakdown?.pak?.value
								: ''
							: payablePerPax,

						// ✅ Status
						Status: !isFamily
							? index === 0
								? isCancelled
									? 'cancelled '
									: 'confirmed '
								: ''
							: isCancelled
							? 'cancelled '
							: 'confirmed ',

						// 'Gross Premium':
						// 	report &&
						// 	roundToThreeDecimals(
						// 		report?.policy?.totalPremium?.PKR / paxCount
						// 	),
						// SD:
						// 	report &&
						// 	roundToThreeDecimals(
						// 		report?.policy?.breakdown?.SD?.value / paxCount
						// 	),
						// 'FIF(1%)':
						// 	report &&
						// 	roundToThreeDecimals(
						// 		report?.policy?.breakdown?.FIF?.value / paxCount
						// 	),
						// 'FED(15% or 16%)':
						// 	report &&
						// 	roundToThreeDecimals(report?.policy?.vat?.PKR / paxCount),
						// 'NET Premium':
						// 	report &&
						// 	roundToThreeDecimals(report?.policy?.netPremium?.PKR / paxCount),
						// Contribution:
						// 	report &&
						// 	roundToThreeDecimals(
						// 		report?.policy?.breakdown?.contribution?.value / paxCount
						// 	),
						// Payable:
						// 	report &&
						// 	roundToThreeDecimals(
						// 		report?.policy?.breakdown?.pak?.value / paxCount
						// 	),
						// Status: report && report?.policy?.status,
						// Status: report && report?.policy?.status,
						'LPO/Remarks':
							report && report?.policy?.remarks
								? report?.policy?.remarks
								: 'N/A',
					};
				});
			} else if (country == 'India') {
				const distType =
					report?.agency?.type === 'call_center' ||
					report?.agency?.type === 'branch'
						? 'direct'
						: 'indirect';

				// divide values per passenger if not cancelled
				const basePerPax = isCancelled
					? 0
					: roundToThreeDecimals(
							report?.policy?.premiumExclVat?.INR / paxCount
					  );
				const mktgPerPax = isCancelled
					? 0
					: roundToThreeDecimals(
							report?.policy?.breakdown?.agency?.value / paxCount
					  );
				const netPerPax = isCancelled
					? 0
					: roundToThreeDecimals(report?.policy?.netPremium?.INR / paxCount);
				const riBrokerPerPax = isCancelled
					? 0
					: roundToThreeDecimals(
							report?.policy?.breakdown?.RI_Broker?.value / paxCount
					  );
				const cvnPerPax = isCancelled
					? 0
					: roundToThreeDecimals(
							report?.policy?.breakdown?.cvn?.value / paxCount
					  );

				const namesString = passengers
					?.map((pax) => `${pax?.firstName} ${pax?.lastName}`) // Extract and format the names
					.join(', '); // Join them with commas
				return passengers?.map((pax, index) => {
					passengerCount++;
					return {
						...(report && { Reinsurer: 'CMS' }),
						...(report && { Contract: 'CMS' }),
						'Distributive Type': report && distType,
						Channel: report && report?.agency?.type,
						'Agency Name': report && report?.agency?.name,
						'Booked By':
							report && `${report?.user?.firstName} ${report?.user?.lastName}`,
						'Booking Date':
							report && moment(report?.createdAt).format('DD-MM-YYYY'),
						'Certificate No.':
							report && `${report?.policy?.number}-${passengerCount}`,
						'Plan Type':
							report && `Travel Insurance ${report?.policy?.productName}`,
						passengers: `${namesString}`,
						'Number of Insureds': passengers?.length,
						Gender: report?.passengers && report?.passengers[0]?.gender,
						'Date of Birth':
							report?.passengers &&
							moment(report?.passengers[0]?.dob).format('DD-MM-YYYY'),
						'Pax Type': report?.passengers && report?.passengers[0]?.type,
						Nationality:
							report?.passengers && report?.passengers[0]?.nationality,
						'Passport No':
							report?.passengers && report?.passengers[0]?.passportNumber,

						'Departure Date':
							report &&
							moment(report?.policy?.departureDate)?.format('DD-MM-YYYY'),
						'Return Date': report
							? report?.policy?.returnDate
								? moment(report?.policy?.returnDate).format('DD-MM-YYYY')
								: 'N/A'
							: '',
						'Travel Days': report
							? report?.policy?.returnTrip
								? moment(report?.policy?.returnDate).diff(
										moment(report?.policy?.departureDate),
										'days'
								  ) + 1
								: 1
							: '',
						'Pax No': report && passengerCount,
						'Policy Type': report && report?.product?.type,
						Currency: report && 'INR',

						// ✅ if family → totals, else → per pax
						Base: !isFamily
							? index === 0
								? roundToThreeDecimals(report?.policy?.premiumExclVat?.INR)
								: ''
							: basePerPax,
						'Mktg Fee': !isFamily
							? index === 0
								? roundToThreeDecimals(report?.policy?.breakdown?.agency?.value)
								: ''
							: mktgPerPax,
						'NET RI Premium': !isFamily
							? index === 0
								? roundToThreeDecimals(report?.policy?.netPremium?.INR)
								: ''
							: netPerPax,
						'Net RI brokerage': !isFamily
							? index === 0
								? roundToThreeDecimals(
										report?.policy?.breakdown?.RI_Broker?.value
								  )
								: ''
							: riBrokerPerPax,
						'CVN Fee': !isFamily
							? index === 0
								? roundToThreeDecimals(report?.policy?.breakdown?.cvn?.value)
								: ''
							: cvnPerPax,

						// Base:
						// 	report &&
						// 	roundToThreeDecimals(report?.policy?.premiumExclVat?.INR),
						// 'Mktg Fee':
						// 	report &&
						// 	roundToThreeDecimals(report?.policy?.breakdown?.agency?.value),
						// 'NET RI Premium':
						// 	report && roundToThreeDecimals(report?.policy?.netPremium?.INR),
						// 'Net RI brokerage':
						// 	report &&
						// 	roundToThreeDecimals(report?.policy?.breakdown?.RI_Broker?.value),
						// 'CVN Fee':
						// 	report &&
						// 	roundToThreeDecimals(report?.policy?.breakdown?.cvn?.value),

						Status: !isFamily
							? index === 0
								? isCancelled
									? 'cancelled '
									: 'confirmed '
								: ''
							: isCancelled
							? 'cancelled '
							: 'confirmed ',
						'LPO/Remarks':
							report && report?.policy?.remarks
								? report?.policy?.remarks
								: 'N/A',
					};
				});
			} else {
				return null;
			}
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

		// return res.send(buffer);
		return res.status(200).send(buffer);

		//return res.send({ message: 'found Report successfully', dataToWrite });
	} catch (error) {
		console.error('Error generating report:', error);
		return res.status(500).json({
			msg: `Internal server error: ${error.message}`,
			error: error,
		});
	}
};
module.exports = {
	getReports,
	getMisReports,
	createReport,
	convertPolicyToReport,
};
