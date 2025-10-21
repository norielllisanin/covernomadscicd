const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const { formatIds } = require('../utils');

const Policy = getCollection('policies');
const Agency = getCollection('agencies');
const User = getCollection('users');
const Wholeseller = getCollection('wholesellers');
const creditHistories = getCollection('creditHistories');
const payments = getCollection('payments');

// @desc    Fixes the premium in DB
// @route   POST /api/scripts/fix-premium
// @access  CVN
const fixPremium = async (req, res) => {
	const policies = await Policy.find({ status: 'confirmed' }).toArray();
	// await Policy.updateMany(
	// 	{ status: 'cancelled' }, // Filter to select policies with status 'cancelled'
	// 	{ $set: { 'totalPremium.AED': 0 } } // Set totalPremium.AED to 0
	// );

	// var count = 0;
	policies.forEach(async (policy) => {
		const vat = 0.05 * policy.totalPremium.AED;
		let premiumExclVat = policy.totalPremium.AED - vat;
		if (policy.agency) {
			await Policy.updateOne(
				{ _id: new ObjectId(policy._id) },
				{
					$set: {
						'premiumExclVat.AED': premiumExclVat,
						'vat.AED': vat,
					},
				}
			);
		}
		// let cvnPercentage = 0,
		// 	wholesellerPercentage = 0,
		// 	agencyPercentage = 0,
		// 	staffPercentage = 0,
		// 	pspPercentage = 5;

		// let cvnShare = 0,
		// 	wholesellerShare = 0,
		// 	agencyShare = 0,
		// 	staffShare = 0,
		// 	pspShare = 0;

		// if (policy.agency) {
		// 	const foundAgency = await Agency.findOne({
		// 		_id: new ObjectId(policy.agency),
		// 	});
		// 	const foundWholeseller = await Wholeseller.findOne({
		// 		_id: new ObjectId(foundAgency.wholeseller),
		// 	});
		// 	const foundUser = await User.findOne({
		// 		_id: new ObjectId(policy?.createdBy),
		// 	});

		// 	//set staff incentive
		// 	if (foundUser.incentivePercentage)
		// 		staffPercentage = foundUser.incentivePercentage;

		// 	agencyPercentage = foundAgency.commissionPercentage;

		// 	if (foundWholeseller.fixedCommission)
		// 		wholesellerPercentage = foundWholeseller.fixedCommission;
		// 	else {
		// 		wholesellerPercentage = 60 - agencyPercentage;
		// 	}
		// 	cvnPercentage =
		// 		75 -
		// 		wholesellerPercentage -
		// 		agencyPercentage -
		// 		staffPercentage -
		// 		pspPercentage;

		// 	cvnShare = premiumExclVat * (cvnPercentage / 100);
		// 	wholesellerShare = premiumExclVat * (wholesellerPercentage / 100);
		// 	agencyShare = premiumExclVat * (agencyPercentage / 100);
		// 	staffShare = premiumExclVat * (staffPercentage / 100);
		// 	pspShare = premiumExclVat * (pspPercentage / 100);
		// 	let netPremium =
		// 		premiumExclVat -
		// 		(cvnShare + wholesellerShare + agencyShare + staffShare + pspShare);
		// 	let difference =
		// 		policy.totalPremium.AED -
		// 		(cvnShare +
		// 			wholesellerShare +
		// 			agencyShare +
		// 			staffShare +
		// 			pspShare +
		// 			netPremium +
		// 			vat);
		// 	if (difference === 0) {
		// 		await Policy.updateOne(
		// 			{ _id: new ObjectId(policy._id) },
		// 			{
		// 				$set: {
		// 					'premiumExclVat.AED': premiumExclVat,
		// 					'vat.AED': vat,
		// 					'netPremium.AED': netPremium,
		// 					'breakdown.cvn.percentage': cvnPercentage,
		// 					'breakdown.cvn.value': cvnShare,
		// 					'breakdown.wholeseller.percentage': wholesellerPercentage,
		// 					'breakdown.wholeseller.value': wholesellerShare,
		// 					'breakdown.agency.percentage': agencyPercentage,
		// 					'breakdown.agency.value': agencyShare,
		// 					'breakdown.staff.percentage': staffPercentage,
		// 					'breakdown.staff.value': staffShare,
		// 					'breakdown.psp.percentage': pspPercentage,
		// 					'breakdown.psp.value': pspShare,
		// 				},
		// 			}
		// 		);
		// 	}
		// }
	});

	return res.status(200).json({
		policies,
	});
};

const transferCreditHistoryToPayment = async (req, res) => {
	const duplicates = await Policy.aggregate([
		{
			$group: {
				_id: {
					partner: '$partner',
					returnTrip: '$returnTrip',
					from: '$from',
					to: '$to',
					departureDate: '$departureDate',
					priceFactor: '$priceFactor',
					productName: '$productName',
					totalPremium: '$totalPremium',
					netPremium: '$netPremium',
					vat: '$vat',
					premiumExclVat: '$premiumExclVat',
					breakdown: '$breakdown',
					status: '$status',
					// createdAt: '$createdAt',
					expiresAt: '$expiresAt',
				},
				count: { $sum: 1 },
				// documents: { $push: '$$ROOT' },
			},
		},
		{
			$match: {
				count: { $gt: 1 }, // Keep only groups with more than 1 document
			},
		},
	]).toArray();
	// const history = await creditHistories.find({}).toArray();
	// const paymentDocuments = history.map((history) => {
	// 	const obj = {
	// 		_id: new ObjectId(), // Generate a new ObjectId for the payment record
	// 		agency: new ObjectId(history.agency),
	// 		// wholeseller: null, // Set this field if needed
	// 		type: 'BALANCE',
	// 		channel: 'MANUAL',
	// 		amount: history.topUpValue,
	// 		remarks: history.remarks || null,
	// 		createdAt: new Date(history.createdAt),
	// 		metadata: {
	// 			prevBalance: history.oldValue,
	// 			newBalance: history.newValue,
	// 			createdBy: new ObjectId(history.createdBy),
	// 		},
	// 	};
	// 	return obj;
	// });

	// // Insert the new documents into the payment collection
	// const result = await payments.insertMany(paymentDocuments);

	res.status(200).json({ count: duplicates.length, duplicates });
};

module.exports = {
	fixPremium,
	transferCreditHistoryToPayment,
};

// 6720efba8e28f86e70408815
