const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');

const Agency = getCollection('agencies');
const Wholeseller = getCollection('wholesellers');
const User = getCollection('users');

const premiumBreakdown = async ({ premium, agencyId, userId }) => {
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

	// const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	// const foundWholeseller = await Wholeseller.findOne({
	// 	_id: new ObjectId(foundAgency.wholeseller),
	// });
	// const foundUser = await User.findOne({
	// 	_id: new ObjectId(userId),
	// });

	// //set staff incentive
	// if (foundUser.incentivePercentage)
	// 	staffPercentage = foundUser.incentivePercentage;

	// agencyPercentage = foundAgency.commissionPercentage;

	// if (foundWholeseller.fixedCommission)
	// 	wholesellerPercentage = foundWholeseller.fixedCommission - agencyPercentage;
	// else {
	// 	wholesellerPercentage = 60 - agencyPercentage;
	// }
	// cvnPercentage =
	// 	75 -
	// 	wholesellerPercentage -
	// 	agencyPercentage -
	// 	staffPercentage -
	// 	pspPercentage;

	// cvnShare = premium * (cvnPercentage / 100);
	// wholesellerShare = premium * (wholesellerPercentage / 100);
	// agencyShare = premium * (agencyPercentage / 100);
	// staffShare = premium * (staffPercentage / 100);
	// pspShare = premium * (pspPercentage / 100);

	// return {
	// 	cvn: {
	// 		percentage: cvnPercentage,
	// 		value: cvnShare,
	// 	},
	// 	wholeseller: {
	// 		percentage: wholesellerPercentage,
	// 		value: wholesellerShare,
	// 	},
	// 	agency: {
	// 		percentage: agencyPercentage,
	// 		value: agencyShare,
	// 	},
	// 	staff: {
	// 		percentage: staffPercentage,
	// 		value: staffShare,
	// 	},
	// 	psp: {
	// 		percentage: pspPercentage,
	// 		value: pspShare,
	// 	},
	// 	netPremium:
	// 		premium -
	// 		(cvnShare + wholesellerShare + agencyShare + staffShare + pspShare),
	// };

	let cvnPercentage = 12.5,
		wholesellerPercentage = 0,
		agencyPercentage = 0,
		staffPercentage = 0,
		ort = 5,
		cope = 22.5;

	let cvnShare = 0,
		wholesellerShare = 0,
		agencyShare = 0,
		staffShare = 0,
		ortShare = 0,
		copeShare = 0;

	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	const foundWholeseller = await Wholeseller.findOne({
		_id: new ObjectId(foundAgency.wholeseller),
	});
	const foundUser = await User.findOne({
		_id: new ObjectId(userId),
	});

	//set staff incentive
	if (foundUser.incentivePercentage)
		staffPercentage = foundUser.incentivePercentage;

	agencyPercentage = foundAgency.commissionPercentage;

	if (foundWholeseller.fixedCommission)
		wholesellerPercentage = foundWholeseller.fixedCommission - agencyPercentage;
	else {
		wholesellerPercentage = 60 - agencyPercentage;
	}
	// cvnPercentage =
	// 	75 -
	// 	wholesellerPercentage -
	// 	agencyPercentage -
	// 	staffPercentage -
	// 	ort -
	// 	cope;

	cvnShare = premium * (cvnPercentage / 100);
	wholesellerShare = premium * (wholesellerPercentage / 100);
	agencyShare = premium * (agencyPercentage / 100);
	staffShare = premium * (staffPercentage / 100);
	ortShare = premium * (ort / 100);
	copeShare = premium * (cope / 100);

	return {
		cvn: {
			percentage: cvnPercentage,
			value: cvnShare,
		},
		wholeseller: {
			percentage: wholesellerPercentage,
			value: wholesellerShare,
		},
		agency: {
			percentage: agencyPercentage,
			value: agencyShare,
		},
		staff: {
			percentage: staffPercentage,
			value: staffShare,
		},
		ort: {
			percentage: ort,
			value: ortShare,
		},
		cope: {
			percentage: cope,
			value: copeShare,
		},
		netPremium:
			premium -
			(cvnShare + wholesellerShare + agencyShare + staffShare + ortShare),
	};
};

module.exports = premiumBreakdown;
